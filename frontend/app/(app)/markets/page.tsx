'use client';

import { useState } from 'react';
import { useMarkets } from '@/lib/hooks/useMarkets';
import { MarketFilters } from '@/components/markets/MarketFilters';
import { MarketGrid } from '@/components/markets/MarketGrid';
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout';
import { HotTopics, TrendingMarkets, CategoryFilters, QuickStats } from '@/components/sidebar/left';
import { RecentActivity, SocialShare, RelatedMarkets } from '@/components/sidebar/right';
import type { MarketFilters as Filters } from '@/types/market';

export default function MarketsPage() {
  const [filters, setFilters] = useState<Filters>({
    sortBy: 'newest',
  });

  const { data: markets = [], isLoading, error } = useMarkets(filters);

  const hasFilters = filters.state !== undefined;

  return (
    <ThreeColumnLayout
      leftSidebar={
        <>
          <HotTopics />
          <CategoryFilters />
          <TrendingMarkets />
          <QuickStats />
        </>
      }
      rightSidebar={
        <>
          <RecentActivity />
          <SocialShare />
          <RelatedMarkets />
        </>
      }
    >
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-text-primary">Active Markets</h1>
        <p className="text-text-secondary mt-2">
          Explore and trade on prediction markets
        </p>
      </div>

      {/* Filters */}
      <MarketFilters filters={filters} onFiltersChange={setFilters} />

      {/* Error State */}
      {error && (
        <div className="bg-status-error/10 border border-status-error rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-status-error mb-2">
            Failed to load markets
          </h3>
          <p className="text-status-error/80 text-sm">
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
    </ThreeColumnLayout>
  );
}
