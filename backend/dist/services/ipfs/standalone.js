#!/usr/bin/env node
"use strict";
/**
 * IPFS Snapshot Service - Standalone Entry Point
 *
 * PM2-compatible entry point for running IPFS Snapshot Scheduler as a service
 * Creates daily snapshots of market discussions and uploads to IPFS via Pinata
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const config_1 = require("../../config");
const database_1 = require("../../config/database");
const logger_1 = __importDefault(require("../../utils/logger"));
async function main() {
    logger_1.default.info('============================================================');
    logger_1.default.info('Starting IPFS Snapshot Service');
    logger_1.default.info('============================================================');
    try {
        // Validate required configuration
        const pinataApiKey = process.env.PINATA_API_KEY;
        const pinataSecretKey = process.env.PINATA_SECRET_KEY;
        if (!pinataApiKey || pinataApiKey === 'YOUR_PINATA_API_KEY') {
            logger_1.default.error('Missing Pinata API configuration');
            logger_1.default.error('Required: PINATA_API_KEY, PINATA_SECRET_KEY');
            logger_1.default.error('Please update .env file with your Pinata credentials');
            logger_1.default.error('Sign up at: https://www.pinata.cloud/');
            process.exit(1);
        }
        if (!pinataSecretKey || pinataSecretKey === 'YOUR_PINATA_SECRET_KEY') {
            logger_1.default.error('Missing Pinata Secret Key');
            logger_1.default.error('Please update PINATA_SECRET_KEY in .env file');
            process.exit(1);
        }
        // Get Supabase client
        const supabase = (0, database_1.getSupabaseClient)();
        // Create scheduler instance
        const scheduler = new index_1.IPFSSnapshotScheduler(supabase, config_1.config.services.ipfsSnapshotCron);
        // Test IPFS connection before starting
        logger_1.default.info('Testing IPFS connection...');
        const connected = await scheduler.testConnection();
        if (!connected) {
            logger_1.default.error('Failed to connect to IPFS service');
            logger_1.default.error('Please verify:');
            logger_1.default.error('  1. Pinata API credentials are correct');
            logger_1.default.error('  2. Internet connection is available');
            logger_1.default.error('  3. Pinata service is operational');
            process.exit(1);
        }
        logger_1.default.info('✅ IPFS connection successful');
        // Start scheduler
        scheduler.start();
        logger_1.default.info('============================================================');
        logger_1.default.info('IPFS Snapshot Service READY');
        logger_1.default.info('============================================================');
        logger_1.default.info(`Snapshot Schedule: ${config_1.config.services.ipfsSnapshotCron}`);
        logger_1.default.info('Pruning Schedule: 30 0 * * * (12:30 AM UTC)');
        logger_1.default.info('Gateway URL:', process.env.PINATA_GATEWAY_URL || 'https://gateway.pinata.cloud');
        logger_1.default.info('============================================================');
        // Log scheduler status
        const status = scheduler.getStatus();
        logger_1.default.info('Scheduler Status:', status);
        // Graceful shutdown
        process.on('SIGINT', () => {
            logger_1.default.info('\nShutting down IPFS Snapshot Service...');
            scheduler.stop();
            logger_1.default.info('IPFS Snapshot Service stopped');
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            logger_1.default.info('\nShutting down IPFS Snapshot Service...');
            scheduler.stop();
            logger_1.default.info('IPFS Snapshot Service stopped');
            process.exit(0);
        });
        // Keep process alive
        process.stdin.resume();
    }
    catch (error) {
        logger_1.default.error('Failed to start IPFS Snapshot Service:', error);
        process.exit(1);
    }
}
// Run service
main().catch((error) => {
    logger_1.default.error('Unhandled error in IPFS Snapshot Service:', error);
    process.exit(1);
});
//# sourceMappingURL=standalone.js.map