'use client';

import { useEffect, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
} from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  CoinbaseWalletAdapter,
  TrustWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { BackpackWalletAdapter } from '@solana/wallet-adapter-backpack';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { SOLANA_NETWORK, SOLANA_RPC_URL } from '@/config/constants';
import { clearAPIClient } from '@/lib/services/api';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

/**
 * Inner component that exposes wallet state to API client
 * This bridges the gap between wallet context and the global API client
 */
function WalletStateBridge({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, disconnect } = useWallet();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Expose wallet state to API client
    (window as any).__WALLET_STATE__ = {
      publicKey,
      disconnect,
    };

    // Expose sign message function
    (window as any).__WALLET_SIGN_MESSAGE__ = signMessage;

    // Clear API cache when wallet disconnects
    return () => {
      if (!publicKey) {
        clearAPIClient();
      }
    };
  }, [publicKey, signMessage, disconnect]);

  return <>{children}</>;
}

export function SolanaWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Network configuration
  const network = (SOLANA_NETWORK || 'devnet') as WalletAdapterNetwork;
  const endpoint = useMemo(
    () => SOLANA_RPC_URL || clusterApiUrl(network),
    [network]
  );

  // Wallet adapters - Initialize outside component to prevent re-renders
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BackpackWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TrustWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletStateBridge>{children}</WalletStateBridge>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
