import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary caught an error:', {
      name: this.props.name || 'Unknown Component',
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
          <div className="bg-surface/50 backdrop-blur-lg border border-border-color rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              Something went wrong
            </h2>
            
            <p className="text-text-body mb-4">
              {this.props.name 
                ? `Error in ${this.props.name}` 
                : 'An unexpected error occurred'}
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4 text-left">
                <p className="text-red-300 text-xs font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200"
            >
              Try Again
            </button>

            <button
              onClick={() => {
                window.location.href = '/';
              }}
              className="w-full mt-2 bg-surface-alt text-white font-semibold py-3 rounded-xl border border-border-color hover:bg-surface transition-all duration-200"
            >
              Go to Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
