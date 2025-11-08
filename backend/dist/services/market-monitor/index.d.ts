import { MarketMonitor } from './monitor';
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
export declare function initializeMarketMonitor(): Promise<MarketMonitor>;
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
export declare function startMarketMonitor(): Promise<void>;
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
export declare function stopMarketMonitor(): Promise<void>;
/**
 * Get Market Monitor service status
 *
 * @returns Service status object
 */
export declare function getMarketMonitorStatus(): {
    isInitialized: boolean;
    isEnabled: boolean;
    cronSchedule: string;
    monitorStatus: any;
};
export { MarketMonitor } from './monitor';
export { MARKET_MONITOR_CONFIG } from './config';
export * from './finalization';
//# sourceMappingURL=index.d.ts.map