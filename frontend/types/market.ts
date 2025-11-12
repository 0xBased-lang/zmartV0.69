/**
 * Market state enum (matches Solana program)
 * From 06_STATE_MANAGEMENT.md - 7-state FSM
 * Updated: November 10, 2025 - Added Cancelled state
 */
export enum MarketState {
  PROPOSED = 0,
  APPROVED = 1,
  ACTIVE = 2,
  RESOLVING = 3,
  DISPUTED = 4,
  FINALIZED = 5,
  CANCELLED = 6,
}

/**
 * Market state display labels
 */
export const MARKET_STATE_LABELS: Record<MarketState, string> = {
  [MarketState.PROPOSED]: 'Proposed',
  [MarketState.APPROVED]: 'Approved',
  [MarketState.ACTIVE]: 'Active',
  [MarketState.RESOLVING]: 'Resolving',
  [MarketState.DISPUTED]: 'Disputed',
  [MarketState.FINALIZED]: 'Finalized',
  [MarketState.CANCELLED]: 'Cancelled',
};

/**
 * Market state colors for badges
 */
export const MARKET_STATE_COLORS: Record<MarketState, string> = {
  [MarketState.PROPOSED]: 'bg-yellow-100 text-yellow-800',
  [MarketState.APPROVED]: 'bg-blue-100 text-blue-800',
  [MarketState.ACTIVE]: 'bg-green-100 text-green-800',
  [MarketState.RESOLVING]: 'bg-orange-100 text-orange-800',
  [MarketState.DISPUTED]: 'bg-red-100 text-red-800',
  [MarketState.FINALIZED]: 'bg-gray-100 text-gray-800',
  [MarketState.CANCELLED]: 'bg-red-100 text-red-800 line-through',
};

/**
 * Market data from Supabase
 * Matches schema from 08_DATABASE_SCHEMA.md
 */
export interface Market {
  market_id: string;
  on_chain_address: string; // Base58-encoded PDA (Solana program account)
  title: string;
  description: string;
  state: MarketState;
  created_at: string;
  expires_at: string;
  q_yes: string; // BigInt as string
  q_no: string; // BigInt as string
  liquidity_parameter: string; // BigInt as string
  total_volume: string; // BigInt as string
  creator: string;
}

/**
 * Calculated market prices (for display)
 * Will use LMSR formula in Day 20, mock for now
 */
export interface MarketPrices {
  yesPrice: number; // 0-100 (percentage)
  noPrice: number; // 0-100 (percentage)
}

/**
 * Filter options for market list
 */
export interface MarketFilters {
  state?: MarketState;
  sortBy: 'newest' | 'volume' | 'ending_soon';
}
