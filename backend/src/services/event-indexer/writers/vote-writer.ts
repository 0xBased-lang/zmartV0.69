// ============================================================
// Vote Event Writer
// ============================================================
// Purpose: Write voting events to Supabase database
// Story: Week 1, Days 3-7 - Event Indexer Implementation
//
// Handles:
// - ProposalVoteSubmitted → INSERT proposal_votes table
// - DisputeVoteSubmitted → INSERT dispute_votes table
//
// Deduplication:
// - Unique constraint: (market_address, voter_address, vote_type)
// - ON CONFLICT DO NOTHING to prevent double-counting
//
// Architecture:
// Solana Event → Event Parser → Vote Writer → Supabase
//
// ============================================================

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import {
  ProposalVoteSubmittedEvent,
  DisputeVoteSubmittedEvent,
  WriteResult,
} from '../types/events';

export class VoteEventWriter {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}

  /**
   * Write ProposalVoteSubmitted event to database
   *
   * Flow:
   * 1. INSERT into proposal_votes table
   * 2. Deduplication: ON CONFLICT (market_address, voter_address) DO NOTHING
   * 3. Record in indexed_events table for tracking
   *
   * @param event - ProposalVoteSubmitted event data
   * @param txSignature - Transaction signature for deduplication
   * @param slot - Block slot for ordering
   * @param timestamp - Block timestamp
   */
  async writeProposalVote(
    event: ProposalVoteSubmittedEvent
  ): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      // 1. Insert proposal vote (with deduplication)
      const { error: voteError } = await this.supabase
        .from('proposal_votes')
        .insert({
          market_address: event.marketAddress,
          voter_address: event.voter,
          vote: event.vote, // 'like' | 'dislike'
          weight: event.weight,
          voted_at: new Date(event.timestamp * 1000).toISOString(),
          tx_signature: event.txSignature,
          slot: event.slot,
        })
        // Deduplication: unique constraint on (market_address, voter_address)
        // If user already voted, do nothing (first vote counts)
        .select()
        .single();

      if (voteError) {
        // Check if error is due to unique constraint violation
        if (voteError.code === '23505') {
          this.logger.debug(`Duplicate proposal vote ignored: ${event.voter} already voted on ${event.marketAddress}`);
          return {
            success: true,
            eventType: 'ProposalVoteSubmitted',
            txSignature: event.txSignature,
            processingTime: Date.now() - startTime,
          };
        } else {
          throw voteError;
        }
      }

      this.logger.info(`ProposalVoteSubmitted indexed: ${event.voter} voted ${event.vote} on ${event.marketAddress}`);

      return {
        success: true,
        eventType: 'ProposalVoteSubmitted',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Failed to write ProposalVoteSubmitted event:', error);
      return {
        success: false,
        eventType: 'ProposalVoteSubmitted',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Write DisputeVoteSubmitted event to database
   *
   * Flow:
   * 1. INSERT into dispute_votes table
   * 2. Deduplication: ON CONFLICT (market_address, voter_address, dispute_round) DO NOTHING
   * 3. Record in indexed_events table for tracking
   *
   * @param event - DisputeVoteSubmitted event data
   * @param txSignature - Transaction signature for deduplication
   * @param slot - Block slot for ordering
   * @param timestamp - Block timestamp
   */
  async writeDisputeVote(
    event: DisputeVoteSubmittedEvent
  ): Promise<WriteResult> {
    const startTime = Date.now();
    try {
      // 1. Insert dispute vote (with deduplication)
      const { error: voteError } = await this.supabase
        .from('dispute_votes')
        .insert({
          market_address: event.marketAddress,
          voter_address: event.voter,
          vote: event.vote, // 'upholdResolution' | 'overturnResolution'
          weight: event.weight,
          dispute_round: event.disputeRound,
          voted_at: new Date(event.timestamp * 1000).toISOString(),
          tx_signature: event.txSignature,
          slot: event.slot,
        })
        // Deduplication: unique constraint on (market_address, voter_address, dispute_round)
        // Users can vote once per dispute round
        .select()
        .single();

      if (voteError) {
        // Check if error is due to unique constraint violation
        if (voteError.code === '23505') {
          this.logger.debug(`Duplicate dispute vote ignored: ${event.voter} already voted on dispute round ${event.disputeRound}`);
          return {
            success: true,
            eventType: 'DisputeVoteSubmitted',
            txSignature: event.txSignature,
            processingTime: Date.now() - startTime,
          };
        } else {
          throw voteError;
        }
      }

      this.logger.info(`DisputeVoteSubmitted indexed: ${event.voter} voted ${event.vote} on dispute round ${event.disputeRound}`);

      return {
        success: true,
        eventType: 'DisputeVoteSubmitted',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Failed to write DisputeVoteSubmitted event:', error);
      return {
        success: false,
        eventType: 'DisputeVoteSubmitted',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Batch write proposal votes (for historical backfill)
   *
   * @param votes - Array of proposal votes with metadata
   */
  async batchWriteProposalVotes(
    votes: Array<{
      event: ProposalVoteSubmittedEvent;
      txSignature: string;
      slot: number;
      timestamp: Date;
    }>
  ): Promise<void> {
    console.log(`🔄 Batch writing ${votes.length} proposal votes...`);

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const vote of votes) {
      try {
        await this.writeProposalVote(vote.event);
        successCount++;
      } catch (error: any) {
        if (error.message.includes('Duplicate')) {
          duplicateCount++;
        } else {
          errorCount++;
          console.error(`Failed to write vote ${vote.txSignature}:`, error);
        }
      }
    }

    console.log(`✅ Batch write complete: ${successCount} written, ${duplicateCount} duplicates, ${errorCount} errors`);
  }

  /**
   * Batch write dispute votes (for historical backfill)
   *
   * @param votes - Array of dispute votes with metadata
   */
  async batchWriteDisputeVotes(
    votes: Array<{
      event: DisputeVoteSubmittedEvent;
      txSignature: string;
      slot: number;
      timestamp: Date;
    }>
  ): Promise<void> {
    console.log(`🔄 Batch writing ${votes.length} dispute votes...`);

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    for (const vote of votes) {
      try {
        await this.writeDisputeVote(vote.event);
        successCount++;
      } catch (error: any) {
        if (error.message.includes('Duplicate')) {
          duplicateCount++;
        } else {
          errorCount++;
          console.error(`Failed to write vote ${vote.txSignature}:`, error);
        }
      }
    }

    console.log(`✅ Batch write complete: ${successCount} written, ${duplicateCount} duplicates, ${errorCount} errors`);
  }

  /**
   * Helper: Record event in indexed_events table for tracking
   *
   * @param record - Event record to store
   */
  private async recordEvent(record: any): Promise<void> {
    const { error } = await this.supabase
      .from('indexed_events')
      .insert({
        tx_signature: record.tx_signature,
        event_type: record.event_type,
        event_data: record.event_data as any, // JSONB column
        slot: record.slot,
        timestamp: record.timestamp.toISOString(),
        market_address: record.market_address,
        processed_at: new Date().toISOString(),
      });

    if (error) {
      // Duplicate tx_signature is expected (same transaction can have multiple events)
      if (error.code !== '23505') {
        console.error('Failed to record event in indexed_events:', error);
      }
    }
  }

  /**
   * Get vote statistics for a market
   *
   * @param marketAddress - Market public key
   * @returns Vote statistics (proposal + dispute)
   */
  async getVoteStats(marketAddress: string): Promise<{
    proposalVotes: {
      totalVotes: number;
      likeVotes: number;
      dislikeVotes: number;
      approvalRate: number;
    };
    disputeVotes: {
      totalVotes: number;
      upholdVotes: number;
      overturnVotes: number;
      upholdRate: number;
    };
  }> {
    // Get proposal vote counts
    const { data: proposalData, error: proposalError } = await this.supabase
      .from('proposal_votes')
      .select('vote, weight')
      .eq('market_address', marketAddress);

    if (proposalError) {
      throw new Error(`Failed to get proposal votes: ${proposalError.message}`);
    }

    const proposalVotes = proposalData || [];
    const likeVotes = proposalVotes
      .filter((v) => v.vote === 'like')
      .reduce((sum, v) => sum + v.weight, 0);
    const dislikeVotes = proposalVotes
      .filter((v) => v.vote === 'dislike')
      .reduce((sum, v) => sum + v.weight, 0);
    const totalProposalVotes = likeVotes + dislikeVotes;
    const approvalRate = totalProposalVotes > 0 ? (likeVotes / totalProposalVotes) * 100 : 0;

    // Get dispute vote counts
    const { data: disputeData, error: disputeError } = await this.supabase
      .from('dispute_votes')
      .select('vote, weight')
      .eq('market_address', marketAddress);

    if (disputeError) {
      throw new Error(`Failed to get dispute votes: ${disputeError.message}`);
    }

    const disputeVotes = disputeData || [];
    const upholdVotes = disputeVotes
      .filter((v) => v.vote === 'upholdResolution')
      .reduce((sum, v) => sum + v.weight, 0);
    const overturnVotes = disputeVotes
      .filter((v) => v.vote === 'overturnResolution')
      .reduce((sum, v) => sum + v.weight, 0);
    const totalDisputeVotes = upholdVotes + overturnVotes;
    const upholdRate = totalDisputeVotes > 0 ? (upholdVotes / totalDisputeVotes) * 100 : 0;

    return {
      proposalVotes: {
        totalVotes: proposalVotes.length,
        likeVotes,
        dislikeVotes,
        approvalRate,
      },
      disputeVotes: {
        totalVotes: disputeVotes.length,
        upholdVotes,
        overturnVotes,
        upholdRate,
      },
    };
  }
}

// ============================================================
// Usage Example
// ============================================================
/*
import { createClient } from '@supabase/supabase-js';
import { VoteEventWriter } from './vote-writer';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const voteWriter = new VoteEventWriter(supabase);

// Write single vote
await voteWriter.writeProposalVote(
  {
    marketAddress: 'Market123...',
    voter: 'Voter456...',
    vote: 'like',
    weight: 1,
  },
  'tx_signature_789',
  123456789,
  new Date()
);

// Batch write for historical backfill
await voteWriter.batchWriteProposalVotes([
  {
    event: { marketAddress: '...', voter: '...', vote: 'like', weight: 1 },
    txSignature: 'tx1',
    slot: 100,
    timestamp: new Date(),
  },
  // ... more votes
]);

// Get vote statistics
const stats = await voteWriter.getVoteStats('Market123...');
console.log(`Approval Rate: ${stats.proposalVotes.approvalRate}%`);
*/
