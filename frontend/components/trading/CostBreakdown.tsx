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
    <div className={cn('bg-gray-50 rounded-lg p-4 space-y-2', className)}>
      {/* Base Cost/Proceeds */}
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{isBuy ? 'Shares Cost' : 'Proceeds'}</span>
        <span className="font-medium">{formatSOL(baseCost)}</span>
      </div>

      {/* Fees */}
      <div className="border-t border-gray-200 pt-2 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Protocol Fee (3%)</span>
          <span>{formatSOL(protocolFee)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Creator Fee (2%)</span>
          <span>{formatSOL(creatorFee)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Staker Fee (5%)</span>
          <span>{formatSOL(stakerFee)}</span>
        </div>
      </div>

      {/* Total Fee */}
      <div className="flex justify-between text-sm border-t border-gray-200 pt-2">
        <span className="text-gray-600">Total Fees (10%)</span>
        <span className="font-medium text-red-600">{formatSOL(totalFee)}</span>
      </div>

      {/* Final Amount */}
      <div className="flex justify-between text-base font-bold border-t-2 border-gray-300 pt-2">
        <span>{isBuy ? 'Total Cost' : 'You Receive'}</span>
        <span className={isBuy ? 'text-red-600' : 'text-green-600'}>
          {formatSOL(finalAmount)}
        </span>
      </div>
    </div>
  );
}
