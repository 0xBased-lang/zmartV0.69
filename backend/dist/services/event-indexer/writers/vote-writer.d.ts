import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { ProposalVoteSubmittedEvent, DisputeVoteSubmittedEvent, WriteResult } from '../types/events';
export declare class VoteEventWriter {
    private supabase;
    private logger;
    constructor(supabase: SupabaseClient, logger: Logger);
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
    writeProposalVote(event: ProposalVoteSubmittedEvent): Promise<WriteResult>;
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
    writeDisputeVote(event: DisputeVoteSubmittedEvent): Promise<WriteResult>;
    /**
     * Batch write proposal votes (for historical backfill)
     *
     * @param votes - Array of proposal votes with metadata
     */
    batchWriteProposalVotes(votes: Array<{
        event: ProposalVoteSubmittedEvent;
        txSignature: string;
        slot: number;
        timestamp: Date;
    }>): Promise<void>;
    /**
     * Batch write dispute votes (for historical backfill)
     *
     * @param votes - Array of dispute votes with metadata
     */
    batchWriteDisputeVotes(votes: Array<{
        event: DisputeVoteSubmittedEvent;
        txSignature: string;
        slot: number;
        timestamp: Date;
    }>): Promise<void>;
    /**
     * Helper: Record event in indexed_events table for tracking
     *
     * @param record - Event record to store
     */
    private recordEvent;
    /**
     * Get vote statistics for a market
     *
     * @param marketAddress - Market public key
     * @returns Vote statistics (proposal + dispute)
     */
    getVoteStats(marketAddress: string): Promise<{
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
    }>;
}
//# sourceMappingURL=vote-writer.d.ts.map