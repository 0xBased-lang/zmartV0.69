import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SupabaseClient } from "@supabase/supabase-js";
export { ProposalVoteAggregator, VoteAggregationResult } from "./proposal";
export { DisputeVoteAggregator, DisputeAggregationResult } from "./dispute";
/**
 * VoteAggregatorScheduler
 *
 * Manages cron scheduling for both proposal and dispute vote aggregators
 */
export declare class VoteAggregatorScheduler {
    private interval;
    private proposalAggregator;
    private disputeAggregator;
    private cronJob;
    constructor(program: Program, backendKeypair: any, supabase: SupabaseClient, globalConfigPda: PublicKey, interval?: string);
    /**
     * Start the cron scheduler
     */
    start(): void;
    /**
     * Stop the cron scheduler
     */
    stop(): void;
    /**
     * Get scheduler status
     */
    getStatus(): {
        isRunning: boolean;
        interval: string;
        proposalAggregator: {
            isRunning: boolean;
            approvalThreshold: number;
        };
        disputeAggregator: {
            isRunning: boolean;
            disputeThreshold: number;
        };
    };
    /**
     * Manually trigger aggregation (for testing or manual runs)
     */
    runNow(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map