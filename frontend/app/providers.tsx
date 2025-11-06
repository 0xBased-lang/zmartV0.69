'use client';

import { SolanaWalletProvider } from '@/lib/solana/wallet-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SolanaWalletProvider>
      {children}
    </SolanaWalletProvider>
  );
}
