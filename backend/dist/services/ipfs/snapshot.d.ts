import { SupabaseClient } from "@supabase/supabase-js";
/**
 * Discussion snapshot structure (version 1.0)
 */
export interface DiscussionSnapshot {
    market_id: string;
    snapshot_date: string;
    snapshot_version: "1.0";
    discussions_count: number;
    discussions: Array<{
        id: string;
        user_wallet: string;
        content: string;
        created_at: string;
    }>;
}
/**
 * Snapshot result with IPFS CID
 */
export interface SnapshotResult {
    marketId: string;
    discussionsCount: number;
    ipfsCid: string;
    snapshotDate: string;
}
/**
 * IPFSSnapshotService
 *
 * Responsibilities:
 * 1. Poll Supabase for active markets
 * 2. Fetch discussions from past 24 hours
 * 3. Create immutable snapshot object
 * 4. Upload to IPFS (Infura gateway)
 * 5. Store CID in Supabase ipfs_anchors table
 * 6. Provide retrieval methods for snapshots
 */
export declare class IPFSSnapshotService {
    private supabase;
    private ipfs;
    private currentGatewayIndex;
    private isRunning;
    constructor(supabase: SupabaseClient);
    /**
     * Create IPFS client for a specific gateway
     */
    private createIPFSClient;
    /**
     * Switch to next available IPFS gateway
     * Returns true if switched successfully, false if no more gateways
     */
    private switchToNextGateway;
    /**
     * Reset to primary gateway
     */
    private resetToPrimaryGateway;
    /**
     * Start the snapshot service (called by scheduler)
     */
    run(): Promise<void>;
    /**
     * Get active markets that need snapshots
     */
    private getActiveMarkets;
    /**
     * Create and upload snapshot for a single market
     * Returns null if no discussions in past 24h
     */
    snapshotMarket(marketId: string): Promise<SnapshotResult | null>;
    /**
     * Get discussions from past 24 hours for a market
     */
    private getRecentDiscussions;
    /**
     * Create snapshot object with version 1.0 schema
     */
    private createSnapshot;
    /**
     * Upload snapshot to IPFS with retry logic and gateway fallback
     * Day 11: Enhanced with multi-gateway fallback
     * Returns CID string
     */
    private uploadToIPFS;
    /**
     * Store IPFS CID in Supabase ipfs_anchors table
     */
    private storeCID;
    /**
     * Prune old snapshots (>90 days)
     * Day 11: Automatic cleanup of old IPFS anchors
     * Returns number of pruned records
     */
    pruneOldSnapshots(): Promise<number>;
    /**
     * Retrieve snapshot from IPFS by CID
     * Day 11: Enhanced with gateway fallback
     */
    retrieveSnapshot(cid: string): Promise<DiscussionSnapshot>;
    /**
     * Get snapshot history for a market from Supabase
     */
    getSnapshotHistory(marketId: string, limit?: number): Promise<any[]>;
    /**
     * Test IPFS connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Get service status
     */
    getStatus(): {
        isRunning: boolean;
        ipfsGateway: string | undefined;
    };
}
//# sourceMappingURL=snapshot.d.ts.map