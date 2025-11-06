'use client';

interface ErrorMessageProps {
  message: string;
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <p className="text-red-800">{message}</p>
    </div>
  );
}
