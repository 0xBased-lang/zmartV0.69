'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButtonDynamic } from './WalletButtonDynamic';
import { WalletAddress } from './WalletAddress';
import { WalletBalance } from './WalletBalance';

/**
 * Wallet connection button with dynamic imports to prevent hydration errors
 *
 * Uses WalletMultiButtonDynamic (next/dynamic with ssr: false) instead of
 * direct import to avoid SSR/CSR mismatches from browser-specific APIs.
 */
export function WalletButton() {
  const { connected, publicKey } = useWallet();

  if (!connected) {
    return (
      <WalletMultiButtonDynamic className="!bg-brand-primary hover:!bg-brand-accent !text-text-primary-inverse !rounded-lg !px-4 !py-2 !font-medium shadow-glow hover:shadow-glow-lg !transition-all !duration-200" />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <WalletBalance />
      <WalletAddress address={publicKey?.toString() || ''} />
      <WalletMultiButtonDynamic className="!bg-brand-primary hover:!bg-brand-accent !text-text-primary-inverse !rounded-lg !px-4 !py-2 !font-medium shadow-glow hover:shadow-glow-lg !transition-all !duration-200" />
    </div>
  );
}
