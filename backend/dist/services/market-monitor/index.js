"use strict";
// ============================================================
// Market Monitor - Service Entry Point
// ============================================================
// Purpose: Initialize and start Market Monitor service with cron scheduling
// Pattern Prevention: #3 (Reactive Crisis) - Proactive monitoring system
// Blueprint: CORE_LOGIC_INVARIANTS.md - Resolution Process Steps 3 & 6
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MARKET_MONITOR_CONFIG = exports.MarketMonitor = void 0;
exports.initializeMarketMonitor = initializeMarketMonitor;
exports.startMarketMonitor = startMarketMonitor;
exports.stopMarketMonitor = stopMarketMonitor;
exports.getMarketMonitorStatus = getMarketMonitorStatus;
const node_cron_1 = __importDefault(require("node-cron"));
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = __importDefault(require("../../utils/logger"));
const config_1 = __importDefault(require("./config"));
const monitor_1 = require("./monitor");
const finalization_1 = require("./finalization");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Load IDL from workspace root (backend/dist/services/market-monitor → ../../../../target/idl)
const IDL_PATH = path_1.default.join(__dirname, '../../../../target/idl/zmart_core.json');
const IDL = JSON.parse(fs_1.default.readFileSync(IDL_PATH, 'utf-8'));
/**
 * Service instance (singleton)
 */
let monitorInstance = null;
let cronTask = null;
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
async function initializeMarketMonitor() {
    logger_1.default.info('[MarketMonitor] Initializing service...');
    try {
        // 1. Check if service is enabled
        if (!config_1.default.ENABLED) {
            logger_1.default.warn('[MarketMonitor] Service is DISABLED. Set MARKET_MONITOR_ENABLED=true to enable.');
            throw new Error('Market Monitor service is disabled');
        }
        // 2. Load and validate environment variables
        const { rpcUrl, programId, supabaseUrl, supabaseKey, } = loadEnvironmentVariables();
        // 3. Initialize Solana connection
        const connection = new web3_js_1.Connection(rpcUrl, {
            commitment: config_1.default.COMMITMENT,
            confirmTransactionInitialTimeout: config_1.default.CONFIRMATION_TIMEOUT_MS,
        });
        logger_1.default.info(`[MarketMonitor] Connected to Solana RPC: ${rpcUrl}`);
        // 4. Load backend authority keypair
        const backendKeypair = (0, finalization_1.loadBackendKeypair)();
        logger_1.default.info(`[MarketMonitor] Loaded backend authority: ${backendKeypair.publicKey.toBase58()}`);
        // 5. Initialize Anchor program
        const wallet = new anchor_1.Wallet(backendKeypair);
        const provider = new anchor_1.AnchorProvider(connection, wallet, {
            commitment: config_1.default.COMMITMENT,
            preflightCommitment: config_1.default.COMMITMENT,
        });
        const program = new anchor_1.Program(IDL, provider);
        logger_1.default.info(`[MarketMonitor] Initialized Anchor program: ${programId.toBase58()}`);
        // 6. Derive global config PDA
        const [globalConfigPda] = (0, finalization_1.deriveGlobalConfigPda)(programId);
        logger_1.default.info(`[MarketMonitor] Global config PDA: ${globalConfigPda.toBase58()}`);
        // 7. Initialize Supabase client
        const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        logger_1.default.info(`[MarketMonitor] Connected to Supabase: ${supabaseUrl}`);
        // 8. Create MarketMonitor instance
        const monitor = new monitor_1.MarketMonitor(program, connection, backendKeypair, supabase, globalConfigPda);
        // 9. Validate configuration (checks backend authority, connections)
        await monitor.validate();
        logger_1.default.info('[MarketMonitor] Initialization complete ✓');
        return monitor;
    }
    catch (error) {
        logger_1.default.error('[MarketMonitor] Initialization failed:', error);
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
async function startMarketMonitor() {
    if (monitorInstance) {
        throw new Error('Market Monitor service is already running');
    }
    if (!config_1.default.ENABLED) {
        logger_1.default.warn('[MarketMonitor] Service is DISABLED. Not starting. ' +
            'Set MARKET_MONITOR_ENABLED=true to enable.');
        return;
    }
    logger_1.default.info('[MarketMonitor] Starting service...');
    try {
        // Initialize service
        monitorInstance = await initializeMarketMonitor();
        // Log configuration
        logger_1.default.info('[MarketMonitor] Configuration:', {
            cronSchedule: config_1.default.CRON_SCHEDULE,
            disputeWindowHours: config_1.default.DISPUTE_WINDOW_MS / (60 * 60 * 1000),
            batchSize: config_1.default.BATCH_SIZE,
            maxRetries: config_1.default.MAX_RETRIES,
            commitment: config_1.default.COMMITMENT,
            dryRun: config_1.default.DRY_RUN,
            debugMode: config_1.default.DEBUG_MODE,
        });
        // Schedule cron job
        cronTask = node_cron_1.default.schedule(config_1.default.CRON_SCHEDULE, async () => {
            try {
                if (!monitorInstance) {
                    logger_1.default.error('[MarketMonitor] Monitor instance not found in cron handler');
                    return;
                }
                const summary = await monitorInstance.run();
                // Log summary
                logger_1.default.info('[MarketMonitor] Run summary:', {
                    runId: summary.runId,
                    duration: `${summary.duration}ms`,
                    marketsFound: summary.marketsFound,
                    succeeded: summary.successCount,
                    failed: summary.failCount,
                    skipped: summary.skippedCount,
                });
            }
            catch (error) {
                logger_1.default.error('[MarketMonitor] Cron job error:', error);
            }
        }, {
            scheduled: true,
            timezone: 'UTC',
        });
        logger_1.default.info(`[MarketMonitor] Service started successfully. ` +
            `Schedule: ${config_1.default.CRON_SCHEDULE} (UTC)`);
        // Run immediately on startup (don't wait for first cron execution)
        if (monitorInstance) {
            logger_1.default.info('[MarketMonitor] Running initial check...');
            try {
                const summary = await monitorInstance.run();
                logger_1.default.info('[MarketMonitor] Initial run complete:', {
                    runId: summary.runId,
                    marketsFound: summary.marketsFound,
                    succeeded: summary.successCount,
                    failed: summary.failCount,
                });
            }
            catch (error) {
                logger_1.default.error('[MarketMonitor] Initial run failed:', error);
            }
        }
    }
    catch (error) {
        logger_1.default.error('[MarketMonitor] Failed to start service:', error);
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
async function stopMarketMonitor() {
    logger_1.default.info('[MarketMonitor] Stopping service...');
    try {
        // 1. Stop cron scheduler
        if (cronTask) {
            cronTask.stop();
            logger_1.default.info('[MarketMonitor] Cron scheduler stopped');
            cronTask = null;
        }
        // 2. Graceful shutdown of monitor instance
        if (monitorInstance) {
            await monitorInstance.shutdown();
            monitorInstance = null;
        }
        logger_1.default.info('[MarketMonitor] Service stopped successfully');
    }
    catch (error) {
        logger_1.default.error('[MarketMonitor] Error during shutdown:', error);
        throw new Error(`Failed to stop Market Monitor: ${error.message}`);
    }
}
/**
 * Get Market Monitor service status
 *
 * @returns Service status object
 */
function getMarketMonitorStatus() {
    return {
        isInitialized: monitorInstance !== null,
        isEnabled: config_1.default.ENABLED,
        cronSchedule: config_1.default.CRON_SCHEDULE,
        monitorStatus: monitorInstance ? monitorInstance.getStatus() : null,
    };
}
/**
 * Load and validate environment variables
 *
 * @returns Environment variables object
 * @throws Error if required variables are missing
 */
function loadEnvironmentVariables() {
    const rpcUrl = process.env.SOLANA_RPC_URL;
    const programIdStr = process.env.SOLANA_PROGRAM_ID_CORE;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    // Validate required variables
    const missing = [];
    if (!rpcUrl)
        missing.push('SOLANA_RPC_URL');
    if (!programIdStr)
        missing.push('SOLANA_PROGRAM_ID_CORE');
    if (!supabaseUrl)
        missing.push('SUPABASE_URL');
    if (!supabaseKey)
        missing.push('SUPABASE_SERVICE_KEY');
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}. ` +
            'Please check your .env file.');
    }
    // Parse program ID
    let programId;
    try {
        programId = new web3_js_1.PublicKey(programIdStr);
    }
    catch (error) {
        throw new Error(`Invalid SOLANA_PROGRAM_ID_CORE: ${programIdStr}. ` +
            'Must be a valid Solana public key.');
    }
    return {
        rpcUrl: rpcUrl,
        programId,
        supabaseUrl: supabaseUrl,
        supabaseKey: supabaseKey,
    };
}
/**
 * Handle process signals for graceful shutdown
 */
function setupSignalHandlers() {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    signals.forEach((signal) => {
        process.on(signal, async () => {
            logger_1.default.info(`[MarketMonitor] Received ${signal}, shutting down...`);
            try {
                await stopMarketMonitor();
                process.exit(0);
            }
            catch (error) {
                logger_1.default.error(`[MarketMonitor] Error during shutdown:`, error);
                process.exit(1);
            }
        });
    });
}
// Setup signal handlers on module load
setupSignalHandlers();
// Export main functions
var monitor_2 = require("./monitor");
Object.defineProperty(exports, "MarketMonitor", { enumerable: true, get: function () { return monitor_2.MarketMonitor; } });
var config_2 = require("./config");
Object.defineProperty(exports, "MARKET_MONITOR_CONFIG", { enumerable: true, get: function () { return config_2.MARKET_MONITOR_CONFIG; } });
__exportStar(require("./finalization"), exports);
//# sourceMappingURL=index.js.map