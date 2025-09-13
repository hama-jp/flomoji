import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, AlertCircle, Bug } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { errorService, ErrorSeverity } from '@/services/errorService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
  lastErrorTime: number;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const now = Date.now();
    return {
      hasError: true,
      error,
      lastErrorTime: now
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorCount, lastErrorTime } = this.state;
    const now = Date.now();

    // Track error frequency
    const isRepeatedError = now - lastErrorTime < 5000; // Within 5 seconds
    const newErrorCount = isRepeatedError ? errorCount + 1 : 1;

    this.setState({
      error,
      errorInfo,
      errorCount: newErrorCount,
      lastErrorTime: now
    });

    // Log to centralized error service
    const severity: ErrorSeverity = newErrorCount > 3 ? 'critical' : 'error';
    errorService.logError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
      errorCount: newErrorCount,
      repeatedError: isRepeatedError
    }, {
      severity,
      category: 'system',
      userMessage: this.getUserFriendlyMessage(error, newErrorCount),
      recoverable: true,
      retryable: true
    });

    // Call custom error handler if provided
    onError?.(error, errorInfo);

    // Auto-reset after multiple errors (prevent infinite error loop)
    if (newErrorCount > 5) {
      this.scheduleAutoReset();
    }
  }

  private getUserFriendlyMessage(error: Error, errorCount: number): string {
    if (errorCount > 3) {
      return 'アプリケーションで繰り返しエラーが発生しています。ページを再読み込みすることをお勧めします。';
    }

    // Check for specific error types
    if (error.message.includes('ChunkLoadError') || error.message.includes('Loading chunk')) {
      return 'アプリケーションの一部が読み込めませんでした。ページを再読み込みしてください。';
    }

    if (error.message.includes('Network')) {
      return 'ネットワークエラーが発生しました。インターネット接続を確認してください。';
    }

    if (error.message.includes('memory') || error.message.includes('Maximum call stack')) {
      return 'メモリ不足またはスタックオーバーフローが発生しました。';
    }

    return 'アプリケーションでエラーが発生しました。再試行するか、ページを再読み込みしてください。';
  }

  private scheduleAutoReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }

    this.resetTimeoutId = setTimeout(() => {
      this.handleReset();
    }, 10000); // Auto-reset after 10 seconds
  };

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleReset = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
      lastErrorTime: 0
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const { error, errorInfo } = this.state;
    const errorReport = {
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };

    // Create GitHub issue URL
    const issueTitle = encodeURIComponent(`Bug Report: ${error?.message || 'Unknown Error'}`);
    const issueBody = encodeURIComponent(`
## Error Report

**Error Message:** ${error?.message || 'Unknown'}

**Stack Trace:**
\`\`\`
${error?.stack || 'No stack trace available'}
\`\`\`

**Component Stack:**
\`\`\`
${errorInfo?.componentStack || 'No component stack available'}
\`\`\`

**Browser:** ${navigator.userAgent}
**Time:** ${new Date().toISOString()}
    `);

    const githubUrl = `https://github.com/yourusername/flomoji/issues/new?title=${issueTitle}&body=${issueBody}`;
    window.open(githubUrl, '_blank');
  };

  render() {
    const { hasError, error, errorInfo, errorCount } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      const userMessage = this.getUserFriendlyMessage(error!, errorCount);
      const isRepeatedError = errorCount > 3;
      const isDevelopment = import.meta.env.DEV;

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-gradient-to-br from-red-50 to-orange-50">
          <div className="max-w-2xl w-full">
            <Alert
              variant="destructive"
              className="border-red-200 bg-white shadow-lg"
            >
              <AlertCircle className="h-5 w-5" />
              <AlertDescription className="text-red-800">
                <div className="space-y-4">
                  {/* Header */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                      {isRepeatedError ? (
                        <>
                          <span className="text-red-600">⚠️</span>
                          繰り返しエラーが発生しています ({errorCount}回)
                        </>
                      ) : (
                        'エラーが発生しました'
                      )}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {userMessage}
                    </p>
                  </div>

                  {/* Error Details (Collapsible) */}
                  {error && (
                    <details className="text-xs bg-gray-50 rounded-lg p-3">
                      <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                        技術的な詳細を表示
                      </summary>
                      <div className="mt-3 space-y-3">
                        {/* Error Message */}
                        <div className="p-2 bg-white rounded border border-gray-200">
                          <div className="font-semibold text-gray-600 mb-1">エラーメッセージ:</div>
                          <div className="font-mono text-red-600 break-all">
                            {error.toString()}
                          </div>
                        </div>

                        {/* Stack Trace (Development only) */}
                        {isDevelopment && error.stack && (
                          <div className="p-2 bg-white rounded border border-gray-200">
                            <div className="font-semibold text-gray-600 mb-1">スタックトレース:</div>
                            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40 text-gray-600">
                              {error.stack}
                            </pre>
                          </div>
                        )}

                        {/* Component Stack */}
                        {isDevelopment && errorInfo?.componentStack && (
                          <div className="p-2 bg-white rounded border border-gray-200">
                            <div className="font-semibold text-gray-600 mb-1">コンポーネントスタック:</div>
                            <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-40 text-gray-600">
                              {errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={this.handleReset}
                      className="flex-1 sm:flex-none"
                      variant="default"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      再試行
                    </Button>

                    <Button
                      onClick={this.handleReload}
                      className="flex-1 sm:flex-none"
                      variant="outline"
                      size="sm"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      ページを再読み込み
                    </Button>

                    <Button
                      onClick={this.handleGoHome}
                      className="flex-1 sm:flex-none"
                      variant="outline"
                      size="sm"
                    >
                      <Home className="h-4 w-4 mr-2" />
                      ホームへ戻る
                    </Button>

                    {isDevelopment && (
                      <Button
                        onClick={this.handleReportBug}
                        className="flex-1 sm:flex-none"
                        variant="outline"
                        size="sm"
                      >
                        <Bug className="h-4 w-4 mr-2" />
                        バグを報告
                      </Button>
                    )}
                  </div>

                  {/* Auto-reset notification */}
                  {errorCount > 5 && (
                    <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded">
                      ⏱️ 10秒後に自動的にリセットされます...
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary

