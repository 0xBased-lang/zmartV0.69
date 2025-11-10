import { SupabaseClient } from "@supabase/supabase-js";
export { IPFSSnapshotService, DiscussionSnapshot, SnapshotResult } from "./snapshot";
/**
 * IPFSSnapshotScheduler
 *
 * Manages cron scheduling for IPFS snapshot service
 * Day 11: Added pruning job for 90-day cleanup
 */
export declare class IPFSSnapshotScheduler {
    private cronSchedule;
    private snapshotService;
    private snapshotCronJob;
    private pruningCronJob;
    constructor(supabase: SupabaseClient, cronSchedule?: string);
    /**
     * Start the cron scheduler
     * Day 11: Enhanced with pruning job
     */
    start(): void;
    /**
     * Stop the cron scheduler
     * Day 11: Updated to stop both jobs
     */
    stop(): void;
    /**
     * Get scheduler status
     * Day 11: Updated with pruning status
     */
    getStatus(): {
        isRunning: boolean;
        snapshotCronSchedule: string;
        pruningCronSchedule: string;
        snapshotService: {
            isRunning: boolean;
            ipfsGateway: string | undefined;
        };
    };
    /**
     * Manually trigger pruning (for testing or manual cleanup)
     * Day 11: New method
     */
    runPruningNow(): Promise<number>;
    /**
     * Manually trigger snapshot (for testing or manual runs)
     */
    runNow(): Promise<void>;
    /**
     * Test IPFS connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Get snapshot history for a market
     */
    getSnapshotHistory(marketId: string, limit?: number): Promise<any[]>;
    /**
     * Retrieve snapshot from IPFS
     */
    retrieveSnapshot(cid: string): Promise<any>;
}
//# sourceMappingURL=index.d.ts.map