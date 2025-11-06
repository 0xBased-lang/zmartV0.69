'use client';

import { useWalletBalance } from '@/lib/hooks/useWalletBalance';
import { Skeleton } from '@/components/ui/skeleton';

export function WalletBalance() {
  const { balance, loading } = useWalletBalance();

  if (loading) {
    return <Skeleton className="w-20 h-8" />;
  }

  return (
    <div className="px-3 py-2 bg-primary-50 rounded-md">
      <span className="text-sm font-semibold text-primary">
        {balance.toFixed(2)} SOL
      </span>
    </div>
  );
}
