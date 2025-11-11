'use client';

import { useWalletBalance } from '@/lib/hooks/useWalletBalance';
import { Skeleton } from '@/components/ui/skeleton';

export function WalletBalance() {
  const { balance, loading } = useWalletBalance();

  if (loading) {
    return <Skeleton className="w-20 h-8" />;
  }

  return (
    <div className="px-3 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-lg">
      <span className="text-sm font-semibold text-brand-primary">
        {balance.toFixed(2)} SOL
      </span>
    </div>
  );
}
