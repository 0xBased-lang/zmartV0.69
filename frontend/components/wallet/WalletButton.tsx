'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { WalletAddress } from './WalletAddress';
import { WalletBalance } from './WalletBalance';

export function WalletButton() {
  const { connected, publicKey } = useWallet();

  if (!connected) {
    return (
      <WalletMultiButton className="!bg-primary hover:!bg-primary-600 !rounded-md !px-4 !py-2" />
    );
  }

  return (
    <div className="flex items-center gap-2">
      <WalletBalance />
      <WalletAddress address={publicKey?.toString() || ''} />
      <WalletMultiButton className="!bg-primary hover:!bg-primary-600 !rounded-md !px-4 !py-2" />
    </div>
  );
}
