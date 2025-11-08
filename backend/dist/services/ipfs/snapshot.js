"use strict";
// ============================================================
// IPFS Discussion Snapshot Service
// ============================================================
// Purpose: Daily snapshots of market discussions to IPFS
// Pattern Prevention: #5 (Documentation Explosion) - Immutable audit trail
// Story: 2.3 (Days 10-11)
// Day 10: Snapshot creation and upload
// Day 11: Gateway fallbacks, pruning, enhanced retrieval
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSSnapshotService = void 0;
const ipfs_http_client_1 = require("ipfs-http-client");
const logger_1 = __importDefault(require("../../utils/logger"));
const retry_1 = require("../../utils/retry");
const config_1 = require("../../config");
/**
 * Multiple IPFS gateways with fallback support
 */
const IPFS_GATEWAYS = [
    // Primary: Infura (authenticated)
    {
        name: "Infura",
        host: "ipfs.infura.io",
        port: 5001,
        protocol: "https",
        headers: {
            authorization: `Basic ${Buffer.from(`${config_1.config.ipfs.projectId}:${config_1.config.ipfs.projectSecret}`).toString("base64")}`,
        },
        isPublic: false,
    },
    // Fallback 1: Cloudflare (public)
    {
        name: "Cloudflare",
        host: "cloudflare-ipfs.com",
        port: 443,
        protocol: "https",
        isPublic: true,
    },
    // Fallback 2: IPFS.io (public)
    {
        name: "IPFS.io",
        host: "ipfs.io",
        port: 443,
        protocol: "https",
        isPublic: true,
    },
];
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
class IPFSSnapshotService {
    supabase;
    ipfs;
    currentGatewayIndex = 0;
    isRunning = false;
    constructor(supabase) {
        this.supabase = supabase;
        // Initialize IPFS client with primary gateway (Infura)
        this.ipfs = this.createIPFSClient(IPFS_GATEWAYS[0]);
        logger_1.default.info("[IPFSSnapshotService] Initialized with primary gateway: Infura");
    }
    /**
     * Create IPFS client for a specific gateway
     */
    createIPFSClient(gateway) {
        return (0, ipfs_http_client_1.create)({
            host: gateway.host,
            port: gateway.port,
            protocol: gateway.protocol,
            headers: gateway.headers,
        });
    }
    /**
     * Switch to next available IPFS gateway
     * Returns true if switched successfully, false if no more gateways
     */
    switchToNextGateway() {
        this.currentGatewayIndex++;
        if (this.currentGatewayIndex >= IPFS_GATEWAYS.length) {
            logger_1.default.error("[IPFSSnapshotService] All gateways exhausted");
            return false;
        }
        const newGateway = IPFS_GATEWAYS[this.currentGatewayIndex];
        this.ipfs = this.createIPFSClient(newGateway);
        logger_1.default.warn(`[IPFSSnapshotService] Switched to gateway: ${newGateway.name}`);
        return true;
    }
    /**
     * Reset to primary gateway
     */
    resetToPrimaryGateway() {
        if (this.currentGatewayIndex !== 0) {
            this.currentGatewayIndex = 0;
            this.ipfs = this.createIPFSClient(IPFS_GATEWAYS[0]);
            logger_1.default.info("[IPFSSnapshotService] Reset to primary gateway: Infura");
        }
    }
    /**
     * Start the snapshot service (called by scheduler)
     */
    async run() {
        if (this.isRunning) {
            logger_1.default.warn("[IPFSSnapshotService] Already running, skipping...");
            return;
        }
        this.isRunning = true;
        const startTime = Date.now();
        try {
            logger_1.default.info("[IPFSSnapshotService] Starting daily snapshot...");
            // Get active markets (ACTIVE, RESOLVING, DISPUTED)
            const markets = await this.getActiveMarkets();
            logger_1.default.info(`[IPFSSnapshotService] Found ${markets.length} active markets`);
            if (markets.length === 0) {
                logger_1.default.info("[IPFSSnapshotService] No markets to snapshot");
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
                        logger_1.default.info(`[IPFSSnapshotService] Snapshot created for market ${market.id}: ` +
                            `${result.discussionsCount} discussions → ${result.ipfsCid}`);
                    }
                    else {
                        skipCount++;
                        logger_1.default.debug(`[IPFSSnapshotService] Skipped market ${market.id} (no discussions)`);
                    }
                }
                catch (error) {
                    errorCount++;
                    logger_1.default.error(`[IPFSSnapshotService] Error snapshotting market ${market.id}:`, error);
                }
            }
            const duration = Date.now() - startTime;
            logger_1.default.info(`[IPFSSnapshotService] Completed: ` +
                `${successCount} snapshots, ${skipCount} skipped, ` +
                `${errorCount} errors in ${duration}ms`);
        }
        catch (error) {
            logger_1.default.error("[IPFSSnapshotService] Fatal error:", error);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
    /**
     * Get active markets that need snapshots
     */
    async getActiveMarkets() {
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
    async snapshotMarket(marketId) {
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
    async getRecentDiscussions(marketId) {
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
    createSnapshot(marketId, discussions) {
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
     * Upload snapshot to IPFS with retry logic and gateway fallback
     * Day 11: Enhanced with multi-gateway fallback
     * Returns CID string
     */
    async uploadToIPFS(snapshot) {
        const snapshotJson = JSON.stringify(snapshot, null, 2);
        let lastError = null;
        // Try each gateway in sequence
        for (let gatewayAttempt = 0; gatewayAttempt < IPFS_GATEWAYS.length; gatewayAttempt++) {
            const currentGateway = IPFS_GATEWAYS[this.currentGatewayIndex];
            try {
                logger_1.default.debug(`[IPFSSnapshotService] Uploading snapshot for market ${snapshot.market_id} ` +
                    `via ${currentGateway.name} (${snapshot.discussions_count} discussions, ${snapshotJson.length} bytes)`);
                // Try upload with retry for current gateway
                const cid = await (0, retry_1.retryWithBackoff)(async () => {
                    const result = await this.ipfs.add(snapshotJson);
                    return result.cid.toString();
                }, {
                    maxAttempts: 2, // Reduced per-gateway attempts
                    initialDelay: 1000,
                    maxDelay: 5000,
                    backoffFactor: 2,
                });
                logger_1.default.info(`[IPFSSnapshotService] Upload successful via ${currentGateway.name}: ${cid}`);
                // Reset to primary gateway on success
                this.resetToPrimaryGateway();
                return cid;
            }
            catch (error) {
                lastError = error;
                logger_1.default.warn(`[IPFSSnapshotService] Upload failed via ${currentGateway.name}:`, error);
                // Try next gateway if available
                if (!this.switchToNextGateway()) {
                    break; // No more gateways
                }
            }
        }
        // All gateways failed
        this.resetToPrimaryGateway();
        throw new Error(`IPFS upload failed on all gateways: ${lastError?.message || "Unknown error"}`);
    }
    /**
     * Store IPFS CID in Supabase ipfs_anchors table
     */
    async storeCID(marketId, ipfsCid, discussionsCount) {
        const { error } = await this.supabase.from("ipfs_anchors").insert({
            market_id: marketId,
            ipfs_hash: ipfsCid,
            discussions_count: discussionsCount,
            created_at: new Date().toISOString(),
        });
        if (error) {
            throw new Error(`Failed to store CID for market ${marketId}: ${error.message}`);
        }
        logger_1.default.debug(`[IPFSSnapshotService] Stored CID ${ipfsCid} for market ${marketId}`);
    }
    /**
     * Prune old snapshots (>90 days)
     * Day 11: Automatic cleanup of old IPFS anchors
     * Returns number of pruned records
     */
    async pruneOldSnapshots() {
        try {
            const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
            logger_1.default.info(`[IPFSSnapshotService] Pruning snapshots older than ${ninetyDaysAgo.toISOString()}`);
            // Find old snapshots
            const { data: oldSnapshots, error: selectError } = await this.supabase
                .from("ipfs_anchors")
                .select("id, market_id, ipfs_hash, created_at")
                .lt("created_at", ninetyDaysAgo.toISOString())
                .order("created_at", { ascending: true });
            if (selectError) {
                throw new Error(`Failed to fetch old snapshots: ${selectError.message}`);
            }
            if (!oldSnapshots || oldSnapshots.length === 0) {
                logger_1.default.info("[IPFSSnapshotService] No old snapshots to prune");
                return 0;
            }
            logger_1.default.info(`[IPFSSnapshotService] Found ${oldSnapshots.length} old snapshots to prune`);
            // Delete old snapshots from Supabase
            // Note: We DON'T delete from IPFS (immutable), only DB records
            const { error: deleteError } = await this.supabase
                .from("ipfs_anchors")
                .delete()
                .lt("created_at", ninetyDaysAgo.toISOString());
            if (deleteError) {
                throw new Error(`Failed to delete old snapshots: ${deleteError.message}`);
            }
            logger_1.default.info(`[IPFSSnapshotService] Pruned ${oldSnapshots.length} snapshots`);
            return oldSnapshots.length;
        }
        catch (error) {
            logger_1.default.error("[IPFSSnapshotService] Error pruning old snapshots:", error);
            throw error;
        }
    }
    /**
     * Retrieve snapshot from IPFS by CID
     * Day 11: Enhanced with gateway fallback
     */
    async retrieveSnapshot(cid) {
        let lastError = null;
        // Try each gateway in sequence
        for (let gatewayAttempt = 0; gatewayAttempt < IPFS_GATEWAYS.length; gatewayAttempt++) {
            const currentGateway = IPFS_GATEWAYS[this.currentGatewayIndex];
            try {
                logger_1.default.debug(`[IPFSSnapshotService] Retrieving snapshot ${cid} via ${currentGateway.name}`);
                // Get data from IPFS
                const chunks = [];
                for await (const chunk of this.ipfs.cat(cid)) {
                    chunks.push(chunk);
                }
                // Concatenate chunks and parse JSON
                const buffer = Buffer.concat(chunks);
                const snapshotJson = buffer.toString("utf-8");
                const snapshot = JSON.parse(snapshotJson);
                logger_1.default.info(`[IPFSSnapshotService] Retrieved snapshot via ${currentGateway.name} for market ${snapshot.market_id} ` +
                    `(${snapshot.discussions_count} discussions)`);
                // Reset to primary gateway on success
                this.resetToPrimaryGateway();
                return snapshot;
            }
            catch (error) {
                lastError = error;
                logger_1.default.warn(`[IPFSSnapshotService] Retrieval failed via ${currentGateway.name}:`, error);
                // Try next gateway if available
                if (!this.switchToNextGateway()) {
                    break; // No more gateways
                }
            }
        }
        // All gateways failed
        this.resetToPrimaryGateway();
        throw new Error(`IPFS retrieval failed on all gateways for CID ${cid}: ${lastError?.message || "Unknown error"}`);
    }
    /**
     * Get snapshot history for a market from Supabase
     */
    async getSnapshotHistory(marketId, limit = 30) {
        const { data, error } = await this.supabase
            .from("ipfs_anchors")
            .select("*")
            .eq("market_id", marketId)
            .order("created_at", { ascending: false })
            .limit(limit);
        if (error) {
            throw new Error(`Failed to fetch snapshot history for market ${marketId}: ${error.message}`);
        }
        return data || [];
    }
    /**
     * Test IPFS connection
     */
    async testConnection() {
        try {
            const testData = JSON.stringify({
                test: true,
                timestamp: new Date().toISOString(),
            });
            const result = await this.ipfs.add(testData);
            logger_1.default.info(`[IPFSSnapshotService] Connection test successful: ${result.cid.toString()}`);
            return true;
        }
        catch (error) {
            logger_1.default.error("[IPFSSnapshotService] Connection test failed:", error);
            return false;
        }
    }
    /**
     * Get service status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            ipfsGateway: config_1.config.ipfs.gatewayUrl,
        };
    }
}
exports.IPFSSnapshotService = IPFSSnapshotService;
//# sourceMappingURL=snapshot.js.map