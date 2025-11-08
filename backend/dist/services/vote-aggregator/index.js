"use strict";
// ============================================================
// Vote Aggregator Service - Main Entry Point
// ============================================================
// Purpose: Export vote aggregator services and scheduler
// Story: 2.2 (Day 9)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoteAggregatorScheduler = exports.DisputeVoteAggregator = exports.ProposalVoteAggregator = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = __importDefault(require("../../utils/logger"));
const proposal_1 = require("./proposal");
const dispute_1 = require("./dispute");
// Export services
var proposal_2 = require("./proposal");
Object.defineProperty(exports, "ProposalVoteAggregator", { enumerable: true, get: function () { return proposal_2.ProposalVoteAggregator; } });
var dispute_2 = require("./dispute");
Object.defineProperty(exports, "DisputeVoteAggregator", { enumerable: true, get: function () { return dispute_2.DisputeVoteAggregator; } });
/**
 * VoteAggregatorScheduler
 *
 * Manages cron scheduling for both proposal and dispute vote aggregators
 */
class VoteAggregatorScheduler {
    interval;
    proposalAggregator;
    disputeAggregator;
    cronJob = null;
    constructor(program, backendKeypair, supabase, globalConfigPda, interval = "*/5 * * * *" // Default: every 5 minutes
    ) {
        this.interval = interval;
        this.proposalAggregator = new proposal_1.ProposalVoteAggregator(program, backendKeypair, supabase, globalConfigPda, 7000 // 70% threshold for proposals
        );
        this.disputeAggregator = new dispute_1.DisputeVoteAggregator(program, backendKeypair, supabase, globalConfigPda, 6000 // 60% threshold for disputes
        );
    }
    /**
     * Start the cron scheduler
     */
    start() {
        if (this.cronJob) {
            logger_1.default.warn("[VoteAggregatorScheduler] Scheduler already running");
            return;
        }
        logger_1.default.info(`[VoteAggregatorScheduler] Starting scheduler with interval: ${this.interval}`);
        // Schedule both aggregators to run every 5 minutes
        this.cronJob = node_cron_1.default.schedule(this.interval, async () => {
            try {
                logger_1.default.info("[VoteAggregatorScheduler] Running scheduled aggregation...");
                // Run both aggregators in parallel
                await Promise.all([
                    this.proposalAggregator.run(),
                    this.disputeAggregator.run(),
                ]);
                logger_1.default.info("[VoteAggregatorScheduler] Scheduled aggregation complete");
            }
            catch (error) {
                logger_1.default.error("[VoteAggregatorScheduler] Error in scheduled task:", error);
            }
        });
        logger_1.default.info("[VoteAggregatorScheduler] Scheduler started successfully");
    }
    /**
     * Stop the cron scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            logger_1.default.info("[VoteAggregatorScheduler] Scheduler stopped");
        }
    }
    /**
     * Get scheduler status
     */
    getStatus() {
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
    async runNow() {
        logger_1.default.info("[VoteAggregatorScheduler] Running manual aggregation...");
        await Promise.all([
            this.proposalAggregator.run(),
            this.disputeAggregator.run(),
        ]);
        logger_1.default.info("[VoteAggregatorScheduler] Manual aggregation complete");
    }
}
exports.VoteAggregatorScheduler = VoteAggregatorScheduler;
//# sourceMappingURL=index.js.map