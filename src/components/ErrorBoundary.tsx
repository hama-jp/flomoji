import React, { ErrorInfo, PropsWithChildren } from 'react';
import { RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

type Props = PropsWithChildren<{}>;

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, error: null, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <div className="max-w-md w-full">
            <Alert variant="destructive" className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">エラーが発生しました</h3>
                    <p className="text-sm">
                      アプリケーションでエラーが発生しました。以下のボタンをクリックして再試行してください。
                    </p>
                  </div>

                  {this.state.error && (
                    <details className="text-xs">
                      <summary className="cursor-pointer font-medium">エラー詳細</summary>
                      <div className="mt-2 p-2 bg-white rounded border">
                        <div className="font-mono text-xs break-all">
                          <div className="font-semibold">Error:</div>
                          <div className="mb-2">{this.state.error.toString()}</div>
                          {this.state.errorInfo && (
                            <>
                              <div className="font-semibold">Stack Trace:</div>
                              <pre className="whitespace-pre-wrap">
                                {this.state.errorInfo.componentStack}
                              </pre>
                            </>
                          )}
                        </div>
                      </div>
                    </details>
                  )}

                  <Button
                    onClick={this.handleReset}
                    className="w-full"
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    再試行
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary

