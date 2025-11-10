"use strict";
// ============================================================
// Market Monitor Configuration
// ============================================================
// Purpose: Configuration constants for Market Monitor service
// Pattern Prevention: #3 (Reactive Crisis) - Proactive configuration
// Blueprint: CORE_LOGIC_INVARIANTS.md - Resolution Process Step 3 (48h dispute window)
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKET_MONITOR_CONFIG = void 0;
exports.validateConfig = validateConfig;
const env_1 = require("../../config/env");
/**
 * Market Monitor Service Configuration
 *
 * This service automatically finalizes markets in RESOLVING state
 * after the 48-hour dispute window expires (no dispute occurred).
 *
 * Blueprint Requirement:
 * - Dispute window: 48 hours from resolution_proposed_at
 * - Automatic finalization if no dispute
 * - Backend authority calls finalize_market instruction
 */
exports.MARKET_MONITOR_CONFIG = {
    /**
     * Cron schedule for monitoring runs
     * Format: "minute hour day month weekday"
     * Default: Every 5 minutes (from centralized config)
     *
     * Examples:
     * - Every 5 minutes: "star-slash-5 star star star star" (replace star with *)
     * - Every 15 minutes: "star-slash-15 star star star star"
     * - Every hour at :00: "0 star star star star"
     */
    CRON_SCHEDULE: env_1.config.marketMonitor.cronSchedule,
    /**
     * Dispute window duration (Blueprint requirement: 48 hours)
     *
     * From CORE_LOGIC_INVARIANTS.md:
     * "Step 3: DISPUTE WINDOW OPENS
     *  ├─ Duration: 48 hours from proposal"
     *
     * Value: 48 hours in milliseconds
     * Calculation: 48 * 60 * 60 * 1000 = 172,800,000 ms
     */
    DISPUTE_WINDOW_MS: 48 * 60 * 60 * 1000, // 172,800,000 ms
    /**
     * Dispute window in seconds (for on-chain validation)
     * Used when deriving from global_config.dispute_period
     */
    DISPUTE_WINDOW_SECONDS: 48 * 60 * 60, // 172,800 seconds
    /**
     * Maximum markets to process per run (from centralized config)
     *
     * Rationale:
     * - Prevent overwhelming RPC with too many transactions
     * - Each finalization = 1 transaction ~0.5-2 seconds
     * - 10 markets = ~5-20 seconds total processing time
     * - Fits within 5-minute cron window
     */
    BATCH_SIZE: env_1.config.marketMonitor.batchSize,
    /**
     * Maximum retry attempts for failed transactions
     *
     * Retry Strategy:
     * - Attempt 1: Immediate
     * - Attempt 2: After 5 seconds
     * - Attempt 3: After 10 seconds
     * - Total time: ~15 seconds for 3 attempts
     */
    MAX_RETRIES: 3,
    /**
     * Initial delay between retries (milliseconds)
     * Uses exponential backoff: 5s, 10s, 20s
     */
    RETRY_INITIAL_DELAY_MS: 5000, // 5 seconds
    /**
     * Maximum delay between retries (milliseconds)
     * Caps exponential backoff at 20 seconds
     */
    RETRY_MAX_DELAY_MS: 20000, // 20 seconds
    /**
     * Backoff multiplier for exponential backoff
     * Delay calculation: initialDelay * (backoffFactor ^ attemptNumber)
     */
    RETRY_BACKOFF_FACTOR: 2,
    /**
     * Transaction confirmation timeout (milliseconds)
     *
     * Rationale:
     * - Solana typical confirmation: 1-10 seconds
     * - Allow up to 60 seconds for congested network
     * - If timeout, transaction will be retried
     */
    CONFIRMATION_TIMEOUT_MS: 60000, // 60 seconds
    /**
     * RPC commitment level for transaction confirmation
     *
     * Options:
     * - 'processed': Fastest, least reliable
     * - 'confirmed': Balanced (recommended)
     * - 'finalized': Slowest, most reliable
     *
     * Blueprint doesn't specify, using 'confirmed' for balance
     */
    COMMITMENT: 'confirmed',
    /**
     * Enable/disable service (from centralized config)
     * Useful for deployment control and testing
     */
    ENABLED: env_1.config.marketMonitor.enabled,
    /**
     * Minimum time before finalization (safety buffer)
     *
     * Adds small buffer to prevent finalizing too early due to:
     * - Clock skew between backend and Solana validator
     * - Database timestamp precision
     *
     * Value: 1 minute buffer
     */
    SAFETY_BUFFER_MS: 60000, // 1 minute
    /**
     * Maximum processing time per market (milliseconds)
     *
     * If a single market takes longer than this, log error and continue
     * Prevents one slow market from blocking entire batch
     */
    MAX_PROCESSING_TIME_PER_MARKET_MS: 30000, // 30 seconds
    /**
     * Enable detailed debug logging (from centralized config)
     * Useful for troubleshooting but increases log volume
     */
    DEBUG_MODE: env_1.config.marketMonitor.debugMode,
    /**
     * Dry run mode (from centralized config)
     * Don't send transactions - useful for testing query logic
     */
    DRY_RUN: env_1.config.marketMonitor.dryRun,
};
/**
 * Validate configuration on import
 * Throws error if configuration is invalid
 */
function validateConfig() {
    const config = exports.MARKET_MONITOR_CONFIG;
    // Validate cron schedule format
    const cronRegex = /^(\*|([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])|\*\/([0-9]|1[0-9]|2[0-9]|3[0-9]|4[0-9]|5[0-9])) (\*|([0-9]|1[0-9]|2[0-3])|\*\/([0-9]|1[0-9]|2[0-3])) (\*|([1-9]|1[0-9]|2[0-9]|3[0-1])|\*\/([1-9]|1[0-9]|2[0-9]|3[0-1])) (\*|([1-9]|1[0-2])|\*\/([1-9]|1[0-2])) (\*|([0-6])|\*\/([0-6]))$/;
    if (!cronRegex.test(config.CRON_SCHEDULE)) {
        throw new Error(`Invalid MARKET_MONITOR_CRON_SCHEDULE: ${config.CRON_SCHEDULE}`);
    }
    // Validate numeric ranges
    if (config.BATCH_SIZE < 1 || config.BATCH_SIZE > 100) {
        throw new Error(`BATCH_SIZE must be between 1 and 100, got ${config.BATCH_SIZE}`);
    }
    if (config.MAX_RETRIES < 1 || config.MAX_RETRIES > 10) {
        throw new Error(`MAX_RETRIES must be between 1 and 10, got ${config.MAX_RETRIES}`);
    }
    // Validate dispute window matches blueprint (48 hours)
    const expectedDisputeWindowMs = 48 * 60 * 60 * 1000;
    if (config.DISPUTE_WINDOW_MS !== expectedDisputeWindowMs) {
        throw new Error(`DISPUTE_WINDOW_MS must be ${expectedDisputeWindowMs} (48 hours), ` +
            `got ${config.DISPUTE_WINDOW_MS}. This is a BLUEPRINT REQUIREMENT.`);
    }
}
// Validate on import (fail fast)
validateConfig();
exports.default = exports.MARKET_MONITOR_CONFIG;
//# sourceMappingURL=config.js.map