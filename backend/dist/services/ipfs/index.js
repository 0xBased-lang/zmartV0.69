"use strict";
// ============================================================
// IPFS Service - Main Entry Point
// ============================================================
// Purpose: Export IPFS services and scheduler
// Story: 2.3 (Days 10-11)
// Day 10: Snapshot creation and upload
// Day 11: Pruning integration, multi-gateway
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPFSSnapshotScheduler = exports.IPFSSnapshotService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = __importDefault(require("../../utils/logger"));
const snapshot_1 = require("./snapshot");
const config_1 = require("../../config");
// Export services
var snapshot_2 = require("./snapshot");
Object.defineProperty(exports, "IPFSSnapshotService", { enumerable: true, get: function () { return snapshot_2.IPFSSnapshotService; } });
/**
 * IPFSSnapshotScheduler
 *
 * Manages cron scheduling for IPFS snapshot service
 * Day 11: Added pruning job for 90-day cleanup
 */
class IPFSSnapshotScheduler {
    cronSchedule;
    snapshotService;
    snapshotCronJob = null;
    pruningCronJob = null;
    constructor(supabase, cronSchedule = config_1.config.services.ipfsSnapshotCron // Default: "0 0 * * *" (midnight UTC)
    ) {
        this.cronSchedule = cronSchedule;
        this.snapshotService = new snapshot_1.IPFSSnapshotService(supabase);
    }
    /**
     * Start the cron scheduler
     * Day 11: Enhanced with pruning job
     */
    start() {
        if (this.snapshotCronJob) {
            logger_1.default.warn("[IPFSSnapshotScheduler] Scheduler already running");
            return;
        }
        logger_1.default.info(`[IPFSSnapshotScheduler] Starting scheduler with cron: ${this.cronSchedule}`);
        // Schedule daily snapshots (midnight UTC)
        this.snapshotCronJob = node_cron_1.default.schedule(this.cronSchedule, async () => {
            try {
                logger_1.default.info("[IPFSSnapshotScheduler] Running scheduled snapshot...");
                await this.snapshotService.run();
                logger_1.default.info("[IPFSSnapshotScheduler] Scheduled snapshot complete");
            }
            catch (error) {
                logger_1.default.error("[IPFSSnapshotScheduler] Error in scheduled task:", error);
            }
        });
        // Day 11: Schedule daily pruning (12:30 AM UTC, 30 min after snapshots)
        this.pruningCronJob = node_cron_1.default.schedule("30 0 * * *", async () => {
            try {
                logger_1.default.info("[IPFSSnapshotScheduler] Running scheduled pruning (>90 days)...");
                const prunedCount = await this.snapshotService.pruneOldSnapshots();
                logger_1.default.info(`[IPFSSnapshotScheduler] Scheduled pruning complete: ${prunedCount} records deleted`);
            }
            catch (error) {
                logger_1.default.error("[IPFSSnapshotScheduler] Error in pruning task:", error);
            }
        });
        logger_1.default.info("[IPFSSnapshotScheduler] Scheduler started successfully:\n" +
            `  - Snapshots: ${this.cronSchedule}\n` +
            "  - Pruning: 30 0 * * * (12:30 AM UTC)");
    }
    /**
     * Stop the cron scheduler
     * Day 11: Updated to stop both jobs
     */
    stop() {
        if (this.snapshotCronJob) {
            this.snapshotCronJob.stop();
            this.snapshotCronJob = null;
        }
        if (this.pruningCronJob) {
            this.pruningCronJob.stop();
            this.pruningCronJob = null;
        }
        logger_1.default.info("[IPFSSnapshotScheduler] Scheduler stopped (snapshots + pruning)");
    }
    /**
     * Get scheduler status
     * Day 11: Updated with pruning status
     */
    getStatus() {
        return {
            isRunning: this.snapshotCronJob !== null && this.pruningCronJob !== null,
            snapshotCronSchedule: this.cronSchedule,
            pruningCronSchedule: "30 0 * * *",
            snapshotService: this.snapshotService.getStatus(),
        };
    }
    /**
     * Manually trigger pruning (for testing or manual cleanup)
     * Day 11: New method
     */
    async runPruningNow() {
        logger_1.default.info("[IPFSSnapshotScheduler] Running manual pruning...");
        const prunedCount = await this.snapshotService.pruneOldSnapshots();
        logger_1.default.info(`[IPFSSnapshotScheduler] Manual pruning complete: ${prunedCount} records deleted`);
        return prunedCount;
    }
    /**
     * Manually trigger snapshot (for testing or manual runs)
     */
    async runNow() {
        logger_1.default.info("[IPFSSnapshotScheduler] Running manual snapshot...");
        await this.snapshotService.run();
        logger_1.default.info("[IPFSSnapshotScheduler] Manual snapshot complete");
    }
    /**
     * Test IPFS connection
     */
    async testConnection() {
        return this.snapshotService.testConnection();
    }
    /**
     * Get snapshot history for a market
     */
    async getSnapshotHistory(marketId, limit) {
        return this.snapshotService.getSnapshotHistory(marketId, limit);
    }
    /**
     * Retrieve snapshot from IPFS
     */
    async retrieveSnapshot(cid) {
        return this.snapshotService.retrieveSnapshot(cid);
    }
}
exports.IPFSSnapshotScheduler = IPFSSnapshotScheduler;
//# sourceMappingURL=index.js.map