'use client';

import { MarketState, MARKET_STATE_LABELS } from '@/types/market';
import type { MarketFilters as Filters } from '@/types/market';

interface MarketFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

/**
 * Filter and sort controls for market listing
 * Allows filtering by market state and sorting by various criteria
 */
export function MarketFilters({
  filters,
  onFiltersChange,
}: MarketFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* State Filter */}
      <div className="flex-1">
        <label
          htmlFor="state-filter"
          className="block text-sm font-medium text-text-primary mb-2"
        >
          Filter by State
        </label>
        <select
          id="state-filter"
          value={filters.state ?? 'all'}
          onChange={(e) => {
            const value = e.target.value;
            onFiltersChange({
              ...filters,
              state:
                value === 'all'
                  ? undefined
                  : (parseInt(value) as MarketState),
            });
          }}
          className="w-full px-4 py-2 bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
        >
          <option value="all">All States</option>
          <option value={MarketState.PROPOSED}>
            {MARKET_STATE_LABELS[MarketState.PROPOSED]}
          </option>
          <option value={MarketState.APPROVED}>
            {MARKET_STATE_LABELS[MarketState.APPROVED]}
          </option>
          <option value={MarketState.ACTIVE}>
            {MARKET_STATE_LABELS[MarketState.ACTIVE]}
          </option>
          <option value={MarketState.RESOLVING}>
            {MARKET_STATE_LABELS[MarketState.RESOLVING]}
          </option>
          <option value={MarketState.DISPUTED}>
            {MARKET_STATE_LABELS[MarketState.DISPUTED]}
          </option>
          <option value={MarketState.FINALIZED}>
            {MARKET_STATE_LABELS[MarketState.FINALIZED]}
          </option>
        </select>
      </div>

      {/* Sort By */}
      <div className="flex-1">
        <label
          htmlFor="sort-by"
          className="block text-sm font-medium text-text-primary mb-2"
        >
          Sort By
        </label>
        <select
          id="sort-by"
          value={filters.sortBy}
          onChange={(e) => {
            onFiltersChange({
              ...filters,
              sortBy: e.target.value as Filters['sortBy'],
            });
          }}
          className="w-full px-4 py-2 bg-surface-elevated border border-border-default rounded-lg text-text-primary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-colors"
        >
          <option value="newest">Newest First</option>
          <option value="volume">Highest Volume</option>
          <option value="ending_soon">Ending Soon</option>
        </select>
      </div>
    </div>
  );
}
