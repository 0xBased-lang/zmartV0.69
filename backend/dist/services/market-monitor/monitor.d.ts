import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { SupabaseClient } from '@supabase/supabase-js';
import MARKET_MONITOR_CONFIG from './config';
/**
 * Market ready for finalization
 */
export interface MarketToFinalize {
    id: string;
    on_chain_address: string;
    market_id: string;
    proposed_outcome: string | null;
    resolution_proposed_at: string;
    state: string;
}
/**
 * Finalization attempt result
 */
export interface FinalizationAttempt {
    marketId: string;
    marketAddress: string;
    success: boolean;
    signature?: string;
    error?: string;
    timestamp: number;
    processingTime: number;
}
/**
 * Monitor run summary
 */
export interface MonitorRunSummary {
    runId: string;
    startTime: number;
    endTime: number;
    duration: number;
    marketsFound: number;
    successCount: number;
    failCount: number;
    skippedCount: number;
    attempts: FinalizationAttempt[];
}
/**
 * Market Monitor Service
 *
 * Responsibilities:
 * 1. Query Supabase for markets in RESOLVING state
 * 2. Filter markets where 48-hour dispute window expired
 * 3. Call finalize_market instruction for each market
 * 4. Log results and errors for monitoring
 * 5. Prevent concurrent runs (race condition protection)
 *
 * Blueprint Context (CORE_LOGIC_INVARIANTS.md):
 * "Step 3: DISPUTE WINDOW OPENS
 *  ├─ Duration: 48 hours from proposal
 *  ├─ Action: Community votes AGREE or DISAGREE
 *  └─ Voting: Off-chain (aggregated on-chain by backend)
 *
 *  Step 6: FINALIZATION
 *  ├─ If auto-finalized: outcome = proposedOutcome, state = FINALIZED
 *  ├─ If disputed: Admin reviews evidence, sets outcome, state = FINALIZED
 *  └─ Finalization is irreversible"
 */
export declare class MarketMonitor {
    private program;
    private connection;
    private backendKeypair;
    private supabase;
    private globalConfigPda;
    private isRunning;
    private lastRunTime;
    private runCount;
    constructor(program: Program, connection: Connection, backendKeypair: Keypair, supabase: SupabaseClient, globalConfigPda: PublicKey);
    /**
     * Main monitoring function - called by cron scheduler
     *
     * This is the entry point for the service, invoked every 5 minutes.
     * Implements race condition protection to prevent overlapping runs.
     *
     * @returns Monitor run summary
     */
    run(): Promise<MonitorRunSummary>;
    /**
     * Query Supabase for markets ready to finalize
     *
     * SQL Logic:
     * - state = 'RESOLVING'
     * - resolution_proposed_at IS NOT NULL
     * - NOW() >= (resolution_proposed_at + 48 hours + 1 minute safety buffer)
     * - ORDER BY resolution_proposed_at ASC (FIFO)
     * - LIMIT 10 (batch size)
     *
     * @returns Array of markets ready for finalization
     */
    private getMarketsReadyForFinalization;
    /**
     * Process a single market with timeout protection
     *
     * Prevents a single slow market from blocking the entire batch.
     * If processing exceeds MAX_PROCESSING_TIME_PER_MARKET_MS (30s),
     * the operation is abandoned and logged as failed.
     *
     * @param market Market to finalize
     * @returns Finalization attempt result
     */
    private processMarketWithTimeout;
    /**
     * Process a single market (core finalization logic)
     *
     * Steps:
     * 1. Convert on_chain_address to PublicKey
     * 2. Call finalize_market instruction
     * 3. Return result (Event Indexer will update Supabase)
     *
     * Note: We don't update Supabase directly - the Event Indexer
     * will catch the MarketFinalized event and update the database.
     *
     * @param market Market to finalize
     * @returns Finalization result
     */
    private processMarket;
    /**
     * Create timeout promise that rejects after specified duration
     *
     * @param timeoutMs Timeout in milliseconds
     * @param marketId Market ID (for error message)
     * @returns Promise that rejects on timeout
     */
    private createTimeoutPromise;
    /**
     * Log finalization error to database for manual review
     *
     * Inserts error record into market_finalization_errors table.
     * This allows admins to review failed finalization attempts and
     * potentially retry manually or investigate on-chain state.
     *
     * @param market Market that failed to finalize
     * @param errorMessage Error message
     */
    private logFinalizationError;
    /**
     * Create monitor run summary
     */
    private createSummary;
    /**
     * Create skipped run summary (when concurrent run detected)
     */
    private createSkippedSummary;
    /**
     * Validate service configuration before first run
     *
     * Checks:
     * 1. Backend authority keypair matches on-chain global_config
     * 2. Supabase connection is working
     * 3. Solana RPC connection is working
     *
     * @throws Error if validation fails
     */
    validate(): Promise<void>;
    /**
     * Get service status
     *
     * @returns Service status object
     */
    getStatus(): {
        isRunning: boolean;
        lastRunTime: number;
        runCount: number;
        config: typeof MARKET_MONITOR_CONFIG;
    };
    /**
     * Graceful shutdown
     *
     * Waits for current run to complete before shutting down.
     * Maximum wait time: 60 seconds.
     */
    shutdown(): Promise<void>;
}
//# sourceMappingURL=monitor.d.ts.map