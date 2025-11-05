// ============================================================
// Vote Aggregator Service - Main Entry Point
// ============================================================
// Purpose: Export vote aggregator services and scheduler
// Story: 2.2 (Day 9)

import cron from "node-cron";
import logger from "../../utils/logger";
import { ProposalVoteAggregator } from "./proposal";
import { DisputeVoteAggregator } from "./dispute";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { SupabaseClient } from "@supabase/supabase-js";

// Export services
export { ProposalVoteAggregator, VoteAggregationResult } from "./proposal";
export { DisputeVoteAggregator, DisputeAggregationResult } from "./dispute";

/**
 * VoteAggregatorScheduler
 *
 * Manages cron scheduling for both proposal and dispute vote aggregators
 */
export class VoteAggregatorScheduler {
  private proposalAggregator: ProposalVoteAggregator;
  private disputeAggregator: DisputeVoteAggregator;
  private cronJob: cron.ScheduledTask | null = null;

  constructor(
    program: Program,
    backendKeypair: any,
    supabase: SupabaseClient,
    globalConfigPda: PublicKey,
    private interval: string = "*/5 * * * *" // Default: every 5 minutes
  ) {
    this.proposalAggregator = new ProposalVoteAggregator(
      program,
      backendKeypair,
      supabase,
      globalConfigPda,
      7000 // 70% threshold for proposals
    );

    this.disputeAggregator = new DisputeVoteAggregator(
      program,
      backendKeypair,
      supabase,
      globalConfigPda,
      6000 // 60% threshold for disputes
    );
  }

  /**
   * Start the cron scheduler
   */
  start(): void {
    if (this.cronJob) {
      logger.warn("[VoteAggregatorScheduler] Scheduler already running");
      return;
    }

    logger.info(`[VoteAggregatorScheduler] Starting scheduler with interval: ${this.interval}`);

    // Schedule both aggregators to run every 5 minutes
    this.cronJob = cron.schedule(this.interval, async () => {
      try {
        logger.info("[VoteAggregatorScheduler] Running scheduled aggregation...");

        // Run both aggregators in parallel
        await Promise.all([
          this.proposalAggregator.run(),
          this.disputeAggregator.run(),
        ]);

        logger.info("[VoteAggregatorScheduler] Scheduled aggregation complete");
      } catch (error) {
        logger.error("[VoteAggregatorScheduler] Error in scheduled task:", error);
      }
    });

    logger.info("[VoteAggregatorScheduler] Scheduler started successfully");
  }

  /**
   * Stop the cron scheduler
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info("[VoteAggregatorScheduler] Scheduler stopped");
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    interval: string;
    proposalAggregator: { isRunning: boolean; approvalThreshold: number };
    disputeAggregator: { isRunning: boolean; disputeThreshold: number };
  } {
    return {
      isRunning: this.cronJob !== null,
      interval: this.interval,
      proposalAggregator: this.proposalAggregator.getStatus(),
      disputeAggregator: this.disputeAggregator.getStatus(),
    };
  }

  /**
   * Manually trigger aggregation (for testing or manual runs)
   */
  async runNow(): Promise<void> {
    logger.info("[VoteAggregatorScheduler] Running manual aggregation...");

    await Promise.all([
      this.proposalAggregator.run(),
      this.disputeAggregator.run(),
    ]);

    logger.info("[VoteAggregatorScheduler] Manual aggregation complete");
  }
}
