'use client';

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
