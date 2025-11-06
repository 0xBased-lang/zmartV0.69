'use client';

import { useState } from 'react';
import { useMarkets } from '@/lib/hooks/useMarkets';
import { MarketFilters } from '@/components/markets/MarketFilters';
import { MarketGrid } from '@/components/markets/MarketGrid';
import type { MarketFilters as Filters } from '@/types/market';

export default function MarketsPage() {
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'newest',
  });

  const { data: markets = [], isLoading, error } = useMarkets(filters);

  const hasFilters = filters.state !== undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Active Markets</h1>
        <p className="text-gray-600 mt-2">
          Explore and trade on prediction markets
        </p>
      </div>

      {/* Filters */}
      <MarketFilters filters={filters} onFiltersChange={setFilters} />

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-red-800 mb-2">
            Failed to load markets
          </h3>
          <p className="text-red-700 text-sm">
            {error.message ||
              'An error occurred while fetching markets. Please try again.'}
          </p>
        </div>
      )}

      {/* Market Grid */}
      <MarketGrid
        markets={markets}
        loading={isLoading}
        hasFilters={hasFilters}
      />
    </div>
  );
}
