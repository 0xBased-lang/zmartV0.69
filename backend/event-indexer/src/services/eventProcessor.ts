/**
 * Event Processor
 *
 * Processes parsed events and writes them to Supabase database.
 * Handles all 9 event types with idempotent inserts.
 */

import { getSupabase } from './supabaseClient';
import { logger } from '../utils/logger';
import {
  ProgramEvent,
  MarketCreatedEvent,
  TradeExecutedEvent,
  MarketResolvedEvent,
  DisputeRaisedEvent,
  DisputeResolvedEvent,
  VoteSubmittedEvent,
  ProposalApprovedEvent,
  WinningsClaimedEvent
} from '../types/events';

/**
 * Process a single event
 */
export async function processEvent(event: ProgramEvent): Promise<boolean> {
  try {
    logger.info('Processing event', {
      type: event.type,
      signature: event.txSignature,
      slot: event.slot
    });

    // Store raw event first (idempotent)
    await storeRawEvent(event);

    // Process based on event type
    switch (event.type) {
      case 'MarketCreated':
        await processMarketCreated(event);
        break;

      case 'TradeExecuted':
        await processTradeExecuted(event);
        break;

      case 'MarketResolved':
        await processMarketResolved(event);
        break;

      case 'DisputeRaised':
        await processDisputeRaised(event);
        break;

      case 'DisputeResolved':
        await processDisputeResolved(event);
        break;

      case 'VoteSubmitted':
        await processVoteSubmitted(event);
        break;

      case 'ProposalApproved':
        await processProposalApproved(event);
        break;

      case 'WinningsClaimed':
        await processWinningsClaimed(event);
        break;

      default:
        logger.warn('Unknown event type', { event });
        return false;
    }

    // Mark event as processed
    await markEventProcessed(event.txSignature, event.type);

    logger.info('Event processed successfully', {
      type: event.type,
      signature: event.txSignature
    });

    return true;

  } catch (error) {
    logger.error('Error processing event', {
      type: event.type,
      signature: event.txSignature,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Store error in events table
    await storeEventError(event.txSignature, event.type, error);

    return false;
  }
}

/**
 * Store raw event in events table (audit log)
 */
async function storeRawEvent(event: ProgramEvent): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('events')
    .upsert({
      event_type: event.type,
      tx_signature: event.txSignature,
      slot: event.slot,
      data: event,
      processed: false,
      timestamp: new Date(event.timestamp * 1000)
    }, {
      onConflict: 'tx_signature,event_type',
      ignoreDuplicates: true
    });

  if (error) {
    logger.error('Error storing raw event', { error: error.message });
    throw error;
  }
}

/**
 * Mark event as processed
 */
async function markEventProcessed(txSignature: string, eventType: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('events')
    .update({ processed: true })
    .eq('tx_signature', txSignature)
    .eq('event_type', eventType);

  if (error) {
    logger.error('Error marking event processed', { error: error.message });
  }
}

/**
 * Store event processing error
 */
async function storeEventError(
  txSignature: string,
  eventType: string,
  error: unknown
): Promise<void> {
  const supabase = getSupabase();

  const errorMessage = error instanceof Error ? error.message : String(error);

  await supabase
    .from('events')
    .update({ error: errorMessage })
    .eq('tx_signature', txSignature)
    .eq('event_type', eventType);
}

/**
 * Process MarketCreated event
 */
async function processMarketCreated(event: MarketCreatedEvent): Promise<void> {
  const supabase = getSupabase();

  // Ensure user exists
  await ensureUser(event.creator);

  // Insert market
  const { error } = await supabase
    .from('markets')
    .upsert({
      on_chain_address: event.marketPubkey,
      creator_wallet: event.creator,
      question: event.question,
      description: event.description,
      state: 'PROPOSED',
      initial_liquidity: event.liquidity,
      shares_yes: event.initialSharesYes,
      shares_no: event.initialSharesNo,
      created_at: new Date(event.timestamp * 1000)
    }, {
      onConflict: 'on_chain_address',
      ignoreDuplicates: true
    });

  if (error) {
    logger.error('Error inserting market', { error: error.message });
    throw error;
  }

  logger.info('Market created', {
    on_chain_address: event.marketPubkey,
    creator_wallet: event.creator,
    question: event.question
  });
}

/**
 * Process TradeExecuted event
 */
async function processTradeExecuted(event: TradeExecutedEvent): Promise<void> {
  const supabase = getSupabase();

  // Ensure user exists
  await ensureUser(event.trader);

  // Insert trade (map to schema column names)
  const { error: tradeError } = await supabase
    .from('trades')
    .upsert({
      id: event.txSignature, // Use tx_signature as primary key
      market_id: event.marketPubkey, // Will need to resolve to market.id later
      user_wallet: event.trader,
      trade_type: event.side.toLowerCase(), // 'BUY' -> 'buy', 'SELL' -> 'sell'
      outcome: event.outcome === 'YES', // Convert to boolean
      shares: event.shares,
      cost: event.cost,
      price_after: event.priceAfter,
      tx_signature: event.txSignature,
      block_time: new Date(event.timestamp * 1000),
      trader_pubkey: event.trader, // Add new column
      market_pubkey: event.marketPubkey // Add new column
    }, {
      onConflict: 'tx_signature',
      ignoreDuplicates: true
    });

  if (tradeError) {
    logger.error('Error inserting trade', { error: tradeError.message });
    throw tradeError;
  }

  // Update position
  await updatePosition(
    event.trader,
    event.marketPubkey,
    event.outcome,
    event.side,
    BigInt(event.shares),
    BigInt(event.cost)
  );

  // Update user stats
  await updateUserStats(event.trader, BigInt(event.cost));

  // Update market shares
  await updateMarketShares(
    event.marketPubkey,
    event.outcome,
    event.side,
    BigInt(event.shares)
  );

  logger.info('Trade executed', {
    trader: event.trader,
    market: event.marketPubkey,
    side: event.side,
    outcome: event.outcome,
    shares: event.shares
  });
}

/**
 * Process MarketResolved event
 */
async function processMarketResolved(event: MarketResolvedEvent): Promise<void> {
  const supabase = getSupabase();

  // Ensure user exists
  await ensureUser(event.resolver);

  // Update market state
  const { error: marketError } = await supabase
    .from('markets')
    .update({
      state: 'RESOLVING',
      proposed_outcome: event.outcome === 'YES' ? true : event.outcome === 'NO' ? false : null,
      resolver_wallet: event.resolver,
      resolution_proposed_at: new Date(event.resolvingAt * 1000)
    })
    .eq('on_chain_address', event.marketPubkey);

  if (marketError) {
    logger.error('Error updating market state', { error: marketError.message });
    throw marketError;
  }

  // Insert resolution record
  const { error: resolutionError } = await supabase
    .from('resolutions')
    .upsert({
      market_pubkey: event.marketPubkey,
      resolver: event.resolver,
      outcome: event.outcome,
      resolving_at: new Date(event.resolvingAt * 1000),
      dispute_deadline: new Date(event.disputeDeadline * 1000),
      disputed: false,
      finalized: false,
      timestamp: new Date(event.timestamp * 1000)
    }, {
      onConflict: 'market_pubkey',
      ignoreDuplicates: false
    });

  if (resolutionError) {
    logger.error('Error inserting resolution', { error: resolutionError.message });
    throw resolutionError;
  }

  logger.info('Market resolved', {
    market: event.marketPubkey,
    outcome: event.outcome,
    resolver: event.resolver
  });
}

/**
 * Process DisputeRaised event
 */
async function processDisputeRaised(event: DisputeRaisedEvent): Promise<void> {
  const supabase = getSupabase();

  // Ensure user exists
  await ensureUser(event.disputer);

  // Update market state
  const { error: marketError } = await supabase
    .from('markets')
    .update({ state: 'DISPUTED' })
    .eq('on_chain_address', event.marketPubkey);

  if (marketError) {
    logger.error('Error updating market to disputed', { error: marketError.message });
    throw marketError;
  }

  // Update resolution record
  const { error: resolutionError } = await supabase
    .from('resolutions')
    .update({ disputed: true })
    .eq('market_pubkey', event.marketPubkey);

  if (resolutionError) {
    logger.error('Error updating resolution', { error: resolutionError.message });
    throw resolutionError;
  }

  // Insert dispute record
  const { error: disputeError } = await supabase
    .from('disputes')
    .insert({
      market_pubkey: event.marketPubkey,
      disputer: event.disputer,
      resolved: false,
      created_at: new Date(event.timestamp * 1000)
    });

  if (disputeError) {
    logger.error('Error inserting dispute', { error: disputeError.message });
    throw disputeError;
  }

  logger.info('Dispute raised', {
    market: event.marketPubkey,
    disputer: event.disputer
  });
}

/**
 * Process DisputeResolved event
 */
async function processDisputeResolved(event: DisputeResolvedEvent): Promise<void> {
  const supabase = getSupabase();

  // Update market state
  const updateData: any = { state: 'FINALIZED' };
  if (event.outcomeChanged && event.newOutcome) {
    updateData.final_outcome = event.newOutcome === 'YES' ? true : event.newOutcome === 'NO' ? false : null;
  }

  const { error: marketError } = await supabase
    .from('markets')
    .update(updateData)
    .eq('on_chain_address', event.marketPubkey);

  if (marketError) {
    logger.error('Error finalizing market', { error: marketError.message });
    throw marketError;
  }

  // Update resolution record
  const { error: resolutionError } = await supabase
    .from('resolutions')
    .update({
      finalized: true,
      finalized_at: new Date(event.timestamp * 1000)
    })
    .eq('market_pubkey', event.marketPubkey);

  if (resolutionError) {
    logger.error('Error finalizing resolution', { error: resolutionError.message });
    throw resolutionError;
  }

  // Update dispute record
  const { error: disputeError } = await supabase
    .from('disputes')
    .update({
      resolved: true,
      outcome_changed: event.outcomeChanged,
      new_outcome: event.newOutcome,
      support_votes: event.supportVotes,
      reject_votes: event.rejectVotes,
      total_votes: event.supportVotes + event.rejectVotes,
      resolved_at: new Date(event.timestamp * 1000)
    })
    .eq('market_pubkey', event.marketPubkey)
    .eq('resolved', false);

  if (disputeError) {
    logger.error('Error resolving dispute', { error: disputeError.message });
    throw disputeError;
  }

  logger.info('Dispute resolved', {
    market: event.marketPubkey,
    outcomeChanged: event.outcomeChanged,
    newOutcome: event.newOutcome
  });
}

/**
 * Process VoteSubmitted event
 */
async function processVoteSubmitted(event: VoteSubmittedEvent): Promise<void> {
  const supabase = getSupabase();

  // For aggregated votes, we don't insert individual vote records
  // Just log for audit
  logger.info('Vote aggregation recorded', {
    voteType: event.voteType,
    proposalId: event.proposalId,
    marketPubkey: event.marketPubkey,
    weight: event.weight
  });
}

/**
 * Process ProposalApproved event
 */
async function processProposalApproved(event: ProposalApprovedEvent): Promise<void> {
  const supabase = getSupabase();

  // Update proposal status
  const { error } = await supabase
    .from('proposals')
    .update({
      status: 'APPROVED',
      likes: event.likes,
      dislikes: event.dislikes,
      total_votes: event.totalVotes,
      resolved_at: new Date(event.timestamp * 1000)
    })
    .eq('proposal_id', event.proposalId);

  if (error) {
    logger.error('Error updating proposal', { error: error.message });
    throw error;
  }

  logger.info('Proposal approved', {
    proposalId: event.proposalId,
    likes: event.likes,
    dislikes: event.dislikes
  });
}

/**
 * Process WinningsClaimed event
 */
async function processWinningsClaimed(event: WinningsClaimedEvent): Promise<void> {
  const supabase = getSupabase();

  // Ensure user exists
  await ensureUser(event.user);

  // Get market_id from on_chain_address
  const { data: marketData } = await supabase
    .from('markets')
    .select('id')
    .eq('on_chain_address', event.marketPubkey)
    .single();

  if (!marketData) {
    logger.error('Market not found for winnings claim', { marketPubkey: event.marketPubkey });
    throw new Error(`Market not found: ${event.marketPubkey}`);
  }

  // Update position (mark as claimed)
  const { error } = await supabase
    .from('positions')
    .update({
      has_claimed: true,
      claimed_amount: event.amount,
      shares_yes: '0',
      shares_no: '0'
    })
    .eq('user_wallet', event.user)
    .eq('market_id', marketData.id);

  if (error) {
    logger.error('Error updating position claimed', { error: error.message });
    throw error;
  }

  logger.info('Winnings claimed', {
    user: event.user,
    market: event.marketPubkey,
    amount: event.amount
  });
}

/**
 * Helper: Ensure user exists in database
 */
async function ensureUser(walletAddress: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('users')
    .upsert({
      wallet: walletAddress
    }, {
      onConflict: 'wallet',
      ignoreDuplicates: true
    });

  if (error) {
    logger.error('Error ensuring user exists', { error: error.message, wallet: walletAddress });
    throw error;
  }
}

/**
 * Helper: Update user position
 */
async function updatePosition(
  userPubkey: string,
  marketPubkey: string,
  outcome: string,
  side: string,
  shares: bigint,
  cost: bigint
): Promise<void> {
  const supabase = getSupabase();

  // First, get market_id from on_chain_address
  const { data: marketData } = await supabase
    .from('markets')
    .select('id')
    .eq('on_chain_address', marketPubkey)
    .single();

  if (!marketData) {
    logger.error('Market not found', { marketPubkey });
    throw new Error(`Market not found: ${marketPubkey}`);
  }

  const marketId = marketData.id;

  // Get current position
  const { data: existing } = await supabase
    .from('positions')
    .select('*')
    .eq('user_wallet', userPubkey)
    .eq('market_id', marketId)
    .single();

  const currentSharesYes = BigInt(existing?.shares_yes || 0);
  const currentSharesNo = BigInt(existing?.shares_no || 0);
  const currentInvested = BigInt(existing?.total_invested || existing?.invested || 0);

  // Calculate new values
  let newSharesYes = currentSharesYes;
  let newSharesNo = currentSharesNo;
  let newInvested = currentInvested;

  if (side === 'BUY') {
    if (outcome === 'YES') {
      newSharesYes += shares;
    } else {
      newSharesNo += shares;
    }
    newInvested += cost;
  } else {
    if (outcome === 'YES') {
      newSharesYes -= shares;
    } else {
      newSharesNo -= shares;
    }
    newInvested -= cost;
  }

  // Upsert position
  const { error } = await supabase
    .from('positions')
    .upsert({
      market_id: marketId,
      user_wallet: userPubkey,
      user_pubkey: userPubkey, // New column from migration
      market_pubkey: marketPubkey, // New column from migration
      shares_yes: newSharesYes.toString(),
      shares_no: newSharesNo.toString(),
      total_invested: newInvested.toString(),
      invested: newInvested.toString() // New column from migration
    }, {
      onConflict: 'market_id,user_wallet'
    });

  if (error) {
    logger.error('Error updating position', { error: error.message });
    throw error;
  }
}

/**
 * Helper: Update user trading stats
 */
async function updateUserStats(userPubkey: string, volume: bigint): Promise<void> {
  const supabase = getSupabase();

  const { data: user } = await supabase
    .from('users')
    .select('total_trades, total_volume')
    .eq('wallet', userPubkey)
    .single();

  const newTotalTrades = (user?.total_trades || 0) + 1;
  const newTotalVolume = BigInt(user?.total_volume || 0) + volume;

  const { error } = await supabase
    .from('users')
    .update({
      total_trades: newTotalTrades,
      total_volume: newTotalVolume.toString()
    })
    .eq('wallet', userPubkey);

  if (error) {
    logger.error('Error updating user stats', { error: error.message });
    throw error;
  }
}

/**
 * Helper: Update market share counts
 */
async function updateMarketShares(
  marketPubkey: string,
  outcome: string,
  side: string,
  shares: bigint
): Promise<void> {
  const supabase = getSupabase();

  const { data: market } = await supabase
    .from('markets')
    .select('shares_yes, shares_no')
    .eq('on_chain_address', marketPubkey)
    .single();

  let newSharesYes = BigInt(market?.shares_yes || 0);
  let newSharesNo = BigInt(market?.shares_no || 0);

  if (side === 'BUY') {
    if (outcome === 'YES') {
      newSharesYes += shares;
    } else {
      newSharesNo += shares;
    }
  } else {
    if (outcome === 'YES') {
      newSharesYes -= shares;
    } else {
      newSharesNo -= shares;
    }
  }

  const { error } = await supabase
    .from('markets')
    .update({
      shares_yes: newSharesYes.toString(),
      shares_no: newSharesNo.toString()
    })
    .eq('on_chain_address', marketPubkey);

  if (error) {
    logger.error('Error updating market shares', { error: error.message });
    throw error;
  }
}
