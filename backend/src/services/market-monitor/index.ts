// ============================================================
// Market Monitor - Service Entry Point
// ============================================================
// Purpose: Initialize and start Market Monitor service with cron scheduling
// Pattern Prevention: #3 (Reactive Crisis) - Proactive monitoring system
// Blueprint: CORE_LOGIC_INVARIANTS.md - Resolution Process Steps 3 & 6

import cron from 'node-cron';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { createClient } from '@supabase/supabase-js';
import logger from '../../utils/logger';
import MARKET_MONITOR_CONFIG from './config';
import { MarketMonitor } from './monitor';
import {
  loadBackendKeypair,
  deriveGlobalConfigPda,
} from './finalization';
import path from 'path';
import fs from 'fs';

// Load IDL from workspace root (backend/dist/services/market-monitor → ../../../../target/idl)
const IDL_PATH = path.join(__dirname, '../../../../target/idl/zmart_core.json');
const IDL = JSON.parse(fs.readFileSync(IDL_PATH, 'utf-8'));

/**
 * Service instance (singleton)
 */
let monitorInstance: MarketMonitor | null = null;
let cronTask: cron.ScheduledTask | null = null;

/**
 * Initialize Market Monitor service
 *
 * Setup Steps:
 * 1. Load environment variables
 * 2. Initialize Solana connection
 * 3. Load backend authority keypair
 * 4. Initialize Anchor program
 * 5. Create MarketMonitor instance
 * 6. Validate configuration
 * 7. Start cron scheduler
 *
 * Environment Variables Required:
 * - SOLANA_RPC_URL: Solana RPC endpoint
 * - SOLANA_PROGRAM_ID_CORE: zmart-core program ID
 * - BACKEND_AUTHORITY_PRIVATE_KEY: Backend authority keypair (base58)
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_KEY: Supabase service role key
 * - MARKET_MONITOR_ENABLED: Enable/disable service (default: false)
 * - MARKET_MONITOR_CRON_SCHEDULE: Cron schedule (default: every 5 minutes)
 *
 * @returns MarketMonitor instance
 * @throws Error if initialization fails
 */
export async function initializeMarketMonitor(): Promise<MarketMonitor> {
  logger.info('[MarketMonitor] Initializing service...');

  try {
    // 1. Check if service is enabled
    if (!MARKET_MONITOR_CONFIG.ENABLED) {
      logger.warn(
        '[MarketMonitor] Service is DISABLED. Set MARKET_MONITOR_ENABLED=true to enable.'
      );
      throw new Error('Market Monitor service is disabled');
    }

    // 2. Load and validate environment variables
    const {
      rpcUrl,
      programId,
      supabaseUrl,
      supabaseKey,
    } = loadEnvironmentVariables();

    // 3. Initialize Solana connection
    const connection = new Connection(rpcUrl, {
      commitment: MARKET_MONITOR_CONFIG.COMMITMENT,
      confirmTransactionInitialTimeout: MARKET_MONITOR_CONFIG.CONFIRMATION_TIMEOUT_MS,
    });

    logger.info(`[MarketMonitor] Connected to Solana RPC: ${rpcUrl}`);

    // 4. Load backend authority keypair
    const backendKeypair = loadBackendKeypair();
    logger.info(
      `[MarketMonitor] Loaded backend authority: ${backendKeypair.publicKey.toBase58()}`
    );

    // 5. Initialize Anchor program
    const wallet = new Wallet(backendKeypair);
    const provider = new AnchorProvider(
      connection,
      wallet,
      {
        commitment: MARKET_MONITOR_CONFIG.COMMITMENT,
        preflightCommitment: MARKET_MONITOR_CONFIG.COMMITMENT,
      }
    );

    const program = new Program(IDL, provider);
    logger.info(`[MarketMonitor] Initialized Anchor program: ${programId.toBase58()}`);

    // 6. Derive global config PDA
    const [globalConfigPda] = deriveGlobalConfigPda(programId);
    logger.info(
      `[MarketMonitor] Global config PDA: ${globalConfigPda.toBase58()}`
    );

    // 7. Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    logger.info(`[MarketMonitor] Connected to Supabase: ${supabaseUrl}`);

    // 8. Create MarketMonitor instance
    const monitor = new MarketMonitor(
      program,
      connection,
      backendKeypair,
      supabase,
      globalConfigPda
    );

    // 9. Validate configuration (checks backend authority, connections)
    await monitor.validate();

    logger.info('[MarketMonitor] Initialization complete ✓');
    return monitor;
  } catch (error: any) {
    logger.error('[MarketMonitor] Initialization failed:', error);
    throw new Error(`Failed to initialize Market Monitor: ${error.message}`);
  }
}

/**
 * Start Market Monitor service with cron scheduler
 *
 * Cron Schedule (default: every 5 minutes):
 * - Format: "minute hour day month weekday"
 * - Example: Every 5 minutes (see MARKET_MONITOR_CONFIG.CRON_SCHEDULE)
 *
 * Service Behavior:
 * - Runs immediately on startup
 * - Then runs on cron schedule
 * - Prevents concurrent runs (race condition protection)
 * - Logs all operations and errors
 *
 * @throws Error if service is already running or initialization fails
 */
export async function startMarketMonitor(): Promise<void> {
  if (monitorInstance) {
    throw new Error('Market Monitor service is already running');
  }

  if (!MARKET_MONITOR_CONFIG.ENABLED) {
    logger.warn(
      '[MarketMonitor] Service is DISABLED. Not starting. ' +
      'Set MARKET_MONITOR_ENABLED=true to enable.'
    );
    return;
  }

  logger.info('[MarketMonitor] Starting service...');

  try {
    // Initialize service
    monitorInstance = await initializeMarketMonitor();

    // Log configuration
    logger.info('[MarketMonitor] Configuration:', {
      cronSchedule: MARKET_MONITOR_CONFIG.CRON_SCHEDULE,
      disputeWindowHours: MARKET_MONITOR_CONFIG.DISPUTE_WINDOW_MS / (60 * 60 * 1000),
      batchSize: MARKET_MONITOR_CONFIG.BATCH_SIZE,
      maxRetries: MARKET_MONITOR_CONFIG.MAX_RETRIES,
      commitment: MARKET_MONITOR_CONFIG.COMMITMENT,
      dryRun: MARKET_MONITOR_CONFIG.DRY_RUN,
      debugMode: MARKET_MONITOR_CONFIG.DEBUG_MODE,
    });

    // Schedule cron job
    cronTask = cron.schedule(
      MARKET_MONITOR_CONFIG.CRON_SCHEDULE,
      async () => {
        try {
          if (!monitorInstance) {
            logger.error('[MarketMonitor] Monitor instance not found in cron handler');
            return;
          }

          const summary = await monitorInstance.run();

          // Log summary
          logger.info('[MarketMonitor] Run summary:', {
            runId: summary.runId,
            duration: `${summary.duration}ms`,
            marketsFound: summary.marketsFound,
            succeeded: summary.successCount,
            failed: summary.failCount,
            skipped: summary.skippedCount,
          });
        } catch (error: any) {
          logger.error('[MarketMonitor] Cron job error:', error);
        }
      },
      {
        scheduled: true,
        timezone: 'UTC',
      }
    );

    logger.info(
      `[MarketMonitor] Service started successfully. ` +
      `Schedule: ${MARKET_MONITOR_CONFIG.CRON_SCHEDULE} (UTC)`
    );

    // Run immediately on startup (don't wait for first cron execution)
    if (monitorInstance) {
      logger.info('[MarketMonitor] Running initial check...');
      try {
        const summary = await monitorInstance.run();
        logger.info('[MarketMonitor] Initial run complete:', {
          runId: summary.runId,
          marketsFound: summary.marketsFound,
          succeeded: summary.successCount,
          failed: summary.failCount,
        });
      } catch (error: any) {
        logger.error('[MarketMonitor] Initial run failed:', error);
      }
    }
  } catch (error: any) {
    logger.error('[MarketMonitor] Failed to start service:', error);
    throw error;
  }
}

/**
 * Stop Market Monitor service gracefully
 *
 * Shutdown Steps:
 * 1. Stop cron scheduler
 * 2. Wait for current run to complete (max 60s)
 * 3. Clean up resources
 *
 * @throws Error if shutdown fails
 */
export async function stopMarketMonitor(): Promise<void> {
  logger.info('[MarketMonitor] Stopping service...');

  try {
    // 1. Stop cron scheduler
    if (cronTask) {
      cronTask.stop();
      logger.info('[MarketMonitor] Cron scheduler stopped');
      cronTask = null;
    }

    // 2. Graceful shutdown of monitor instance
    if (monitorInstance) {
      await monitorInstance.shutdown();
      monitorInstance = null;
    }

    logger.info('[MarketMonitor] Service stopped successfully');
  } catch (error: any) {
    logger.error('[MarketMonitor] Error during shutdown:', error);
    throw new Error(`Failed to stop Market Monitor: ${error.message}`);
  }
}

/**
 * Get Market Monitor service status
 *
 * @returns Service status object
 */
export function getMarketMonitorStatus(): {
  isInitialized: boolean;
  isEnabled: boolean;
  cronSchedule: string;
  monitorStatus: any;
} {
  return {
    isInitialized: monitorInstance !== null,
    isEnabled: MARKET_MONITOR_CONFIG.ENABLED,
    cronSchedule: MARKET_MONITOR_CONFIG.CRON_SCHEDULE,
    monitorStatus: monitorInstance ? monitorInstance.getStatus() : null,
  };
}

/**
 * Load and validate environment variables
 *
 * @returns Environment variables object
 * @throws Error if required variables are missing
 */
function loadEnvironmentVariables(): {
  rpcUrl: string;
  programId: PublicKey;
  supabaseUrl: string;
  supabaseKey: string;
} {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  const programIdStr = process.env.SOLANA_PROGRAM_ID_CORE;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  // Validate required variables
  const missing: string[] = [];

  if (!rpcUrl) missing.push('SOLANA_RPC_URL');
  if (!programIdStr) missing.push('SOLANA_PROGRAM_ID_CORE');
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_KEY');

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file.'
    );
  }

  // Parse program ID
  let programId: PublicKey;
  try {
    programId = new PublicKey(programIdStr!);
  } catch (error: any) {
    throw new Error(
      `Invalid SOLANA_PROGRAM_ID_CORE: ${programIdStr}. ` +
      'Must be a valid Solana public key.'
    );
  }

  return {
    rpcUrl: rpcUrl!,
    programId,
    supabaseUrl: supabaseUrl!,
    supabaseKey: supabaseKey!,
  };
}

/**
 * Handle process signals for graceful shutdown
 */
function setupSignalHandlers(): void {
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.info(`[MarketMonitor] Received ${signal}, shutting down...`);
      try {
        await stopMarketMonitor();
        process.exit(0);
      } catch (error: any) {
        logger.error(`[MarketMonitor] Error during shutdown:`, error);
        process.exit(1);
      }
    });
  });
}

// Setup signal handlers on module load
setupSignalHandlers();

// Export main functions
export { MarketMonitor } from './monitor';
export { MARKET_MONITOR_CONFIG } from './config';
export * from './finalization';
