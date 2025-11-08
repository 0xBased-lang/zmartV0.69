import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SupabaseClient } from "@supabase/supabase-js";
/**
 * Dispute vote aggregation result for a single market
 */
export interface DisputeAggregationResult {
    marketId: string;
    marketPda: string;
    agreeVotes: number;
    disagreeVotes: number;
    totalVotes: number;
    agreeRate: number;
    disputeSucceeded: boolean;
}
/**
 * DisputeVoteAggregator Service
 *
 * Responsibilities:
 * 1. Poll Supabase for markets in DISPUTED state
 * 2. Aggregate votes (agree/disagree) from dispute_votes table
 * 3. Calculate agree rate (agree / total_votes)
 * 4. If >= 60%, dispute succeeded → overturn original resolution
 * 5. Call finalize_market on-chain with dispute vote counts
 * 6. Update Supabase market state to FINALIZED
 */
export declare class DisputeVoteAggregator {
    private program;
    private backendKeypair;
    private supabase;
    private globalConfigPda;
    private isRunning;
    private disputeThreshold;
    constructor(program: Program, backendKeypair: any, // Keypair from @solana/web3.js
    supabase: SupabaseClient, globalConfigPda: PublicKey, disputeThreshold?: number);
    /**
     * Start the aggregation service
     * Called by scheduler (cron job)
     */
    run(): Promise<void>;
    /**
     * Get all markets in DISPUTED state from Supabase
     */
    private getDisputedMarkets;
    /**
     * Process a single disputed market:
     * 1. Check if dispute period ended (3 days from resolution_proposed_at)
     * 2. Aggregate votes
     * 3. Determine if dispute succeeded (>= 60%)
     * 4. Call on-chain finalize_market
     * 5. Update Supabase
     */
    private processMarket;
    /**
     * Aggregate dispute votes for a market from dispute_votes table
     */
    aggregateVotes(marketId: string): Promise<DisputeAggregationResult>;
    /**
     * Call on-chain finalize_market instruction with retry logic
     */
    private finalizeMarketOnChain;
    /**
     * Update market state in Supabase after on-chain finalization
     */
    private updateMarketState;
    /**
     * Get service status
     */
    getStatus(): {
        isRunning: boolean;
        disputeThreshold: number;
    };
}
//# sourceMappingURL=dispute.d.ts.map