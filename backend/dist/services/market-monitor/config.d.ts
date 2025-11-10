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
export declare const MARKET_MONITOR_CONFIG: {
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
    CRON_SCHEDULE: string;
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
    DISPUTE_WINDOW_MS: number;
    /**
     * Dispute window in seconds (for on-chain validation)
     * Used when deriving from global_config.dispute_period
     */
    DISPUTE_WINDOW_SECONDS: number;
    /**
     * Maximum markets to process per run (from centralized config)
     *
     * Rationale:
     * - Prevent overwhelming RPC with too many transactions
     * - Each finalization = 1 transaction ~0.5-2 seconds
     * - 10 markets = ~5-20 seconds total processing time
     * - Fits within 5-minute cron window
     */
    BATCH_SIZE: number;
    /**
     * Maximum retry attempts for failed transactions
     *
     * Retry Strategy:
     * - Attempt 1: Immediate
     * - Attempt 2: After 5 seconds
     * - Attempt 3: After 10 seconds
     * - Total time: ~15 seconds for 3 attempts
     */
    MAX_RETRIES: number;
    /**
     * Initial delay between retries (milliseconds)
     * Uses exponential backoff: 5s, 10s, 20s
     */
    RETRY_INITIAL_DELAY_MS: number;
    /**
     * Maximum delay between retries (milliseconds)
     * Caps exponential backoff at 20 seconds
     */
    RETRY_MAX_DELAY_MS: number;
    /**
     * Backoff multiplier for exponential backoff
     * Delay calculation: initialDelay * (backoffFactor ^ attemptNumber)
     */
    RETRY_BACKOFF_FACTOR: number;
    /**
     * Transaction confirmation timeout (milliseconds)
     *
     * Rationale:
     * - Solana typical confirmation: 1-10 seconds
     * - Allow up to 60 seconds for congested network
     * - If timeout, transaction will be retried
     */
    CONFIRMATION_TIMEOUT_MS: number;
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
    COMMITMENT: "confirmed";
    /**
     * Enable/disable service (from centralized config)
     * Useful for deployment control and testing
     */
    ENABLED: boolean;
    /**
     * Minimum time before finalization (safety buffer)
     *
     * Adds small buffer to prevent finalizing too early due to:
     * - Clock skew between backend and Solana validator
     * - Database timestamp precision
     *
     * Value: 1 minute buffer
     */
    SAFETY_BUFFER_MS: number;
    /**
     * Maximum processing time per market (milliseconds)
     *
     * If a single market takes longer than this, log error and continue
     * Prevents one slow market from blocking entire batch
     */
    MAX_PROCESSING_TIME_PER_MARKET_MS: number;
    /**
     * Enable detailed debug logging (from centralized config)
     * Useful for troubleshooting but increases log volume
     */
    DEBUG_MODE: boolean;
    /**
     * Dry run mode (from centralized config)
     * Don't send transactions - useful for testing query logic
     */
    DRY_RUN: boolean;
};
/**
 * Validate configuration on import
 * Throws error if configuration is invalid
 */
export declare function validateConfig(): void;
/**
 * Export configuration with type safety
 */
export type MarketMonitorConfig = typeof MARKET_MONITOR_CONFIG;
export default MARKET_MONITOR_CONFIG;
//# sourceMappingURL=config.d.ts.map