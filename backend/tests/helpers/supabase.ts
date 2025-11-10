/**
 * Supabase Helper - Database Utilities for Testing
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Create Supabase client for tests
 */
export function createTestSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role for tests

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not found in environment');
  }

  return createClient(supabaseUrl, supabaseKey);
}

/**
 * Clean up test data from database
 */
export async function cleanupTestData(supabase: SupabaseClient): Promise<void> {
  // Delete in reverse dependency order
  await supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('proposal_votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('dispute_votes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('user_positions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('markets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('users').delete().neq('wallet', '11111111111111111111111111111111');

  console.log('✅ Test data cleaned from database');
}

/**
 * Verify market exists in database
 */
export async function verifyMarketInDatabase(
  supabase: SupabaseClient,
  marketId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('markets')
    .select('id')
    .eq('id', marketId)
    .single();

  if (error) {
    console.error('Error verifying market:', error);
    return false;
  }

  return !!data;
}

/**
 * Get market from database
 */
export async function getMarketFromDatabase(
  supabase: SupabaseClient,
  marketId: string
): Promise<any> {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (error) {
    throw new Error(`Failed to get market: ${error.message}`);
  }

  return data;
}

/**
 * Get all trades for a market
 */
export async function getMarketTrades(
  supabase: SupabaseClient,
  marketId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('market_id', marketId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to get trades: ${error.message}`);
  }

  return data || [];
}

/**
 * Get user position from database
 */
export async function getUserPosition(
  supabase: SupabaseClient,
  marketId: string,
  userWallet: string
): Promise<any> {
  const { data, error } = await supabase
    .from('user_positions')
    .select('*')
    .eq('market_id', marketId)
    .eq('user_wallet', userWallet)
    .single();

  if (error && error.code !== 'PGRST116') { // Not found is ok
    throw new Error(`Failed to get user position: ${error.message}`);
  }

  return data;
}

/**
 * Ensure user record exists in database (upsert)
 * CRITICAL: This prevents FK constraint violations when creating votes
 */
export async function ensureTestUserExists(
  supabase: SupabaseClient,
  wallet: string,
  displayName?: string
): Promise<any> {
  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        wallet,
        display_name: displayName || `Test User ${wallet.substring(0, 8)}`,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'wallet',
        ignoreDuplicates: false,
      }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to ensure user exists: ${error.message}`);
  }

  return data;
}

/**
 * Seed test data into database
 * CRITICAL: Provides consistent test fixtures for integration tests
 */
export async function seedTestData(
  supabase: SupabaseClient,
  options: {
    markets?: number;
    users?: number;
    votes?: number;
    trades?: number;
  } = {}
): Promise<{
  markets: any[];
  users: any[];
  votes: any[];
  trades: any[];
}> {
  const defaults = {
    markets: options.markets || 1,
    users: options.users || 3,
    votes: options.votes || 5,
    trades: options.trades || 10,
  };

  // Create test users
  const users: any[] = [];
  for (let i = 0; i < defaults.users; i++) {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          wallet: `test_wallet_${Date.now()}_${i}`,
          display_name: `Test User ${i}`,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'wallet',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) {
      console.warn(`Failed to create test user ${i}: ${error.message}`);
    } else {
      users.push(data);
    }
  }

  // Create test markets
  const markets: any[] = [];
  for (let i = 0; i < defaults.markets; i++) {
    const { data, error } = await supabase
      .from('markets')
      .insert({
        id: `test_market_${Date.now()}_${i}`,
        on_chain_address: `test_onchain_${Date.now()}_${i}`,
        question: `Test Market ${i}: Will this test pass?`,
        description: `Integration test market #${i}`,
        category: 'test',
        state: 'PROPOSED',
        creator_wallet: users[0]?.wallet || 'test_creator',
        liquidity_parameter: '1000000000',
        yes_shares: '0',
        no_shares: '0',
        end_date: new Date(Date.now() + 86400000).toISOString(), // +24h
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn(`Failed to create test market ${i}: ${error.message}`);
    } else {
      markets.push(data);
    }
  }

  return {
    markets,
    users,
    votes: [],
    trades: [],
  };
}

/**
 * Verify database consistency
 * CRITICAL: Detects orphaned records, missing foreign keys, data corruption
 */
export async function verifyDatabaseConsistency(
  supabase: SupabaseClient,
  marketId: string
): Promise<{
  consistent: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  // 1. Check if market exists
  const { data: market, error: marketError } = await supabase
    .from('markets')
    .select('*')
    .eq('id', marketId)
    .single();

  if (marketError || !market) {
    issues.push(`Market not found: ${marketId} - ${marketError?.message}`);
    return { consistent: false, issues };
  }

  // 2. Check creator exists in users table
  const { data: creator, error: creatorError } = await supabase
    .from('users')
    .select('wallet')
    .eq('wallet', market.creator_wallet)
    .single();

  if (creatorError || !creator) {
    issues.push(
      `Creator user not found: ${market.creator_wallet} - ${creatorError?.message}`
    );
  }

  // 3. Check all votes reference valid users
  const { data: votes, error: votesError } = await supabase
    .from('proposal_votes')
    .select('user_wallet')
    .eq('market_id', marketId);

  if (votesError) {
    issues.push(`Failed to fetch votes: ${votesError.message}`);
  } else if (votes) {
    for (const vote of votes) {
      const { data: voter, error: voterError } = await supabase
        .from('users')
        .select('wallet')
        .eq('wallet', vote.user_wallet)
        .single();

      if (voterError || !voter) {
        issues.push(
          `Orphaned vote: user ${vote.user_wallet} does not exist - ${voterError?.message}`
        );
      }
    }
  }

  // 4. Check all trades reference valid users
  const { data: trades, error: tradesError } = await supabase
    .from('trades')
    .select('user_wallet')
    .eq('market_id', marketId);

  if (tradesError) {
    issues.push(`Failed to fetch trades: ${tradesError.message}`);
  } else if (trades) {
    for (const trade of trades) {
      const { data: trader, error: traderError } = await supabase
        .from('users')
        .select('wallet')
        .eq('wallet', trade.user_wallet)
        .single();

      if (traderError || !trader) {
        issues.push(
          `Orphaned trade: user ${trade.user_wallet} does not exist - ${traderError?.message}`
        );
      }
    }
  }

  // 5. Check state is valid
  const validStates = [
    'PROPOSED',
    'APPROVED',
    'ACTIVE',
    'RESOLVING',
    'DISPUTED',
    'FINALIZED',
  ];
  if (!validStates.includes(market.state)) {
    issues.push(`Invalid market state: ${market.state}`);
  }

  return {
    consistent: issues.length === 0,
    issues,
  };
}
