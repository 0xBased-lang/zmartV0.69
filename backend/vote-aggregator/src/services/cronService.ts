/**
 * Cron Service
 *
 * Schedules and runs vote aggregation jobs every 5 minutes.
 */

import cron from 'node-cron';
import { AggregationService, AggregationResult } from './aggregationService';
import { logger } from '../utils/logger';

export class CronService {
  private aggregationService: AggregationService;
  private proposalTask: cron.ScheduledTask | null = null;
  private disputeTask: cron.ScheduledTask | null = null;
  private isRunning: boolean = false;

  constructor(aggregationService: AggregationService) {
    this.aggregationService = aggregationService;
  }

  /**
   * Start cron jobs
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Cron service already running');
      return;
    }

    logger.info('Starting cron service');

    // Run proposal aggregation every 5 minutes
    this.proposalTask = cron.schedule('*/5 * * * *', async () => {
      await this.runProposalAggregation();
    });

    // Run dispute aggregation every 5 minutes (offset by 2.5 minutes)
    this.disputeTask = cron.schedule('2-59/5 * * * *', async () => {
      await this.runDisputeAggregation();
    });

    this.isRunning = true;

    logger.info('Cron service started', {
      proposalSchedule: '*/5 * * * * (every 5 minutes)',
      disputeSchedule: '2-59/5 * * * * (every 5 minutes, offset)'
    });

    // Run immediately on startup
    setTimeout(() => this.runProposalAggregation(), 1000);
    setTimeout(() => this.runDisputeAggregation(), 3000);
  }

  /**
   * Stop cron jobs
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Cron service not running');
      return;
    }

    logger.info('Stopping cron service');

    if (this.proposalTask) {
      this.proposalTask.stop();
      this.proposalTask = null;
    }

    if (this.disputeTask) {
      this.disputeTask.stop();
      this.disputeTask = null;
    }

    this.isRunning = false;

    logger.info('Cron service stopped');
  }

  /**
   * Run proposal aggregation job
   */
  private async runProposalAggregation(): Promise<void> {
    const startTime = Date.now();

    logger.info('🔄 Starting proposal aggregation job');

    try {
      const results = await this.aggregationService.processProposalVotes();

      const duration = Date.now() - startTime;

      // Log summary
      const successful = results.filter(r => r.success && r.thresholdMet);
      const failed = results.filter(r => !r.success);
      const noAction = results.filter(r => r.success && !r.thresholdMet);

      logger.info('✅ Proposal aggregation job complete', {
        duration: `${duration}ms`,
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        noAction: noAction.length
      });

      // Log individual results
      for (const result of successful) {
        logger.info('Proposal approved', {
          proposalId: result.proposalId,
          txSignature: result.txSignature,
          likes: result.tally.likes,
          dislikes: result.tally.dislikes,
          likePercentage: result.tally.likePercentage?.toFixed(2) + '%'
        });
      }

      for (const result of failed) {
        logger.error('Proposal aggregation failed', {
          proposalId: result.proposalId,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Fatal error in proposal aggregation job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${Date.now() - startTime}ms`
      });
    }
  }

  /**
   * Run dispute aggregation job
   */
  private async runDisputeAggregation(): Promise<void> {
    const startTime = Date.now();

    logger.info('🔄 Starting dispute aggregation job');

    try {
      const results = await this.aggregationService.processDisputeVotes();

      const duration = Date.now() - startTime;

      // Log summary
      const successful = results.filter(r => r.success && r.thresholdMet);
      const failed = results.filter(r => !r.success);
      const noAction = results.filter(r => r.success && !r.thresholdMet);

      logger.info('✅ Dispute aggregation job complete', {
        duration: `${duration}ms`,
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        noAction: noAction.length
      });

      // Log individual results
      for (const result of successful) {
        logger.info('Dispute resolved', {
          marketPubkey: result.marketPubkey,
          txSignature: result.txSignature,
          supportVotes: result.tally.supportVotes,
          rejectVotes: result.tally.rejectVotes,
          supportPercentage: result.tally.supportPercentage?.toFixed(2) + '%'
        });
      }

      for (const result of failed) {
        logger.error('Dispute aggregation failed', {
          marketPubkey: result.marketPubkey,
          error: result.error
        });
      }

    } catch (error) {
      logger.error('Fatal error in dispute aggregation job', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${Date.now() - startTime}ms`
      });
    }
  }

  /**
   * Get cron service status
   */
  getStatus(): {
    isRunning: boolean;
    proposalTaskRunning: boolean;
    disputeTaskRunning: boolean;
  } {
    return {
      isRunning: this.isRunning,
      proposalTaskRunning: this.proposalTask !== null,
      disputeTaskRunning: this.disputeTask !== null
    };
  }

  /**
   * Trigger immediate aggregation (for testing)
   */
  async triggerImmediateAggregation(): Promise<{
    proposalResults: AggregationResult[];
    disputeResults: AggregationResult[];
  }> {
    logger.info('Manual aggregation triggered');

    const [proposalResults, disputeResults] = await Promise.all([
      this.aggregationService.processProposalVotes(),
      this.aggregationService.processDisputeVotes()
    ]);

    logger.info('Manual aggregation complete', {
      proposals: proposalResults.length,
      disputes: disputeResults.length
    });

    return {
      proposalResults,
      disputeResults
    };
  }
}
