'use client';

import { useQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { toFixedPoint } from '@/lib/lmsr';
import { getMarketById } from '@/lib/supabase/database';
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

  // Handle loading
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Handle error
  if (error || !market) {
    notFound();
  }

  // MOCK: Market state for LMSR calculations
  // TODO: Fetch actual on-chain state from Solana RPC
  const marketState = {
    qYes: toFixedPoint(100), // Mock: 100 YES shares outstanding
    qNo: toFixedPoint(100), // Mock: 100 NO shares outstanding
    liquidity: toFixedPoint(1000), // Mock: b = 1000 liquidity parameter
  };

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
