"use strict";
// ============================================================
// Market Monitor - Core Monitoring Service
// ============================================================
// Purpose: Monitor RESOLVING markets and auto-finalize after 48h dispute window
// Pattern Prevention: #3 (Reactive Crisis) - Proactive monitoring with error handling
// Blueprint: CORE_LOGIC_INVARIANTS.md - Resolution Process Steps 3 & 6
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketMonitor = void 0;
const web3_js_1 = require("@solana/web3.js");
const logger_1 = __importDefault(require("../../utils/logger"));
const config_1 = __importDefault(require("./config"));
const finalization_1 = require("./finalization");
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
class MarketMonitor {
    program;
    connection;
    backendKeypair;
    supabase;
    globalConfigPda;
    isRunning = false;
    lastRunTime = 0;
    runCount = 0;
    constructor(program, connection, backendKeypair, supabase, globalConfigPda) {
        this.program = program;
        this.connection = connection;
        this.backendKeypair = backendKeypair;
        this.supabase = supabase;
        this.globalConfigPda = globalConfigPda;
    }
    /**
     * Main monitoring function - called by cron scheduler
     *
     * This is the entry point for the service, invoked every 5 minutes.
     * Implements race condition protection to prevent overlapping runs.
     *
     * @returns Monitor run summary
     */
    async run() {
        // Prevent concurrent runs
        if (this.isRunning) {
            logger_1.default.warn('[MarketMonitor] Already running, skipping this execution. ' +
                'This may indicate the previous run is taking too long.');
            return this.createSkippedSummary();
        }
        this.isRunning = true;
        this.runCount++;
        this.lastRunTime = Date.now();
        const runId = `run-${this.runCount}-${Date.now()}`;
        const startTime = Date.now();
        logger_1.default.info(`[MarketMonitor] Starting monitoring run ${runId} ` +
            `(total runs: ${this.runCount})`);
        try {
            // 1. Query markets ready for finalization
            const markets = await this.getMarketsReadyForFinalization();
            if (markets.length === 0) {
                logger_1.default.info('[MarketMonitor] No markets ready for finalization');
                return this.createSummary(runId, startTime, [], 0, 0, 0);
            }
            logger_1.default.info(`[MarketMonitor] Found ${markets.length} market(s) ready for finalization`);
            // 2. Process each market with timeout protection
            const attempts = [];
            let successCount = 0;
            let failCount = 0;
            for (const market of markets) {
                const attempt = await this.processMarketWithTimeout(market);
                attempts.push(attempt);
                if (attempt.success) {
                    successCount++;
                }
                else {
                    failCount++;
                }
            }
            // 3. Create summary
            const endTime = Date.now();
            const duration = endTime - startTime;
            logger_1.default.info(`[MarketMonitor] Run ${runId} complete: ` +
                `${successCount} succeeded, ${failCount} failed in ${duration}ms`);
            return this.createSummary(runId, startTime, attempts, markets.length, successCount, failCount);
        }
        catch (error) {
            logger_1.default.error(`[MarketMonitor] Fatal error in run ${runId}:`, error);
            throw error;
        }
        finally {
            this.isRunning = false;
        }
    }
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
    async getMarketsReadyForFinalization() {
        const disputeWindowMs = config_1.default.DISPUTE_WINDOW_MS;
        const safetyBufferMs = config_1.default.SAFETY_BUFFER_MS;
        const totalWindowMs = disputeWindowMs + safetyBufferMs;
        // Calculate deadline: now - (48h + 1m) = cutoff timestamp
        // Markets with resolution_proposed_at <= cutoff are ready
        const cutoffTimestamp = new Date(Date.now() - totalWindowMs);
        if (config_1.default.DEBUG_MODE) {
            logger_1.default.debug(`[MarketMonitor] Query parameters:`, {
                disputeWindowHours: disputeWindowMs / (60 * 60 * 1000),
                safetyBufferMinutes: safetyBufferMs / (60 * 1000),
                cutoffTimestamp: cutoffTimestamp.toISOString(),
                batchSize: config_1.default.BATCH_SIZE,
            });
        }
        try {
            const { data, error } = await this.supabase
                .from('markets')
                .select('id, on_chain_address, market_id, proposed_outcome, resolution_proposed_at, state')
                .eq('state', 'RESOLVING')
                .not('resolution_proposed_at', 'is', null)
                .lte('resolution_proposed_at', cutoffTimestamp.toISOString())
                .order('resolution_proposed_at', { ascending: true })
                .limit(config_1.default.BATCH_SIZE);
            if (error) {
                throw new Error(`Supabase query failed: ${error.message}`);
            }
            const markets = (data || []);
            if (config_1.default.DEBUG_MODE && markets.length > 0) {
                logger_1.default.debug(`[MarketMonitor] Markets found:`, {
                    count: markets.length,
                    marketIds: markets.map(m => m.market_id),
                });
            }
            return markets;
        }
        catch (error) {
            logger_1.default.error('[MarketMonitor] Failed to query markets:', error);
            throw new Error(`Failed to fetch markets from Supabase: ${error.message}`);
        }
    }
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
    async processMarketWithTimeout(market) {
        const startTime = Date.now();
        const timeout = config_1.default.MAX_PROCESSING_TIME_PER_MARKET_MS;
        logger_1.default.info(`[MarketMonitor] Processing market ${market.market_id} ` +
            `(address: ${market.on_chain_address})`);
        try {
            // Race between processing and timeout
            const result = await Promise.race([
                this.processMarket(market),
                this.createTimeoutPromise(timeout, market.market_id),
            ]);
            const processingTime = Date.now() - startTime;
            logger_1.default.info(`[MarketMonitor] Market ${market.market_id} finalized successfully ` +
                `(signature: ${result.signature}, time: ${processingTime}ms)`);
            return {
                marketId: market.market_id,
                marketAddress: market.on_chain_address,
                success: true,
                signature: result.signature,
                timestamp: Date.now(),
                processingTime,
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            logger_1.default.error(`[MarketMonitor] Failed to finalize market ${market.market_id}:`, error);
            // Log error to database for manual review
            await this.logFinalizationError(market, error.message).catch((logError) => {
                logger_1.default.error(`[MarketMonitor] Failed to log error to database:`, logError);
            });
            return {
                marketId: market.market_id,
                marketAddress: market.on_chain_address,
                success: false,
                error: error.message,
                timestamp: Date.now(),
                processingTime,
            };
        }
    }
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
    async processMarket(market) {
        // Convert address string to PublicKey
        let marketAddress;
        try {
            marketAddress = new web3_js_1.PublicKey(market.on_chain_address);
        }
        catch (error) {
            throw new Error(`Invalid market address ${market.on_chain_address}: ${error.message}`);
        }
        // Call finalization service
        const result = await (0, finalization_1.finalizeMarket)(this.program, this.connection, marketAddress, this.backendKeypair, this.globalConfigPda);
        return result;
    }
    /**
     * Create timeout promise that rejects after specified duration
     *
     * @param timeoutMs Timeout in milliseconds
     * @param marketId Market ID (for error message)
     * @returns Promise that rejects on timeout
     */
    createTimeoutPromise(timeoutMs, marketId) {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Processing timeout for market ${marketId} after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    }
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
    async logFinalizationError(market, errorMessage) {
        try {
            const { error } = await this.supabase
                .from('market_finalization_errors')
                .insert({
                market_id: market.id, // UUID from markets table
                market_on_chain_address: market.on_chain_address,
                market_identifier: market.market_id,
                error_message: errorMessage,
                resolution_proposed_at: market.resolution_proposed_at,
                created_at: new Date().toISOString(),
            });
            if (error) {
                throw new Error(`Supabase insert failed: ${error.message}`);
            }
            if (config_1.default.DEBUG_MODE) {
                logger_1.default.debug(`[MarketMonitor] Logged error to database for market ${market.market_id}`);
            }
        }
        catch (error) {
            // Don't throw - logging errors shouldn't prevent service from continuing
            logger_1.default.error(`[MarketMonitor] Failed to log error to database for market ${market.market_id}:`, error);
        }
    }
    /**
     * Create monitor run summary
     */
    createSummary(runId, startTime, attempts, marketsFound, successCount, failCount) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        return {
            runId,
            startTime,
            endTime,
            duration,
            marketsFound,
            successCount,
            failCount,
            skippedCount: 0,
            attempts,
        };
    }
    /**
     * Create skipped run summary (when concurrent run detected)
     */
    createSkippedSummary() {
        const now = Date.now();
        return {
            runId: `skipped-${now}`,
            startTime: now,
            endTime: now,
            duration: 0,
            marketsFound: 0,
            successCount: 0,
            failCount: 0,
            skippedCount: 1,
            attempts: [],
        };
    }
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
    async validate() {
        logger_1.default.info('[MarketMonitor] Validating service configuration...');
        try {
            // 1. Validate backend authority
            await (0, finalization_1.validateBackendAuthority)(this.program, this.globalConfigPda, this.backendKeypair);
            // 2. Test Supabase connection
            const { error: supabaseError } = await this.supabase
                .from('markets')
                .select('id')
                .limit(1);
            if (supabaseError) {
                throw new Error(`Supabase connection failed: ${supabaseError.message}`);
            }
            // 3. Test Solana connection
            const slot = await this.connection.getSlot();
            logger_1.default.info(`[MarketMonitor] Connected to Solana (slot: ${slot})`);
            logger_1.default.info('[MarketMonitor] Validation complete ✓');
        }
        catch (error) {
            logger_1.default.error('[MarketMonitor] Validation failed:', error);
            throw new Error(`Service validation failed: ${error.message}`);
        }
    }
    /**
     * Get service status
     *
     * @returns Service status object
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRunTime: this.lastRunTime,
            runCount: this.runCount,
            config: config_1.default,
        };
    }
    /**
     * Graceful shutdown
     *
     * Waits for current run to complete before shutting down.
     * Maximum wait time: 60 seconds.
     */
    async shutdown() {
        logger_1.default.info('[MarketMonitor] Initiating graceful shutdown...');
        const maxWaitTime = 60000; // 60 seconds
        const startTime = Date.now();
        while (this.isRunning) {
            if (Date.now() - startTime > maxWaitTime) {
                logger_1.default.warn('[MarketMonitor] Shutdown timeout exceeded, forcing shutdown');
                break;
            }
            logger_1.default.info('[MarketMonitor] Waiting for current run to complete...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        logger_1.default.info('[MarketMonitor] Shutdown complete');
    }
}
exports.MarketMonitor = MarketMonitor;
//# sourceMappingURL=monitor.js.map