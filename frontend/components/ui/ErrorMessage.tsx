import { cn } from '@/lib/utils';
import { XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface ErrorMessageProps {
  title?: string;
  message: string;
  severity?: 'error' | 'warning';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

/**
 * Enhanced error message component with:
 * - Visual severity indicators
 * - User-friendly messages
 * - Retry and dismiss actions
 * - Accessible design
 */
export function ErrorMessage({
  title,
  message,
  severity = 'error',
  onRetry,
  onDismiss,
  className
}: ErrorMessageProps) {
  const isError = severity === 'error';

  return (
    <div
      className={cn(
        'rounded-lg p-4 border',
        isError
          ? 'bg-red-50 border-red-200 text-red-900'
          : 'bg-yellow-50 border-yellow-200 text-yellow-900',
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        {isError ? (
          <XCircleIcon className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        ) : (
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="font-semibold mb-1">{title}</h3>
          )}
          <p className="text-sm">{message}</p>

          {/* Actions */}
          {(onRetry || onDismiss) && (
            <div className="flex gap-3 mt-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={cn(
                    'text-sm font-medium px-3 py-1 rounded',
                    isError
                      ? 'bg-red-100 hover:bg-red-200 text-red-900'
                      : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-900'
                  )}
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm font-medium underline opacity-75 hover:opacity-100"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * User-friendly error message mapper
 * Converts technical errors to readable messages
 */
export function getUserFriendlyError(error: unknown): string {
  if (!error) return 'An unknown error occurred';

  const errorMessage = error instanceof Error ? error.message : String(error);

  // Network errors
  if (errorMessage.includes('fetch') || errorMessage.includes('network')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Wallet errors
  if (errorMessage.includes('wallet') || errorMessage.includes('Phantom')) {
    return 'Wallet connection error. Please make sure your wallet is connected and try again.';
  }

  // Transaction errors
  if (errorMessage.includes('transaction') || errorMessage.includes('simulate')) {
    return 'Transaction failed. Please check your wallet balance and try again.';
  }

  // Insufficient funds
  if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
    return 'Insufficient funds. Please add SOL to your wallet and try again.';
  }

  // User rejected
  if (errorMessage.includes('rejected') || errorMessage.includes('cancelled')) {
    return 'Transaction cancelled. No funds were transferred.';
  }

  // Timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return 'Request timed out. Please try again.';
  }

  // Default to original message if no match
  return errorMessage;
}
