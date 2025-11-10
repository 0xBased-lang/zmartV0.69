// ============================================================
// IPFS Service - Main Entry Point
// ============================================================
// Purpose: Export IPFS services and scheduler
// Story: 2.3 (Days 10-11)
// Day 10: Snapshot creation and upload
// Day 11: Pruning integration, multi-gateway

import cron from "node-cron";
import logger from "../../utils/logger";
import { IPFSSnapshotService } from "./snapshot";
import { SupabaseClient } from "@supabase/supabase-js";
import { config } from "../../config";

// Export services
export { IPFSSnapshotService, DiscussionSnapshot, SnapshotResult } from "./snapshot";

/**
 * IPFSSnapshotScheduler
 *
 * Manages cron scheduling for IPFS snapshot service
 * Day 11: Added pruning job for 90-day cleanup
 */
export class IPFSSnapshotScheduler {
  private snapshotService: IPFSSnapshotService;
  private snapshotCronJob: cron.ScheduledTask | null = null;
  private pruningCronJob: cron.ScheduledTask | null = null;

  constructor(
    supabase: SupabaseClient,
    private cronSchedule: string = config.services.ipfsSnapshotCron // Default: "0 0 * * *" (midnight UTC)
  ) {
    this.snapshotService = new IPFSSnapshotService(supabase);
  }

  /**
   * Start the cron scheduler
   * Day 11: Enhanced with pruning job
   */
  start(): void {
    if (this.snapshotCronJob) {
      logger.warn("[IPFSSnapshotScheduler] Scheduler already running");
      return;
    }

    logger.info(`[IPFSSnapshotScheduler] Starting scheduler with cron: ${this.cronSchedule}`);

    // Schedule daily snapshots (midnight UTC)
    this.snapshotCronJob = cron.schedule(this.cronSchedule, async () => {
      try {
        logger.info("[IPFSSnapshotScheduler] Running scheduled snapshot...");
        await this.snapshotService.run();
        logger.info("[IPFSSnapshotScheduler] Scheduled snapshot complete");
      } catch (error) {
        logger.error("[IPFSSnapshotScheduler] Error in scheduled task:", error);
      }
    });

    // Day 11: Schedule daily pruning (12:30 AM UTC, 30 min after snapshots)
    this.pruningCronJob = cron.schedule("30 0 * * *", async () => {
      try {
        logger.info("[IPFSSnapshotScheduler] Running scheduled pruning (>90 days)...");
        const prunedCount = await this.snapshotService.pruneOldSnapshots();
        logger.info(`[IPFSSnapshotScheduler] Scheduled pruning complete: ${prunedCount} records deleted`);
      } catch (error) {
        logger.error("[IPFSSnapshotScheduler] Error in pruning task:", error);
      }
    });

    logger.info(
      "[IPFSSnapshotScheduler] Scheduler started successfully:\n" +
      `  - Snapshots: ${this.cronSchedule}\n` +
      "  - Pruning: 30 0 * * * (12:30 AM UTC)"
    );
  }

  /**
   * Stop the cron scheduler
   * Day 11: Updated to stop both jobs
   */
  stop(): void {
    if (this.snapshotCronJob) {
      this.snapshotCronJob.stop();
      this.snapshotCronJob = null;
    }

    if (this.pruningCronJob) {
      this.pruningCronJob.stop();
      this.pruningCronJob = null;
    }

    logger.info("[IPFSSnapshotScheduler] Scheduler stopped (snapshots + pruning)");
  }

  /**
   * Get scheduler status
   * Day 11: Updated with pruning status
   */
  getStatus(): {
    isRunning: boolean;
    snapshotCronSchedule: string;
    pruningCronSchedule: string;
    snapshotService: { isRunning: boolean; ipfsGateway: string | undefined };
  } {
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
  async runPruningNow(): Promise<number> {
    logger.info("[IPFSSnapshotScheduler] Running manual pruning...");
    const prunedCount = await this.snapshotService.pruneOldSnapshots();
    logger.info(`[IPFSSnapshotScheduler] Manual pruning complete: ${prunedCount} records deleted`);
    return prunedCount;
  }

  /**
   * Manually trigger snapshot (for testing or manual runs)
   */
  async runNow(): Promise<void> {
    logger.info("[IPFSSnapshotScheduler] Running manual snapshot...");
    await this.snapshotService.run();
    logger.info("[IPFSSnapshotScheduler] Manual snapshot complete");
  }

  /**
   * Test IPFS connection
   */
  async testConnection(): Promise<boolean> {
    return this.snapshotService.testConnection();
  }

  /**
   * Get snapshot history for a market
   */
  async getSnapshotHistory(marketId: string, limit?: number): Promise<any[]> {
    return this.snapshotService.getSnapshotHistory(marketId, limit);
  }

  /**
   * Retrieve snapshot from IPFS
   */
  async retrieveSnapshot(cid: string): Promise<any> {
    return this.snapshotService.retrieveSnapshot(cid);
  }
}
