'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorMessage } from './ErrorMessage';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary component to catch and handle React component errors
 * Prevents entire app from crashing due to component errors
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // TODO: Send error to monitoring service (Sentry, LogRocket, etc.)
    // Example: sendErrorToMonitoring(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-lg w-full">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600">
                We're sorry, but something unexpected happened. Please try again.
              </p>
            </div>

            {/* Error details (dev only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900 mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm font-mono text-red-800 whitespace-pre-wrap">
                    {this.state.error.toString()}
                  </p>
                  {this.state.error.stack && (
                    <pre className="text-xs font-mono text-red-700 mt-2 overflow-x-auto">
                      {this.state.error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={this.handleReset}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Reload Page
              </button>
            </div>

            {/* Help text */}
            <p className="text-sm text-gray-500 text-center mt-6">
              If this problem persists, please{' '}
              <a
                href="https://github.com/your-repo/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                report the issue
              </a>
              .
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for functional components
 * Use with Suspense for loading states
 */
export function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error;
  resetErrorBoundary: () => void;
}) {
  return (
    <div className="p-6">
      <ErrorMessage
        title="Error"
        message={error.message || 'An unexpected error occurred'}
        severity="error"
        onRetry={resetErrorBoundary}
      />
    </div>
  );
}
