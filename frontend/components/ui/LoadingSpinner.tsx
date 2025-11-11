import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

/**
 * Enhanced loading spinner with smooth animations
 * Supports different sizes and optional label
 */
export function LoadingSpinner({
  size = 'md',
  className,
  label
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-gray-300 border-t-blue-600',
          sizeClasses[size]
        )}
        role="status"
        aria-label={label || 'Loading'}
      >
        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
      {label && (
        <p className="mt-3 text-sm text-gray-600 animate-pulse">{label}</p>
      )}
    </div>
  );
}

/**
 * Full-page loading overlay
 */
export function LoadingOverlay({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingSpinner size="lg" label={label} />
    </div>
  );
}

/**
 * Inline loading state for buttons
 */
export function ButtonSpinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent',
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
