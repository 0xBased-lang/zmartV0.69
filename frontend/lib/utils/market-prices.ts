/**
 * Market Price Utilities
 *
 * Convert market data to LMSR calculations for real-time pricing
 */

import { calculatePrices, type MarketState, type PriceResult } from '@/lib/lmsr';
import type { Market } from '@/types/market';

/**
 * Convert Market data to MarketState for LMSR calculation
 *
 * Converts string-based BigInt values from database to bigint type
 * required by LMSR calculator
 *
 * @param market - Market data from database/API
 * @returns MarketState for LMSR calculation
 */
export function marketToState(market: Market): MarketState {
  return {
    qYes: BigInt(market.q_yes),
    qNo: BigInt(market.q_no),
    liquidity: BigInt(market.liquidity_parameter),
  };
}

/**
 * Calculate real LMSR prices for a market
 *
 * Uses the exact LMSR formula from Rust program:
 * P(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 *
 * @param market - Market data
 * @returns Price result with YES and NO prices (0-100)
 */
export function calculateMarketPrices(market: Market): PriceResult {
  const marketState = marketToState(market);
  return calculatePrices(marketState);
}

/**
 * Format price as percentage string
 *
 * @param price - Price value (0-100)
 * @returns Formatted percentage (e.g., "52.3%")
 */
export function formatPricePercent(price: number): string {
  return `${price.toFixed(1)}%`;
}

/**
 * Get price color class based on value
 *
 * @param price - Price value (0-100)
 * @returns Tailwind color class
 */
export function getPriceColor(price: number): string {
  if (price >= 70) return 'text-trading-yes';
  if (price <= 30) return 'text-trading-no';
  return 'text-trading-neutral';
}
