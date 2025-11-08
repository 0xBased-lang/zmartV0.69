import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SupabaseClient } from "@supabase/supabase-js";
/**
 * Vote aggregation result for a single market
 */
export interface VoteAggregationResult {
    marketId: string;
    marketPda: string;
    likes: number;
    dislikes: number;
    totalVotes: number;
    approvalRate: number;
    meetsThreshold: boolean;
}
/**
 * ProposalVoteAggregator Service
 *
 * Responsibilities:
 * 1. Poll Supabase for markets in PROPOSED state
 * 2. Aggregate votes (likes/dislikes) from proposal_votes table
 * 3. Calculate approval rate (likes / total_votes)
 * 4. If >= 70%, call approve_market on-chain
 * 5. Update Supabase market state to APPROVED
 */
export declare class ProposalVoteAggregator {
    private program;
    private backendKeypair;
    private supabase;
    private globalConfigPda;
    private isRunning;
    private approvalThreshold;
    constructor(program: Program, backendKeypair: any, // Keypair from @solana/web3.js
    supabase: SupabaseClient, globalConfigPda: PublicKey, approvalThreshold?: number);
    /**
     * Start the aggregation service
     * Called by scheduler (cron job)
     */
    run(): Promise<void>;
    /**
     * Get all markets in PROPOSED state from Supabase
     */
    private getProposedMarkets;
    /**
     * Process a single market:
     * 1. Aggregate votes
     * 2. Check threshold
     * 3. Call on-chain if threshold met
     * 4. Update Supabase
     */
    private processMarket;
    /**
     * Aggregate votes for a market from proposal_votes table
     */
    aggregateVotes(marketId: string): Promise<VoteAggregationResult>;
    /**
     * Call on-chain approve_market instruction with retry logic
     */
    private approveMarketOnChain;
    /**
     * Update market state in Supabase after on-chain approval
     */
    private updateMarketState;
    /**
     * Get service status
     */
    getStatus(): {
        isRunning: boolean;
        approvalThreshold: number;
    };
}
//# sourceMappingURL=proposal.d.ts.map