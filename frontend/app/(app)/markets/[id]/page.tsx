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
import Link from 'next/link';
import { MarketDetailContent } from './MarketDetailContent';
import { ThreeColumnLayout } from '@/components/layout/ThreeColumnLayout';
import { TrendingMarkets, HotTopics } from '@/components/sidebar/left';
import { DiscussionPanel, SocialShare, RelatedMarkets } from '@/components/sidebar/right';

interface MarketDetailPageProps {
  params: {
    id: string;
  };
}

export default function MarketDetailPage({ params }: MarketDetailPageProps) {
  return (
    <ThreeColumnLayout
      leftSidebar={
        <>
          <HotTopics />
          <TrendingMarkets />
        </>
      }
      rightSidebar={
        <>
          <SocialShare marketId={params.id} />
          <RelatedMarkets currentMarketId={params.id} />
          <DiscussionPanel marketId={params.id} />
        </>
      }
    >
      {/* Breadcrumb Navigation */}
      <nav className="text-sm text-text-tertiary mb-6" aria-label="Breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="/markets" className="hover:text-text-primary transition-colors">
              Markets
            </Link>
          </li>
          <li aria-hidden="true">›</li>
          <li className="text-text-primary font-medium">Market Details</li>
        </ol>
      </nav>

      {/* Market Content */}
      <Suspense fallback={<MarketDetailSkeleton />}>
        <MarketDetailContent marketId={params.id} />
      </Suspense>
    </ThreeColumnLayout>
  );
}

/**
 * Loading skeleton for market detail page
 */
function MarketDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Breadcrumb Skeleton */}
      <div className="flex items-center gap-2 mb-6">
        <div className="h-4 bg-gray-200 rounded w-16" />
        <div className="h-4 bg-gray-200 rounded w-2" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>

      {/* Header Skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
        {/* State Badge */}
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-gray-200 rounded" />
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>

        {/* Title */}
        <div className="h-8 bg-gray-200 rounded w-3/4" />

        {/* Description */}
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded w-full" />
          <div className="h-5 bg-gray-200 rounded w-2/3" />
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-6">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chart Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
            <div className="h-80 bg-gray-100 rounded" />
          </div>

          {/* OrderBook Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          </div>

          {/* Position Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          {/* TradeForm Skeleton */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
            <div className="h-6 bg-gray-200 rounded w-24 mb-6" />

            {/* Outcome Tabs */}
            <div className="flex gap-2 mb-6">
              <div className="h-10 bg-gray-200 rounded flex-1" />
              <div className="h-10 bg-gray-200 rounded flex-1" />
            </div>

            {/* Input */}
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-12 bg-gray-200 rounded" />
            </div>

            {/* Stats */}
            <div className="mt-6 space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-20" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Discussion Skeleton */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded-full" />
                <div className="h-4 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-16 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
