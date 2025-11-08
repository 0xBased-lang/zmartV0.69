#!/usr/bin/env node
/**
 * Event Indexer Service - Standalone Entry Point
 *
 * PM2-compatible entry point for running Event Indexer as a service
 * Listens for Helius webhooks and indexes Solana events to Supabase
 */

import { EventIndexerService } from './index';
import { config } from '../../config';
import logger from '../../utils/logger';

async function main() {
  logger.info('============================================================');
  logger.info('Starting Event Indexer Service');
  logger.info('============================================================');

  try {
    // Validate required configuration
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      logger.error('Missing Supabase configuration');
      logger.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }

    if (!process.env.HELIUS_WEBHOOK_SECRET) {
      logger.warn('HELIUS_WEBHOOK_SECRET not set - webhooks will not be authenticated');
      logger.warn('This is OK for testing but should be set in production');
    }

    // Create service instance
    const service = new EventIndexerService({
      supabaseUrl: config.supabase.url,
      supabaseKey: config.supabase.serviceRoleKey,
      heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET,
      port: 3001,
      logLevel: config.logging.level,
    });

    // Initialize service
    await service.initialize();

    // Start webhook server
    await service.start();

    logger.info('============================================================');
    logger.info('Event Indexer Service READY');
    logger.info('============================================================');
    logger.info('Webhook URL: http://localhost:3001/api/events/webhook');
    logger.info('Health Check: http://localhost:3001/health');
    logger.info('============================================================');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('\nShutting down Event Indexer Service...');
      await service.stop();
      logger.info('Event Indexer Service stopped');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('\nShutting down Event Indexer Service...');
      await service.stop();
      logger.info('Event Indexer Service stopped');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start Event Indexer Service:', error);
    process.exit(1);
  }
}

// Run service
main().catch((error) => {
  logger.error('Unhandled error in Event Indexer Service:', error);
  process.exit(1);
});
