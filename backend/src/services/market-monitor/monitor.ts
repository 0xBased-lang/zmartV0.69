// ============================================================
// Market Monitor - Core Monitoring Service
// ============================================================
// Purpose: Monitor RESOLVING markets and auto-finalize after 48h dispute window
// Pattern Prevention: #3 (Reactive Crisis) - Proactive monitoring with error handling
// Blueprint: CORE_LOGIC_INVARIANTS.md - Resolution Process Steps 3 & 6

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import { SupabaseClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';
import MARKET_MONITOR_CONFIG from './config';
import {
  finalizeMarket,
  validateBackendAuthority,
  FinalizationResult,
} from './finalization';

/**
 * Market ready for finalization
 */
export interface MarketToFinalize {
  id: string; // UUID in Supabase (market identifier)
  on_chain_address: string; // Base58 public key
  proposed_outcome: string | null; // 'YES', 'NO', 'INVALID'
  resolution_proposed_at: string; // ISO timestamp
  state: string; // Should be 'RESOLVING'
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
  processingTime: number; // milliseconds
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
export class MarketMonitor {
  private isRunning: boolean = false;
  private lastRunTime: number = 0;
  private runCount: number = 0;

  constructor(
    private program: Program,
    private connection: Connection,
    private backendKeypair: Keypair,
    private supabase: SupabaseClient,
    private globalConfigPda: PublicKey
  ) {}

  /**
   * Main monitoring function - called by cron scheduler
   *
   * This is the entry point for the service, invoked every 5 minutes.
   * Implements race condition protection to prevent overlapping runs.
   *
   * @returns Monitor run summary
   */
  async run(): Promise<MonitorRunSummary> {
    // Prevent concurrent runs
    if (this.isRunning) {
      logger.warn(
        '[MarketMonitor] Already running, skipping this execution. ' +
        'This may indicate the previous run is taking too long.'
      );
      return this.createSkippedSummary();
    }

    this.isRunning = true;
    this.runCount++;
    this.lastRunTime = Date.now();

    const runId = `run-${this.runCount}-${Date.now()}`;
    const startTime = Date.now();

    logger.info(
      `[MarketMonitor] Starting monitoring run ${runId} ` +
      `(total runs: ${this.runCount})`
    );

    try {
      // 1. Query markets ready for finalization
      const markets = await this.getMarketsReadyForFinalization();

      if (markets.length === 0) {
        logger.info('[MarketMonitor] No markets ready for finalization');
        return this.createSummary(runId, startTime, [], 0, 0, 0);
      }

      logger.info(
        `[MarketMonitor] Found ${markets.length} market(s) ready for finalization`
      );

      // 2. Process each market with timeout protection
      const attempts: FinalizationAttempt[] = [];
      let successCount = 0;
      let failCount = 0;

      for (const market of markets) {
        const attempt = await this.processMarketWithTimeout(market);
        attempts.push(attempt);

        if (attempt.success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      // 3. Create summary
      const endTime = Date.now();
      const duration = endTime - startTime;

      logger.info(
        `[MarketMonitor] Run ${runId} complete: ` +
        `${successCount} succeeded, ${failCount} failed in ${duration}ms`
      );

      return this.createSummary(
        runId,
        startTime,
        attempts,
        markets.length,
        successCount,
        failCount
      );
    } catch (error: any) {
      logger.error(`[MarketMonitor] Fatal error in run ${runId}:`, error);
      throw error;
    } finally {
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
  private async getMarketsReadyForFinalization(): Promise<MarketToFinalize[]> {
    const disputeWindowMs = MARKET_MONITOR_CONFIG.DISPUTE_WINDOW_MS;
    const safetyBufferMs = MARKET_MONITOR_CONFIG.SAFETY_BUFFER_MS;
    const totalWindowMs = disputeWindowMs + safetyBufferMs;

    // Calculate deadline: now - (48h + 1m) = cutoff timestamp
    // Markets with resolution_proposed_at <= cutoff are ready
    const cutoffTimestamp = new Date(Date.now() - totalWindowMs);

    if (MARKET_MONITOR_CONFIG.DEBUG_MODE) {
      logger.debug(`[MarketMonitor] Query parameters:`, {
        disputeWindowHours: disputeWindowMs / (60 * 60 * 1000),
        safetyBufferMinutes: safetyBufferMs / (60 * 1000),
        cutoffTimestamp: cutoffTimestamp.toISOString(),
        batchSize: MARKET_MONITOR_CONFIG.BATCH_SIZE,
      });
    }

    try {
      const { data, error } = await this.supabase
        .from('markets')
        .select('id, on_chain_address, proposed_outcome, resolution_proposed_at, state')
        .eq('state', 'RESOLVING')
        .not('resolution_proposed_at', 'is', null)
        .lte('resolution_proposed_at', cutoffTimestamp.toISOString())
        .order('resolution_proposed_at', { ascending: true })
        .limit(MARKET_MONITOR_CONFIG.BATCH_SIZE);

      if (error) {
        throw new Error(`Supabase query failed: ${error.message}`);
      }

      const markets = (data || []) as MarketToFinalize[];

      if (MARKET_MONITOR_CONFIG.DEBUG_MODE && markets.length > 0) {
        logger.debug(`[MarketMonitor] Markets found:`, {
          count: markets.length,
          marketIds: markets.map(m => m.id),
        });
      }

      return markets;
    } catch (error: any) {
      logger.error('[MarketMonitor] Failed to query markets:', error);
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
  private async processMarketWithTimeout(
    market: MarketToFinalize
  ): Promise<FinalizationAttempt> {
    const startTime = Date.now();
    const timeout = MARKET_MONITOR_CONFIG.MAX_PROCESSING_TIME_PER_MARKET_MS;

    logger.info(
      `[MarketMonitor] Processing market ${market.id} ` +
      `(address: ${market.on_chain_address})`
    );

    try {
      // Race between processing and timeout
      const result = await Promise.race([
        this.processMarket(market),
        this.createTimeoutPromise(timeout, market.id),
      ]);

      const processingTime = Date.now() - startTime;

      logger.info(
        `[MarketMonitor] Market ${market.id} finalized successfully ` +
        `(signature: ${result.signature}, time: ${processingTime}ms)`
      );

      return {
        marketId: market.id,
        marketAddress: market.on_chain_address,
        success: true,
        signature: result.signature,
        timestamp: Date.now(),
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      logger.error(
        `[MarketMonitor] Failed to finalize market ${market.id}:`,
        error
      );

      // Log error to database for manual review
      await this.logFinalizationError(market, error.message).catch((logError) => {
        logger.error(
          `[MarketMonitor] Failed to log error to database:`,
          logError
        );
      });

      return {
        marketId: market.id,
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
  private async processMarket(market: MarketToFinalize): Promise<FinalizationResult> {
    // Convert address string to PublicKey
    let marketAddress: PublicKey;
    try {
      marketAddress = new PublicKey(market.on_chain_address);
    } catch (error: any) {
      throw new Error(
        `Invalid market address ${market.on_chain_address}: ${error.message}`
      );
    }

    // Call finalization service
    const result = await finalizeMarket(
      this.program,
      this.connection,
      marketAddress,
      this.backendKeypair,
      this.globalConfigPda
    );

    return result;
  }

  /**
   * Create timeout promise that rejects after specified duration
   *
   * @param timeoutMs Timeout in milliseconds
   * @param marketId Market ID (for error message)
   * @returns Promise that rejects on timeout
   */
  private createTimeoutPromise(timeoutMs: number, marketId: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Processing timeout for market ${marketId} after ${timeoutMs}ms`
          )
        );
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
  private async logFinalizationError(
    market: MarketToFinalize,
    errorMessage: string
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('market_finalization_errors')
        .insert({
          market_id: market.id, // UUID from markets table
          market_on_chain_address: market.on_chain_address,
          market_identifier: market.id,
          error_message: errorMessage,
          resolution_proposed_at: market.resolution_proposed_at,
          created_at: new Date().toISOString(),
        });

      if (error) {
        throw new Error(`Supabase insert failed: ${error.message}`);
      }

      if (MARKET_MONITOR_CONFIG.DEBUG_MODE) {
        logger.debug(
          `[MarketMonitor] Logged error to database for market ${market.id}`
        );
      }
    } catch (error: any) {
      // Don't throw - logging errors shouldn't prevent service from continuing
      logger.error(
        `[MarketMonitor] Failed to log error to database for market ${market.id}:`,
        error
      );
    }
  }

  /**
   * Create monitor run summary
   */
  private createSummary(
    runId: string,
    startTime: number,
    attempts: FinalizationAttempt[],
    marketsFound: number,
    successCount: number,
    failCount: number
  ): MonitorRunSummary {
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
  private createSkippedSummary(): MonitorRunSummary {
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
  async validate(): Promise<void> {
    logger.info('[MarketMonitor] Validating service configuration...');

    try {
      // 1. Validate backend authority
      await validateBackendAuthority(
        this.program,
        this.globalConfigPda,
        this.backendKeypair
      );

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
      logger.info(`[MarketMonitor] Connected to Solana (slot: ${slot})`);

      logger.info('[MarketMonitor] Validation complete ✓');
    } catch (error: any) {
      logger.error('[MarketMonitor] Validation failed:', error);
      throw new Error(`Service validation failed: ${error.message}`);
    }
  }

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
  } {
    return {
      isRunning: this.isRunning,
      lastRunTime: this.lastRunTime,
      runCount: this.runCount,
      config: MARKET_MONITOR_CONFIG,
    };
  }

  /**
   * Graceful shutdown
   *
   * Waits for current run to complete before shutting down.
   * Maximum wait time: 60 seconds.
   */
  async shutdown(): Promise<void> {
    logger.info('[MarketMonitor] Initiating graceful shutdown...');

    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();

    while (this.isRunning) {
      if (Date.now() - startTime > maxWaitTime) {
        logger.warn(
          '[MarketMonitor] Shutdown timeout exceeded, forcing shutdown'
        );
        break;
      }

      logger.info('[MarketMonitor] Waiting for current run to complete...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info('[MarketMonitor] Shutdown complete');
  }
}
