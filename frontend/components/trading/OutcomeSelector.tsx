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
          'flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200',
          'border-2 focus:outline-none focus:ring-2 focus:ring-trading-yes',
          value === Outcome.YES
            ? 'bg-trading-yes/10 border-trading-yes text-trading-yes shadow-glow'
            : 'bg-surface-elevated border-border-default text-text-secondary hover:border-trading-yes'
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
          'flex-1 px-4 py-3 rounded-lg font-medium transition-all duration-200',
          'border-2 focus:outline-none focus:ring-2 focus:ring-trading-no',
          value === Outcome.NO
            ? 'bg-trading-no/10 border-trading-no text-trading-no shadow-glow'
            : 'bg-surface-elevated border-border-default text-text-secondary hover:border-trading-no'
        )}
      >
        <div className="text-sm font-semibold">NO</div>
        <div className="text-2xl font-bold mt-1">{noPrice.toFixed(1)}%</div>
      </button>
    </div>
  );
}
