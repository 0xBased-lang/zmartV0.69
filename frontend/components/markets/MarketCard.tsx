'use client';

import Link from 'next/link';
import type { Market } from '@/types/market';
import { StateBadge } from './StateBadge';
import { PriceDisplay } from './PriceDisplay';
import { formatDistanceToNow } from 'date-fns';

interface MarketCardProps {
  market: Market;
}

/**
 * Calculate mock prices for now (will be replaced with real LMSR calculation)
 * For MVP, use simple randomness based on market_id hash
 *
 * TODO: Implement real LMSR price calculation in Day 20
 * Formula: P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 */
function calculateMockPrices(market: Market): {
  yesPrice: number;
  noPrice: number;
} {
  // Create variation based on market_id hash
  const hash = market.market_id
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const yesPrice = 40 + (hash % 20); // Range: 40-60%
  const noPrice = 100 - yesPrice;

  return { yesPrice, noPrice };
}

/**
 * Format volume from BigInt string to human-readable
 * Converts from lamports (1e-9 SOL) to SOL and formats with K/M suffixes
 */
function formatVolume(volumeStr: string): string {
  try {
    const volume = parseInt(volumeStr) / 1e9; // Convert lamports to SOL

    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(1)}K`;
    } else if (volume >= 1) {
      return `$${volume.toFixed(0)}`;
    } else {
      return `$${volume.toFixed(2)}`;
    }
  } catch {
    return '$0';
  }
}

/**
 * Individual market card component
 * Displays market information and links to detail page
 */
export function MarketCard({ market }: MarketCardProps) {
  const { yesPrice, noPrice } = calculateMockPrices(market);
  const volume = formatVolume(market.total_volume);

  const expiresAt = new Date(market.expires_at);
  const hasExpired = expiresAt < new Date();
  const expiryText = hasExpired
    ? `Expired ${formatDistanceToNow(expiresAt, { addSuffix: true })}`
    : `Ends ${formatDistanceToNow(expiresAt, { addSuffix: true })}`;

  return (
    <Link href={`/markets/${market.market_id}`}>
      <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg hover:border-primary/50 transition-all cursor-pointer group h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 flex-1">
            {market.title}
          </h3>
          <StateBadge state={market.state} className="ml-3 flex-shrink-0" />
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-grow">
          {market.description}
        </p>

        {/* Prices */}
        <PriceDisplay yesPrice={yesPrice} noPrice={noPrice} className="mb-4" />

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <span className="font-medium">Volume:</span> {volume}
            </div>
            <div>
              <span className={hasExpired ? 'text-red-600 font-medium' : ''}>
                {expiryText}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
