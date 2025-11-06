import { supabase } from './client';
import type { Market, Position, Discussion } from '@/types/database';

/**
 * Get all active markets
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
