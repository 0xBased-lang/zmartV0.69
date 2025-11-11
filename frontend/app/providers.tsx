'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';
import { FloatingWebSocketStatus } from '@/components/shared/WebSocketStatus';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // Create QueryClient with useState to avoid creating a new instance on every render
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30 seconds
            refetchOnWindowFocus: true,
            // Retry failed queries up to 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
        },
      })
  );

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[ErrorBoundary]', error, errorInfo);
        }
        // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
      }}
    >
      <QueryClientProvider client={queryClient}>
        <SolanaWalletProvider>
          {children}

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#fff',
                color: '#363636',
                borderRadius: '8px',
                padding: '12px 16px',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />

          {/* WebSocket connection status indicator */}
          <FloatingWebSocketStatus />
        </SolanaWalletProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
