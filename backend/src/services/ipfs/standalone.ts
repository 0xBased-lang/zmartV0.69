#!/usr/bin/env node
/**
 * IPFS Snapshot Service - Standalone Entry Point
 *
 * PM2-compatible entry point for running IPFS Snapshot Scheduler as a service
 * Creates daily snapshots of market discussions and uploads to IPFS via Pinata
 */

import { IPFSSnapshotScheduler } from './index';
import { config } from '../../config';
import { getSupabaseClient } from '../../config/database';
import logger from '../../utils/logger';

async function main() {
  logger.info('============================================================');
  logger.info('Starting IPFS Snapshot Service');
  logger.info('============================================================');

  try {
    // Validate required configuration (from centralized config)
    const pinataApiKey = config.ipfs.pinataApiKey;
    const pinataSecretKey = config.ipfs.pinataSecretKey;

    if (!pinataApiKey || pinataApiKey === 'YOUR_PINATA_API_KEY') {
      logger.error('Missing Pinata API configuration');
      logger.error('Required: PINATA_API_KEY, PINATA_SECRET_KEY');
      logger.error('Please update .env file with your Pinata credentials');
      logger.error('Sign up at: https://www.pinata.cloud/');
      process.exit(1);
    }

    if (!pinataSecretKey || pinataSecretKey === 'YOUR_PINATA_SECRET_KEY') {
      logger.error('Missing Pinata Secret Key');
      logger.error('Please update PINATA_SECRET_KEY in .env file');
      process.exit(1);
    }

    // Get Supabase client
    const supabase = getSupabaseClient();

    // Create scheduler instance
    const scheduler = new IPFSSnapshotScheduler(
      supabase,
      config.services.ipfsSnapshotCron
    );

    // Test IPFS connection before starting
    logger.info('Testing IPFS connection...');
    const connected = await scheduler.testConnection();

    if (!connected) {
      logger.error('Failed to connect to IPFS service');
      logger.error('Please verify:');
      logger.error('  1. Pinata API credentials are correct');
      logger.error('  2. Internet connection is available');
      logger.error('  3. Pinata service is operational');
      process.exit(1);
    }

    logger.info('✅ IPFS connection successful');

    // Start scheduler
    scheduler.start();

    logger.info('============================================================');
    logger.info('IPFS Snapshot Service READY');
    logger.info('============================================================');
    logger.info(`Snapshot Schedule: ${config.services.ipfsSnapshotCron}`);
    logger.info('Pruning Schedule: 30 0 * * * (12:30 AM UTC)');
    logger.info('Gateway URL:', config.ipfs.pinataGatewayUrl || 'https://gateway.pinata.cloud');
    logger.info('============================================================');

    // Log scheduler status
    const status = scheduler.getStatus();
    logger.info('Scheduler Status:', status);

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('\nShutting down IPFS Snapshot Service...');
      scheduler.stop();
      logger.info('IPFS Snapshot Service stopped');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      logger.info('\nShutting down IPFS Snapshot Service...');
      scheduler.stop();
      logger.info('IPFS Snapshot Service stopped');
      process.exit(0);
    });

    // Keep process alive
    process.stdin.resume();

  } catch (error) {
    logger.error('Failed to start IPFS Snapshot Service:', error);
    process.exit(1);
  }
}

// Run service
main().catch((error) => {
  logger.error('Unhandled error in IPFS Snapshot Service:', error);
  process.exit(1);
});
