#!/usr/bin/env node
"use strict";
/**
 * Event Indexer Service - Standalone Entry Point
 *
 * PM2-compatible entry point for running Event Indexer as a service
 * Listens for Helius webhooks and indexes Solana events to Supabase
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("./index");
const config_1 = require("../../config");
const logger_1 = __importDefault(require("../../utils/logger"));
async function main() {
    logger_1.default.info('============================================================');
    logger_1.default.info('Starting Event Indexer Service');
    logger_1.default.info('============================================================');
    try {
        // Validate required configuration
        if (!config_1.config.supabase.url || !config_1.config.supabase.serviceRoleKey) {
            logger_1.default.error('Missing Supabase configuration');
            logger_1.default.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
            process.exit(1);
        }
        if (!process.env.HELIUS_WEBHOOK_SECRET) {
            logger_1.default.warn('HELIUS_WEBHOOK_SECRET not set - webhooks will not be authenticated');
            logger_1.default.warn('This is OK for testing but should be set in production');
        }
        // Create service instance
        const service = new index_1.EventIndexerService({
            supabaseUrl: config_1.config.supabase.url,
            supabaseKey: config_1.config.supabase.serviceRoleKey,
            heliusWebhookSecret: process.env.HELIUS_WEBHOOK_SECRET,
            port: 3001,
            logLevel: config_1.config.logging.level,
        });
        // Initialize service
        await service.initialize();
        // Start webhook server
        await service.start();
        logger_1.default.info('============================================================');
        logger_1.default.info('Event Indexer Service READY');
        logger_1.default.info('============================================================');
        logger_1.default.info('Webhook URL: http://localhost:3001/api/events/webhook');
        logger_1.default.info('Health Check: http://localhost:3001/health');
        logger_1.default.info('============================================================');
        // Graceful shutdown
        process.on('SIGINT', async () => {
            logger_1.default.info('\nShutting down Event Indexer Service...');
            await service.stop();
            logger_1.default.info('Event Indexer Service stopped');
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            logger_1.default.info('\nShutting down Event Indexer Service...');
            await service.stop();
            logger_1.default.info('Event Indexer Service stopped');
            process.exit(0);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start Event Indexer Service:', error);
        process.exit(1);
    }
}
// Run service
main().catch((error) => {
    logger_1.default.error('Unhandled error in Event Indexer Service:', error);
    process.exit(1);
});
//# sourceMappingURL=standalone.js.map