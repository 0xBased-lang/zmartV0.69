'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletAddress } from './WalletAddress';
import { WalletBalance } from './WalletBalance';

export function WalletButton() {
  const { connected, publicKey } = useWallet();

  if (!connected) {
    return (
      <WalletMultiButton className="!bg-brand-primary hover:!bg-brand-accent !text-text-primary-inverse !rounded-lg !px-4 !py-2 !font-medium shadow-glow hover:shadow-glow-lg !transition-all !duration-200" />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <WalletBalance />
      <WalletAddress address={publicKey?.toString() || ''} />
      <WalletMultiButton className="!bg-brand-primary hover:!bg-brand-accent !text-text-primary-inverse !rounded-lg !px-4 !py-2 !font-medium shadow-glow hover:shadow-glow-lg !transition-all !duration-200" />
    </div>
  );
}
