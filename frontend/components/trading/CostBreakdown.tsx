'use client';

import { fromFixedPoint } from '@/lib/lmsr';
import { cn } from '@/lib/utils';

interface CostBreakdownProps {
  baseCost: bigint;
  protocolFee: bigint;
  creatorFee: bigint;
  stakerFee: bigint;
  totalFee: bigint;
  finalAmount: bigint;
  action: 'BUY' | 'SELL';
  className?: string;
}

/**
 * Detailed cost breakdown showing:
 * - Base cost/proceeds
 * - Fee breakdown (3% protocol, 2% creator, 5% staker)
 * - Final amount
 */
export function CostBreakdown({
  baseCost,
  protocolFee,
  creatorFee,
  stakerFee,
  totalFee,
  finalAmount,
  action,
  className,
}: CostBreakdownProps) {
  const isBuy = action === 'BUY';

  const formatSOL = (value: bigint) => {
    const sol = fromFixedPoint(value);
    return sol.toFixed(4) + ' SOL';
  };

  return (
    <div className={cn('bg-surface-elevated border border-border-subtle rounded-lg p-4 space-y-2', className)}>
      {/* Base Cost/Proceeds */}
      <div className="flex justify-between text-sm">
        <span className="text-text-secondary">{isBuy ? 'Shares Cost' : 'Proceeds'}</span>
        <span className="font-medium text-text-primary">{formatSOL(baseCost)}</span>
      </div>

      {/* Fees */}
      <div className="border-t border-border-subtle pt-2 space-y-1">
        <div className="flex justify-between text-xs text-text-tertiary">
          <span>Protocol Fee (3%)</span>
          <span>{formatSOL(protocolFee)}</span>
        </div>
        <div className="flex justify-between text-xs text-text-tertiary">
          <span>Creator Fee (2%)</span>
          <span>{formatSOL(creatorFee)}</span>
        </div>
        <div className="flex justify-between text-xs text-text-tertiary">
          <span>Staker Fee (5%)</span>
          <span>{formatSOL(stakerFee)}</span>
        </div>
      </div>

      {/* Total Fee */}
      <div className="flex justify-between text-sm border-t border-border-subtle pt-2">
        <span className="text-text-secondary">Total Fees (10%)</span>
        <span className="font-medium text-status-error">{formatSOL(totalFee)}</span>
      </div>

      {/* Final Amount */}
      <div className="flex justify-between text-base font-bold border-t-2 border-border-default pt-2">
        <span className="text-text-primary">{isBuy ? 'Total Cost' : 'You Receive'}</span>
        <span className={isBuy ? 'text-trading-no' : 'text-trading-yes'}>
          {formatSOL(finalAmount)}
        </span>
      </div>
    </div>
  );
}
