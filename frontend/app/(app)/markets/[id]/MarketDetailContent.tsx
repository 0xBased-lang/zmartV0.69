'use client';

import { useEffect } from 'react';
import { notFound } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useMarket } from '@/lib/hooks/useMarket';
import { useMarketStateWithStatus } from '@/lib/hooks/useMarketState';
import { useMarketUpdates, useTradeUpdates, useMarketStateChanges } from '@/hooks/useWebSocket';
import { MarketHeader } from '@/components/markets/MarketHeader';
import { PriceChart } from '@/components/markets/PriceChart';
import { OrderBook } from '@/components/markets/OrderBook';
import { CurrentPosition } from '@/components/markets/CurrentPosition';
import { DiscussionSection } from '@/components/markets/DiscussionSection';
import { TradeForm } from '@/components/trading/TradeForm';
import { ClaimButton } from '@/components/trading/ClaimButton';

interface MarketDetailContentProps {
  marketId: string;
}

/**
 * Market detail content with data fetching
 * Client component for React Query integration
 */
export function MarketDetailContent({ marketId }: MarketDetailContentProps) {
  const queryClient = useQueryClient();

  // Fetch market data from backend API
  const { data: market, isLoading, error } = useMarket(marketId);

  // Fetch on-chain market state
  const {
    data: marketState,
    isLoading: isLoadingState,
    isError: isStateError,
    isNotFound: isStateNotFound,
  } = useMarketStateWithStatus(marketId);

  // Real-time WebSocket updates
  const { latestUpdate: marketUpdate } = useMarketUpdates(marketId);
  const { latestTrade } = useTradeUpdates(marketId);
  const { latestChange: stateChange } = useMarketStateChanges(marketId);

  // Invalidate queries when real-time updates arrive
  useEffect(() => {
    if (marketUpdate) {
      console.log('[Real-time] Market price updated:', marketUpdate);
      // Invalidate market data to refetch with new prices
      queryClient.invalidateQueries({ queryKey: ['market', marketId] });
      queryClient.invalidateQueries({ queryKey: ['market-state', marketId] });
    }
  }, [marketUpdate, marketId, queryClient]);

  useEffect(() => {
    if (latestTrade) {
      console.log('[Real-time] New trade executed:', latestTrade);
      // Invalidate market data and trades
      queryClient.invalidateQueries({ queryKey: ['market', marketId] });
      queryClient.invalidateQueries({ queryKey: ['trades', marketId] });
    }
  }, [latestTrade, marketId, queryClient]);

  useEffect(() => {
    if (stateChange) {
      console.log('[Real-time] Market state changed:', stateChange);
      // Invalidate market state
      queryClient.invalidateQueries({ queryKey: ['market', marketId] });
      queryClient.invalidateQueries({ queryKey: ['market-state', marketId] });
    }
  }, [stateChange, marketId, queryClient]);

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

          {/* Claim Winnings Button (if market is finalized and user has winning shares) */}
          <ClaimButton
            marketId={market.market_id}
            marketState={market.state}
            outcome={market.outcome ?? null}
            userYesShares={0} // TODO: Get from user position
            userNoShares={0}  // TODO: Get from user position
          />
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
