'use client';

import { truncateAddress } from '@/lib/utils/wallet';

interface WalletAddressProps {
  address: string;
}

export function WalletAddress({ address }: WalletAddressProps) {
  if (!address) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md">
      <div className="w-2 h-2 rounded-full bg-green-500" />
      <span className="text-sm font-mono">{truncateAddress(address)}</span>
    </div>
  );
}
