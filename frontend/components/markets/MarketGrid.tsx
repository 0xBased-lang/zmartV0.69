import type { Market } from '@/types/market';
import { MarketCard } from './MarketCard';
import { EmptyState } from './EmptyState';

interface MarketGridProps {
  markets: Market[];
  loading?: boolean;
  hasFilters?: boolean;
}

/**
 * Loading skeleton for market cards
 * Shows placeholder cards while data is loading
 */
function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
        >
          <div className="h-6 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 h-12 bg-gray-200 rounded"></div>
            <div className="flex-1 h-12 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

/**
 * Grid layout for displaying market cards
 * Responsive: 1 column (mobile), 2 columns (tablet), 3 columns (desktop)
 */
export function MarketGrid({
  markets,
  loading = false,
  hasFilters = false,
}: MarketGridProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (markets.length === 0) {
    return <EmptyState hasFilters={hasFilters} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCard key={market.market_id} market={market} />
      ))}
    </div>
  );
}
