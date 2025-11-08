'use client';

import { useQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { getMarketById } from '@/lib/supabase/database';
import { useMarketStateWithStatus } from '@/lib/hooks/useMarketState';
import { MarketHeader } from '@/components/markets/MarketHeader';
import { PriceChart } from '@/components/markets/PriceChart';
import { OrderBook } from '@/components/markets/OrderBook';
import { CurrentPosition } from '@/components/markets/CurrentPosition';
import { DiscussionSection } from '@/components/markets/DiscussionSection';
import { TradeForm } from '@/components/trading/TradeForm';

interface MarketDetailContentProps {
  marketId: string;
}

/**
 * Market detail content with data fetching
 * Client component for React Query integration
 */
export function MarketDetailContent({ marketId }: MarketDetailContentProps) {
  // Fetch market data
  const { data: market, isLoading, error } = useQuery({
    queryKey: ['market', marketId],
    queryFn: () => getMarketById(marketId),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch on-chain market state
  const {
    data: marketState,
    isLoading: isLoadingState,
    isError: isStateError,
    isNotFound: isStateNotFound,
  } = useMarketStateWithStatus(marketId);

  // Handle loading (wait for both market metadata AND on-chain state)
  if (isLoading || isLoadingState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {isLoading ? 'Loading market data...' : 'Loading market state...'}
          </p>
        </div>
      </div>
    );
  }

  // Handle errors
  if (error || !market) {
    notFound();
  }

  if (isStateNotFound) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Market Not Found On-Chain</h2>
          <p className="text-muted-foreground">
            This market exists in the database but not on Solana.
          </p>
          <p className="text-sm text-muted-foreground">
            Market ID: {marketId}
          </p>
        </div>
      </div>
    );
  }

  if (isStateError || !marketState) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Failed to Load Market State</h2>
          <p className="text-muted-foreground">
            Could not fetch market data from Solana blockchain.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market Header */}
      <MarketHeader market={market} />

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Charts and Data (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Price Chart */}
          <PriceChart marketId={market.market_id} />

          {/* Order Book */}
          <OrderBook marketId={market.market_id} />

          {/* Current Position (if wallet connected) */}
          <CurrentPosition marketId={market.market_id} />
        </div>

        {/* Right Column: Trade Form (1/3 width on desktop) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <TradeForm marketId={market.market_id} marketState={marketState} />
          </div>
        </div>
      </div>

      {/* Discussion Section */}
      <DiscussionSection marketId={market.market_id} proposalId={null} />
    </div>
  );
}
