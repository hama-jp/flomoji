import React, { useEffect, useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react';
import { useErrorStore, ErrorDetails, ErrorSeverity, errorService } from '@/services/errorService';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ErrorNotificationProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  autoHideDuration?: number;
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  position = 'top-right',
  maxVisible = 3,
  autoHideDuration = 5000
}) => {
  const errors = useErrorStore(state => state.errors);
  const [visibleErrors, setVisibleErrors] = useState<ErrorDetails[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Filter out dismissed errors and limit to maxVisible
    const newVisibleErrors = errors
      .filter(error => !dismissedIds.has(error.id))
      .slice(0, maxVisible);

    setVisibleErrors(newVisibleErrors);

    // Auto-hide info and warning messages
    const timers: NodeJS.Timeout[] = [];
    newVisibleErrors.forEach(error => {
      if (error.severity === 'info' || error.severity === 'warning') {
        const timer = setTimeout(() => {
          handleDismiss(error.id);
        }, autoHideDuration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [errors, dismissedIds, maxVisible, autoHideDuration]);

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
    errorService.clearError(id);
  };

  const handleRetry = async (error: ErrorDetails) => {
    const strategy = errorService.createRecoveryStrategy(error);
    if (strategy && strategy.type === 'retry') {
      await strategy.action();
      handleDismiss(error.id);
    }
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'info':
        return <Info className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
      case 'critical':
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-900';
    }
  };

  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
    }
  };

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div className={cn(
      'fixed z-50 flex flex-col gap-2 max-w-md',
      getPositionStyles()
    )}>
      {visibleErrors.map((error, index) => (
        <div
          key={error.id}
          className={cn(
            'p-4 rounded-lg border shadow-lg transition-all duration-300 animate-in slide-in-from-top-2',
            getSeverityStyles(error.severity),
            index > 0 && 'mt-2'
          )}
          style={{
            animationDelay: `${index * 100}ms`
          }}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              {getSeverityIcon(error.severity)}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium break-words">
                {error.userMessage || error.message}
              </p>

              {/* Show technical details in development */}
              {import.meta.env.DEV && error.message !== error.userMessage && (
                <details className="mt-2">
                  <summary className="text-xs opacity-70 cursor-pointer hover:opacity-100">
                    技術的な詳細
                  </summary>
                  <pre className="mt-1 text-xs opacity-70 whitespace-pre-wrap break-words">
                    {error.message}
                  </pre>
                </details>
              )}

              {/* Retry button for retryable errors */}
              {error.retryable && error.retryCount! < error.maxRetries! && (
                <Button
                  onClick={() => handleRetry(error)}
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-6 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  再試行 ({error.retryCount}/{error.maxRetries})
                </Button>
              )}
            </div>

            <button
              onClick={() => handleDismiss(error.id)}
              className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
              aria-label="閉じる"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      {/* Show count of additional errors if any */}
      {errors.length > maxVisible && (
        <div className="text-xs text-gray-600 text-center mt-2">
          他に {errors.length - maxVisible} 件のエラーがあります
        </div>
      )}
    </div>
  );
};

export default ErrorNotification;