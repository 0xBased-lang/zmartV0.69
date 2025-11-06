import { supabase } from './client';
import type { Market, Position, Discussion } from '@/types/database';
import type { Market as MarketType, MarketFilters } from '@/types/market';
import { MarketState } from '@/types/market';

/**
 * Get markets with optional filtering and sorting
 */
export async function getMarkets(filters?: MarketFilters): Promise<MarketType[]> {
  let query = supabase.from('markets').select('*');

  // Filter by state if provided
  if (filters?.state !== undefined) {
    query = query.eq('state', filters.state);
  }

  // Sort based on option
  if (filters?.sortBy === 'newest') {
    query = query.order('created_at', { ascending: false });
  } else if (filters?.sortBy === 'volume') {
    query = query.order('total_volume', { ascending: false });
  } else if (filters?.sortBy === 'ending_soon') {
    query = query.order('expires_at', { ascending: true });
  } else {
    // Default: newest first
    query = query.order('created_at', { ascending: false });
  }

  const { data, error } = await query;

  if (error) {
    console.error('Failed to fetch markets:', error);
    throw error;
  }

  return data as MarketType[];
}

/**
 * Get all active markets
 * @deprecated Use getMarkets({ state: MarketState.ACTIVE }) instead
 */
export async function getActiveMarkets(): Promise<Market[]> {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('state', 2) // ACTIVE state
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch markets:', error);
    throw error;
  }

  return data as Market[];
}

/**
 * Get single market by ID
 * @param marketId - Market public key
 */
export async function getMarketById(marketId: string): Promise<MarketType | null> {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('market_id', marketId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Failed to fetch market:', error);
    throw error;
  }

  return data as MarketType;
}

/**
 * Get market by ID
 * @param marketId - Market public key
 */
export async function getMarket(marketId: string): Promise<Market> {
  const { data, error} = await supabase
    .from('markets')
    .select('*')
    .eq('market_id', marketId)
    .single();

  if (error) {
    console.error('Failed to fetch market:', error);
    throw error;
  }

  return data as Market;
}

/**
 * Get user's positions
 * @param wallet - User's wallet address
 */
export async function getUserPositions(wallet: string): Promise<Position[]> {
  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('wallet', wallet)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch positions:', error);
    throw error;
  }

  return data as Position[];
}

/**
 * Get discussions for a market
 * @param marketId - Market public key
 */
export async function getDiscussions(marketId: string): Promise<Discussion[]> {
  const { data, error } = await supabase
    .from('discussions')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch discussions:', error);
    throw error;
  }

  return data as Discussion[];
}
