// ============================================================
// Market Monitor - Standalone Entry Point
// ============================================================
// Purpose: Auto-start Market Monitor service when module loads
// This file is the PM2 entry point that actually starts the service

import { startMarketMonitor } from './index';
import logger from '../../utils/logger';

/**
 * Auto-start market monitor on module load
 */
(async () => {
  try {
    logger.info('[MarketMonitor] Starting Market Monitor service from standalone entry point...');
    await startMarketMonitor();
    logger.info('[MarketMonitor] Service started successfully');
  } catch (error: any) {
    logger.error('[MarketMonitor] Failed to start service:', error);
    process.exit(1);
  }
})();
