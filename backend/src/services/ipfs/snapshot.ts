// ============================================================
// IPFS Discussion Snapshot Service
// ============================================================
// Purpose: Daily snapshots of market discussions to IPFS
// Pattern Prevention: #5 (Documentation Explosion) - Immutable audit trail
// Story: 2.3 (Day 10)

import { create, IPFSHTTPClient } from "ipfs-http-client";
import { SupabaseClient } from "@supabase/supabase-js";
import logger from "../../utils/logger";
import { retryWithBackoff } from "../../utils/retry";
import { config } from "../../config";

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
export class IPFSSnapshotService {
  private ipfs: IPFSHTTPClient;
  private isRunning: boolean = false;

  constructor(private supabase: SupabaseClient) {
    // Initialize IPFS client with Infura gateway
    this.ipfs = create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
      headers: {
        authorization: `Basic ${Buffer.from(
          `${config.ipfs.projectId}:${config.ipfs.projectSecret}`
        ).toString("base64")}`,
      },
    });

    logger.info("[IPFSSnapshotService] Initialized with Infura gateway");
  }

  /**
   * Start the snapshot service (called by scheduler)
   */
  async run(): Promise<void> {
    if (this.isRunning) {
      logger.warn("[IPFSSnapshotService] Already running, skipping...");
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info("[IPFSSnapshotService] Starting daily snapshot...");

      // Get active markets (ACTIVE, RESOLVING, DISPUTED)
      const markets = await this.getActiveMarkets();
      logger.info(`[IPFSSnapshotService] Found ${markets.length} active markets`);

      if (markets.length === 0) {
        logger.info("[IPFSSnapshotService] No markets to snapshot");
        return;
      }

      // Snapshot each market
      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;

      for (const market of markets) {
        try {
          const result = await this.snapshotMarket(market.id);

          if (result) {
            successCount++;
            logger.info(
              `[IPFSSnapshotService] Snapshot created for market ${market.id}: ` +
              `${result.discussionsCount} discussions → ${result.ipfsCid}`
            );
          } else {
            skipCount++;
            logger.debug(`[IPFSSnapshotService] Skipped market ${market.id} (no discussions)`);
          }
        } catch (error) {
          errorCount++;
          logger.error(
            `[IPFSSnapshotService] Error snapshotting market ${market.id}:`,
            error
          );
        }
      }

      const duration = Date.now() - startTime;
      logger.info(
        `[IPFSSnapshotService] Completed: ` +
        `${successCount} snapshots, ${skipCount} skipped, ` +
        `${errorCount} errors in ${duration}ms`
      );
    } catch (error) {
      logger.error("[IPFSSnapshotService] Fatal error:", error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Get active markets that need snapshots
   */
  private async getActiveMarkets(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("markets")
      .select("id, title, state, created_at")
      .in("state", ["ACTIVE", "RESOLVING", "DISPUTED"])
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active markets: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create and upload snapshot for a single market
   * Returns null if no discussions in past 24h
   */
  async snapshotMarket(marketId: string): Promise<SnapshotResult | null> {
    // 1. Get discussions from past 24 hours
    const discussions = await this.getRecentDiscussions(marketId);

    if (discussions.length === 0) {
      return null; // Skip markets with no discussions
    }

    // 2. Create snapshot object
    const snapshot = this.createSnapshot(marketId, discussions);

    // 3. Upload to IPFS with retry
    const ipfsCid = await this.uploadToIPFS(snapshot);

    // 4. Store CID in Supabase
    await this.storeCID(marketId, ipfsCid, discussions.length);

    return {
      marketId,
      discussionsCount: discussions.length,
      ipfsCid,
      snapshotDate: snapshot.snapshot_date,
    };
  }

  /**
   * Get discussions from past 24 hours for a market
   */
  private async getRecentDiscussions(marketId: string): Promise<any[]> {
    const yesterday = new Date(Date.now() - 86400000); // 24 hours ago

    const { data, error } = await this.supabase
      .from("discussions")
      .select("id, user_wallet, content, created_at")
      .eq("market_id", marketId)
      .gte("created_at", yesterday.toISOString())
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch discussions for market ${marketId}: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create snapshot object with version 1.0 schema
   */
  private createSnapshot(
    marketId: string,
    discussions: any[]
  ): DiscussionSnapshot {
    return {
      market_id: marketId,
      snapshot_date: new Date().toISOString(),
      snapshot_version: "1.0",
      discussions_count: discussions.length,
      discussions: discussions.map((d) => ({
        id: d.id,
        user_wallet: d.user_wallet,
        content: d.content,
        created_at: d.created_at,
      })),
    };
  }

  /**
   * Upload snapshot to IPFS with retry logic
   * Returns CID string
   */
  private async uploadToIPFS(snapshot: DiscussionSnapshot): Promise<string> {
    const snapshotJson = JSON.stringify(snapshot, null, 2);

    const cid = await retryWithBackoff(
      async () => {
        logger.debug(
          `[IPFSSnapshotService] Uploading snapshot for market ${snapshot.market_id} ` +
          `(${snapshot.discussions_count} discussions, ${snapshotJson.length} bytes)`
        );

        const result = await this.ipfs.add(snapshotJson);
        logger.debug(`[IPFSSnapshotService] Upload successful: ${result.cid.toString()}`);

        return result.cid.toString();
      },
      {
        maxAttempts: 3,
        initialDelay: 2000,
        maxDelay: 10000,
        backoffFactor: 2,
      }
    );

    return cid;
  }

  /**
   * Store IPFS CID in Supabase ipfs_anchors table
   */
  private async storeCID(
    marketId: string,
    ipfsCid: string,
    discussionsCount: number
  ): Promise<void> {
    const { error } = await this.supabase.from("ipfs_anchors").insert({
      market_id: marketId,
      ipfs_hash: ipfsCid,
      discussions_count: discussionsCount,
      created_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(
        `Failed to store CID for market ${marketId}: ${error.message}`
      );
    }

    logger.debug(`[IPFSSnapshotService] Stored CID ${ipfsCid} for market ${marketId}`);
  }

  /**
   * Retrieve snapshot from IPFS by CID
   */
  async retrieveSnapshot(cid: string): Promise<DiscussionSnapshot> {
    try {
      logger.debug(`[IPFSSnapshotService] Retrieving snapshot: ${cid}`);

      // Get data from IPFS
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.ipfs.cat(cid)) {
        chunks.push(chunk);
      }

      // Concatenate chunks and parse JSON
      const buffer = Buffer.concat(chunks);
      const snapshotJson = buffer.toString("utf-8");
      const snapshot = JSON.parse(snapshotJson) as DiscussionSnapshot;

      logger.debug(
        `[IPFSSnapshotService] Retrieved snapshot for market ${snapshot.market_id} ` +
        `(${snapshot.discussions_count} discussions)`
      );

      return snapshot;
    } catch (error) {
      logger.error(`[IPFSSnapshotService] Error retrieving snapshot ${cid}:`, error);
      throw new Error(`Failed to retrieve snapshot from IPFS: ${error}`);
    }
  }

  /**
   * Get snapshot history for a market from Supabase
   */
  async getSnapshotHistory(
    marketId: string,
    limit: number = 30
  ): Promise<any[]> {
    const { data, error } = await this.supabase
      .from("ipfs_anchors")
      .select("*")
      .eq("market_id", marketId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(
        `Failed to fetch snapshot history for market ${marketId}: ${error.message}`
      );
    }

    return data || [];
  }

  /**
   * Test IPFS connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testData = JSON.stringify({
        test: true,
        timestamp: new Date().toISOString(),
      });

      const result = await this.ipfs.add(testData);
      logger.info(`[IPFSSnapshotService] Connection test successful: ${result.cid.toString()}`);

      return true;
    } catch (error) {
      logger.error("[IPFSSnapshotService] Connection test failed:", error);
      return false;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    ipfsGateway: string;
  } {
    return {
      isRunning: this.isRunning,
      ipfsGateway: config.ipfs.gatewayUrl,
    };
  }
}
