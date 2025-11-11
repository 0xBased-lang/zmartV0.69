'use client';

import { Outcome } from '@/lib/lmsr';
import { cn } from '@/lib/utils';

interface OutcomeSelectorProps {
  value: Outcome;
  onChange: (outcome: Outcome) => void;
  yesPrice: number; // 0-100
  noPrice: number; // 0-100
  className?: string;
}

/**
 * Tab selector for YES/NO outcomes
 * Shows current prices for each outcome
 */
export function OutcomeSelector({
  value,
  onChange,
  yesPrice,
  noPrice,
  className,
}: OutcomeSelectorProps) {
  return (
    <div className={cn('flex gap-2', className)}>
      {/* YES Tab */}
      <button
        type="button"
        data-testid="outcome-yes"
        onClick={() => onChange(Outcome.YES)}
        className={cn(
          'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
          'border-2 focus:outline-none focus:ring-2 focus:ring-green-500',
          value === Outcome.YES
            ? 'bg-green-50 border-green-500 text-green-900'
            : 'bg-white border-gray-200 text-gray-700 hover:border-green-300'
        )}
      >
        <div className="text-sm font-semibold">YES</div>
        <div className="text-2xl font-bold mt-1" data-testid="market-price">{yesPrice.toFixed(1)}%</div>
      </button>

      {/* NO Tab */}
      <button
        type="button"
        data-testid="outcome-no"
        onClick={() => onChange(Outcome.NO)}
        className={cn(
          'flex-1 px-4 py-3 rounded-lg font-medium transition-all',
          'border-2 focus:outline-none focus:ring-2 focus:ring-red-500',
          value === Outcome.NO
            ? 'bg-red-50 border-red-500 text-red-900'
            : 'bg-white border-gray-200 text-gray-700 hover:border-red-300'
        )}
      >
        <div className="text-sm font-semibold">NO</div>
        <div className="text-2xl font-bold mt-1">{noPrice.toFixed(1)}%</div>
      </button>
    </div>
  );
}
