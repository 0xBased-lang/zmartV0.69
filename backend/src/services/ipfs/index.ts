// ============================================================
// IPFS Service - Main Entry Point
// ============================================================
// Purpose: Export IPFS services and scheduler
// Story: 2.3 (Day 10)

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
 */
export class IPFSSnapshotScheduler {
  private snapshotService: IPFSSnapshotService;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(
    supabase: SupabaseClient,
    private cronSchedule: string = config.services.ipfsSnapshotCron // Default: "0 0 * * *" (midnight UTC)
  ) {
    this.snapshotService = new IPFSSnapshotService(supabase);
  }

  /**
   * Start the cron scheduler
   */
  start(): void {
    if (this.cronJob) {
      logger.warn("[IPFSSnapshotScheduler] Scheduler already running");
      return;
    }

    logger.info(`[IPFSSnapshotScheduler] Starting scheduler with cron: ${this.cronSchedule}`);

    // Schedule daily snapshots
    this.cronJob = cron.schedule(this.cronSchedule, async () => {
      try {
        logger.info("[IPFSSnapshotScheduler] Running scheduled snapshot...");
        await this.snapshotService.run();
        logger.info("[IPFSSnapshotScheduler] Scheduled snapshot complete");
      } catch (error) {
        logger.error("[IPFSSnapshotScheduler] Error in scheduled task:", error);
      }
    });

    logger.info("[IPFSSnapshotScheduler] Scheduler started successfully");
  }

  /**
   * Stop the cron scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info("[IPFSSnapshotScheduler] Scheduler stopped");
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    cronSchedule: string;
    snapshotService: { isRunning: boolean; ipfsGateway: string };
  } {
    return {
      isRunning: this.cronJob !== null,
      cronSchedule: this.cronSchedule,
      snapshotService: this.snapshotService.getStatus(),
    };
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
