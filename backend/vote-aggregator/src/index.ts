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
import dotenv from 'dotenv';
import { createClient } from 'redis';
import { Connection, Keypair } from '@solana/web3.js';
import { createVoteRoutes } from './routes/voteRoutes';
import { AggregationService } from './services/aggregationService';
import { CronService } from './services/cronService';
import { createCacheMiddleware, createCacheInvalidationMiddleware } from './middleware/cacheMiddleware';
import { logger } from './utils/logger';
import bs58 from 'bs58';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Redis client
const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || '0')
});

// Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Load deployer keypair from environment
const DEPLOYER_SECRET_KEY = process.env.DEPLOYER_SECRET_KEY;
if (!DEPLOYER_SECRET_KEY) {
  throw new Error('DEPLOYER_SECRET_KEY environment variable is required');
}

const deployerKeypair = Keypair.fromSecretKey(
  bs58.decode(DEPLOYER_SECRET_KEY)
);

// Program ID
const PROGRAM_ID = process.env.PROGRAM_ID || '';
if (!PROGRAM_ID) {
  throw new Error('PROGRAM_ID environment variable is required');
}

// Initialize services
let aggregationService: AggregationService;
let cronService: CronService;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cache middleware (must be before routes)
app.use(createCacheMiddleware(redisClient));
app.use(createCacheInvalidationMiddleware(redisClient));

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
app.use('/api/votes', createVoteRoutes(redisClient));

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
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
async function start() {
  try {
    // Connect to Redis
    logger.info('Connecting to Redis...', {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || '6379'
    });

    await redisClient.connect();

    logger.info('Redis connected successfully');

    // Initialize aggregation service
    aggregationService = new AggregationService(
      redisClient,
      connection,
      PROGRAM_ID,
      deployerKeypair,
      {
        proposalThreshold: parseInt(process.env.PROPOSAL_THRESHOLD || '70'),
        disputeThreshold: parseInt(process.env.DISPUTE_THRESHOLD || '60'),
        minVotesRequired: parseInt(process.env.MIN_VOTES_REQUIRED || '10')
      }
    );

    logger.info('Aggregation service initialized');

    // Initialize and start cron service
    cronService = new CronService(aggregationService);
    cronService.start();

    logger.info('Cron service started');

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('Vote Aggregator Service started', {
        port: PORT,
        environment: process.env.NODE_ENV,
        network: process.env.SOLANA_NETWORK,
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
