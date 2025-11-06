import {
  MarketState,
  MARKET_STATE_LABELS,
  MARKET_STATE_COLORS,
} from '@/types/market';
import { cn } from '@/lib/utils';

interface StateBadgeProps {
  state: MarketState;
  className?: string;
}

/**
 * Badge component displaying market state with appropriate color
 * Uses state-specific colors from market types
 */
export function StateBadge({ state, className }: StateBadgeProps) {
  const label = MARKET_STATE_LABELS[state];
  const colorClass = MARKET_STATE_COLORS[state];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
