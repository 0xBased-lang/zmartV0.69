/**
 * ZMART Vote Aggregator Service
 *
 * Entry point for the vote aggregation service.
 * Collects votes off-chain and submits aggregated results on-chain.
 *
 * @module vote-aggregator
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from 'redis';
import { Connection, Keypair } from '@solana/web3.js';
import { createVoteRoutes } from './routes/voteRoutes';
import { AggregationService } from './services/aggregationService';
import { CronService } from './services/cronService';
import { createCacheMiddleware, createCacheInvalidationMiddleware } from './middleware/cacheMiddleware';
import { logger } from './utils/logger';
import bs58 from 'bs58';
import { config } from '../../src/config/env';

const app: Application = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4005; // Allow PORT override via env, default to 4005 to avoid conflict with api-gateway (4000) and websocket (4001)

// Redis client (from centralized config)
const redisClient = createClient({
  url: config.redis.url
});

// Solana connection (from centralized config)
const connection = new Connection(config.solana.rpcUrl, 'confirmed');

// Load deployer keypair from centralized config
const DEPLOYER_SECRET_KEY = config.solana.backendAuthorityPrivateKey;
if (!DEPLOYER_SECRET_KEY) {
  throw new Error('Backend authority private key is required (BACKEND_AUTHORITY_PRIVATE_KEY)');
}

const deployerKeypair = Keypair.fromSecretKey(
  bs58.decode(DEPLOYER_SECRET_KEY)
);

// Program ID (from centralized config)
const PROGRAM_ID = config.solana.programIds.core;

// Initialize services
let aggregationService: AggregationService;
let cronService: CronService;

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.api.corsOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache middleware (must be before routes)
// Type assertion needed due to Redis type conflicts between local and root installations
app.use(createCacheMiddleware(redisClient as any));
app.use(createCacheInvalidationMiddleware(redisClient as any));

// Health check endpoint
app.get('/health', async (req, res) => {
  const redisConnected = redisClient.isOpen;
  const cronStatus = cronService?.getStatus() || { isRunning: false };

  res.status(redisConnected ? 200 : 503).json({
    status: redisConnected && cronStatus.isRunning ? 'ok' : 'degraded',
    service: 'zmart-vote-aggregator',
    version: '1.0.0',
    redis: redisConnected ? 'connected' : 'disconnected',
    cron: cronStatus.isRunning ? 'running' : 'stopped',
    timestamp: new Date().toISOString()
  });
});

// Stats endpoint
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await aggregationService?.getStats();

    res.status(200).json({
      ...stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching stats', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to fetch stats'
    });
  }
});

// Manual trigger endpoint (for testing)
app.post('/api/trigger-aggregation', async (req, res) => {
  try {
    const results = await cronService?.triggerImmediateAggregation();

    res.status(200).json({
      success: true,
      ...results
    });
  } catch (error) {
    logger.error('Error triggering aggregation', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(500).json({
      error: 'Failed to trigger aggregation'
    });
  }
});

// Vote routes
// Type assertion needed due to Redis type conflicts
app.use('/api/votes', createVoteRoutes(redisClient as any));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(500).json({
    error: 'Internal server error',
    message: config.node.isDevelopment ? err.message : undefined
  });
});

// Start server
async function start() {
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...', {
      url: config.redis.url
    });

    await redisClient.connect();

    logger.info('Redis connected successfully');

    // Initialize aggregation service (using centralized config)
    // Type assertion needed due to Redis type conflicts
    aggregationService = new AggregationService(
      redisClient as any,
      connection,
      PROGRAM_ID,
      deployerKeypair,
      {
        proposalThreshold: config.services.proposalApprovalThreshold * 100, // Convert 0.7 to 70
        disputeThreshold: config.services.disputeThreshold * 100, // Convert 0.6 to 60
        minVotesRequired: config.services.minProposalVotes
      }
    );

    logger.info('Aggregation service initialized');

    // Initialize and start cron service
    cronService = new CronService(aggregationService);
    cronService.start();

    logger.info('Cron service started');

    // Derive network from RPC URL
    const network = config.solana.rpcUrl.includes('devnet') ? 'devnet' :
                   config.solana.rpcUrl.includes('testnet') ? 'testnet' :
                   config.solana.rpcUrl.includes('localhost') ? 'localnet' : 'mainnet';

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('Vote Aggregator Service started', {
        port: PORT,
        environment: config.node.env,
        network: network,
        programId: PROGRAM_ID,
        deployerPubkey: deployerKeypair.publicKey.toBase58(),
        healthCheck: `http://localhost:${PORT}/health`,
        stats: `http://localhost:${PORT}/api/stats`
      });
    });

  } catch (error) {
    logger.error('Failed to start service', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');

  // Stop cron service
  if (cronService) {
    cronService.stop();
    logger.info('Cron service stopped');
  }

  // Close Redis connection
  await redisClient.quit();
  logger.info('Redis connection closed');

  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');

  // Stop cron service
  if (cronService) {
    cronService.stop();
    logger.info('Cron service stopped');
  }

  // Close Redis connection
  await redisClient.quit();
  logger.info('Redis connection closed');

  process.exit(0);
});

if (require.main === module) {
  start();
}

export default app;
