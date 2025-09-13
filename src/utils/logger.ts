/**
 * 統一されたログ管理ユーティリティ
 * 本番環境では自動的にログを抑制し、開発環境でのみ詳細情報を出力
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  module?: string;
  action?: string;
  data?: any;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private isDebugEnabled = this.isDevelopment;

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const module = context?.module ? `[${context.module}]` : '';
    const action = context?.action ? `{${context.action}}` : '';
    return `${timestamp} ${level.toUpperCase()} ${module}${action} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment) {
      // 本番環境では error と warn のみ出力
      return level === 'error' || level === 'warn';
    }

    if (level === 'debug') {
      return this.isDebugEnabled;
    }

    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, context), context?.data || '');
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context), context?.data || '');
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context), context?.data || '');
    }
  }

  error(message: string, error?: any, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorData = {
        message: error?.message || error,
        stack: error?.stack,
        ...context?.data
      };
      console.error(this.formatMessage('error', message, context), errorData);
    }
  }

  // グループ化されたログ（折りたたみ可能）
  group(label: string, fn: () => void): void {
    if (this.isDevelopment) {
      console.group(label);
      fn();
      console.groupEnd();
    } else {
      fn();
    }
  }

  // テーブル形式でデータを表示
  table(data: any[], columns?: string[]): void {
    if (this.isDevelopment && data.length > 0) {
      if (columns) {
        console.table(data, columns);
      } else {
        console.table(data);
      }
    }
  }

  // パフォーマンス計測
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  // デバッグモードの切り替え
  setDebugMode(enabled: boolean): void {
    this.isDebugEnabled = enabled;
    if (enabled) {
      this.info('Debug mode enabled');
    }
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// 各モジュール用のロガーファクトリー
export function createModuleLogger(moduleName: string) {
  return {
    debug: (message: string, data?: any) =>
      logger.debug(message, { module: moduleName, data }),
    info: (message: string, data?: any) =>
      logger.info(message, { module: moduleName, data }),
    warn: (message: string, data?: any) =>
      logger.warn(message, { module: moduleName, data }),
    error: (message: string, error?: any, data?: any) =>
      logger.error(message, error, { module: moduleName, data }),
  };
}

export default logger;