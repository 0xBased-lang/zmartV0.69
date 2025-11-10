'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';
import { FloatingWebSocketStatus } from '@/components/shared/WebSocketStatus';
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
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SolanaWalletProvider>
        {children}

        {/* Toast notifications */}
        <Toaster position="top-right" />

        {/* WebSocket connection status indicator */}
        <FloatingWebSocketStatus />
      </SolanaWalletProvider>
    </QueryClientProvider>
  );
}
