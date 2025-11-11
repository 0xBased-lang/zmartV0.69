'use client';

import { truncateAddress } from '@/lib/utils/wallet';

interface WalletAddressProps {
  address: string;
}

export function WalletAddress({ address }: WalletAddressProps) {
  if (!address) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border-default rounded-lg">
      <div className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
      <span className="text-sm font-mono text-text-primary">{truncateAddress(address)}</span>
    </div>
  );
}
