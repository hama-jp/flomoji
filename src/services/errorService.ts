import { useErrorStore, ErrorSeverity, ErrorCategory, ErrorDetails, ErrorRecoveryStrategy } from '../store/errorStore';

class ErrorService {
  private static instance: ErrorService;
  private retryHandlers = new Map<string, NodeJS.Timeout>();

  private constructor() {}

  static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  private generateErrorId(): string {
    return `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private categorizeError(error: Error | unknown): ErrorCategory {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('fetch') || message.includes('network') || message.includes('API')) {
      return 'network';
    }
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 'validation';
    }
    if (message.includes('execution') || message.includes('runtime')) {
      return 'execution';
    }
    if (message.includes('system') || message.includes('memory') || message.includes('crash')) {
      return 'system';
    }
    if (message.includes('user') || message.includes('input')) {
      return 'user';
    }

    return 'unknown';
  }

  private getSeverity(error: Error | unknown, category: ErrorCategory): ErrorSeverity {
    if (category === 'system') return 'critical';
    if (category === 'network') return 'error';
    if (category === 'validation' || category === 'user') return 'warning';

    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('critical') || message.includes('fatal')) return 'critical';
    if (message.includes('error') || message.includes('fail')) return 'error';
    if (message.includes('warn')) return 'warning';

    return 'error';
  }

  private getUserFriendlyMessage(error: Error | unknown, category: ErrorCategory): string {
    const baseMessage = error instanceof Error ? error.message : String(error);

    const friendlyMessages: Record<ErrorCategory, (msg: string) => string> = {
      network: (msg) => {
        if (msg.includes('fetch')) return 'ネットワーク接続に問題があります。インターネット接続を確認してください。';
        if (msg.includes('timeout')) return 'リクエストがタイムアウトしました。しばらく待ってから再試行してください。';
        if (msg.includes('404')) return '要求されたリソースが見つかりません。';
        if (msg.includes('500')) return 'サーバーエラーが発生しました。しばらく待ってから再試行してください。';
        return 'ネットワークエラーが発生しました。';
      },
      validation: (msg) => {
        if (msg.includes('required')) return '必須項目が入力されていません。';
        if (msg.includes('invalid')) return '入力された値が無効です。正しい形式で入力してください。';
        if (msg.includes('format')) return 'データ形式が正しくありません。';
        return '入力値にエラーがあります。';
      },
      execution: (msg) => {
        if (msg.includes('timeout')) return '処理がタイムアウトしました。';
        if (msg.includes('memory')) return 'メモリ不足により処理が失敗しました。';
        return 'ワークフローの実行中にエラーが発生しました。';
      },
      system: () => 'システムエラーが発生しました。アプリケーションを再起動してください。',
      user: () => '操作にエラーがありました。入力内容を確認してください。',
      unknown: () => '予期しないエラーが発生しました。'
    };

    return friendlyMessages[category](baseMessage);
  }

  logError(
    error: Error | unknown,
    context?: Record<string, any>,
    options?: {
      severity?: ErrorSeverity;
      category?: ErrorCategory;
      userMessage?: string;
      recoverable?: boolean;
      retryable?: boolean;
      maxRetries?: number;
    }
  ): ErrorDetails {
    const category = options?.category || this.categorizeError(error);
    const severity = options?.severity || this.getSeverity(error, category);

    const errorDetails: ErrorDetails = {
      id: this.generateErrorId(),
      message: error instanceof Error ? error.message : String(error),
      severity,
      category,
      timestamp: Date.now(),
      context,
      stack: error instanceof Error ? error.stack : undefined,
      userMessage: options?.userMessage || this.getUserFriendlyMessage(error, category),
      recoverable: options?.recoverable ?? (severity !== 'critical'),
      retryable: options?.retryable ?? (category === 'network'),
      retryCount: 0,
      maxRetries: options?.maxRetries ?? 3
    };

    // Store error
    useErrorStore.getState().addError(errorDetails);

    // Log to console in development
    if (import.meta.env.DEV) {
      const logMethod = severity === 'critical' || severity === 'error' ? 'error' :
                       severity === 'warning' ? 'warn' : 'log';
      console[logMethod](`[${severity.toUpperCase()}] ${category}:`, {
        message: errorDetails.message,
        userMessage: errorDetails.userMessage,
        context,
        stack: errorDetails.stack
      });
    }

    return errorDetails;
  }

  async retry<T>(
    fn: () => Promise<T>,
    options?: {
      maxRetries?: number;
      delay?: number;
      backoff?: boolean;
      onRetry?: (attempt: number, error: Error) => void;
    }
  ): Promise<T> {
    const maxRetries = options?.maxRetries ?? 3;
    const delay = options?.delay ?? 1000;
    const backoff = options?.backoff ?? true;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt === maxRetries) {
          throw lastError;
        }

        options?.onRetry?.(attempt, lastError);

        const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    throw lastError!;
  }

  createRecoveryStrategy(
    error: ErrorDetails
  ): ErrorRecoveryStrategy | null {
    if (!error.recoverable) return null;

    switch (error.category) {
      case 'network':
        if (error.retryable && error.retryCount! < error.maxRetries!) {
          return {
            type: 'retry',
            action: async () => {
              // Retry logic will be implemented by the calling component
              console.log('Retrying network operation...');
            }
          };
        }
        break;

      case 'validation':
        return {
          type: 'reset',
          action: async () => {
            // Reset form or input state
            console.log('Resetting validation state...');
          }
        };

      case 'execution':
        return {
          type: 'fallback',
          action: async () => {
            // Use fallback logic
            console.log('Using fallback execution path...');
          }
        };

      default:
        return {
          type: 'ignore',
          action: async () => {
            console.log('Ignoring error and continuing...');
          }
        };
    }

    return null;
  }

  clearError(id: string): void {
    useErrorStore.getState().clearError(id);

    // Clear any retry timers
    const timer = this.retryHandlers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.retryHandlers.delete(id);
    }
  }

  clearAllErrors(): void {
    useErrorStore.getState().clearErrors();

    // Clear all retry timers
    this.retryHandlers.forEach(timer => clearTimeout(timer));
    this.retryHandlers.clear();
  }

  getRecentErrors(count?: number): ErrorDetails[] {
    return useErrorStore.getState().getRecentErrors(count);
  }

  getErrorsByCategory(category: ErrorCategory): ErrorDetails[] {
    return useErrorStore.getState().getErrorsByCategory(category);
  }

  getErrorsBySeverity(severity: ErrorSeverity): ErrorDetails[] {
    return useErrorStore.getState().getErrorsBySeverity(severity);
  }

  subscribeToErrors(callback: (errors: ErrorDetails[]) => void): () => void {
    return useErrorStore.subscribe(
      (state) => callback(state.errors)
    );
  }
}

export const errorService = ErrorService.getInstance();