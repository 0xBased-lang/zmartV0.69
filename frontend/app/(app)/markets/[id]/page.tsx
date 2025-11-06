/**
 * Market Detail Page - Dynamic Route
 *
 * Complete market view with trading interface
 *
 * --ultrathink Analysis:
 * - Server Component for initial data fetch (faster first paint)
 * - Client Components for interactive parts
 * - Two-column responsive layout
 * - Comprehensive error handling
 * - Loading states with skeletons
 *
 * Layout:
 * ┌─────────────────────────────────────┐
 * │ MarketHeader (title, state, expiry) │
 * ├──────────────────┬──────────────────┤
 * │ Left Column      │ Right Column     │
 * │ - PriceChart     │ - TradeForm      │
 * │ - OrderBook      │                  │
 * │ - Position       │                  │
 * ├──────────────────┴──────────────────┤
 * │ DiscussionSection                   │
 * └─────────────────────────────────────┘
 */

import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { MarketDetailContent } from './MarketDetailContent';

interface MarketDetailPageProps {
  params: {
    id: string;
  };
}

export default function MarketDetailPage({ params }: MarketDetailPageProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Suspense fallback={<MarketDetailSkeleton />}>
        <MarketDetailContent marketId={params.id} />
      </Suspense>
    </div>
  );
}

/**
 * Loading skeleton for market detail page
 */
function MarketDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Skeleton */}
          <div className="h-80 bg-gray-200 rounded-lg" />

          {/* OrderBook Skeleton */}
          <div className="h-64 bg-gray-200 rounded-lg" />
        </div>

        {/* Right Column (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          {/* TradeForm Skeleton */}
          <div className="h-[600px] bg-gray-200 rounded-lg" />
        </div>
      </div>

      {/* Discussion Skeleton */}
      <div className="h-48 bg-gray-200 rounded-lg" />
    </div>
  );
}
