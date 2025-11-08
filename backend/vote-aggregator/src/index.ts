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
import { createVoteRoutes } from './routes/voteRoutes';
import { logger } from './utils/logger';

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

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', async (req, res) => {
  const redisConnected = redisClient.isOpen;

  res.status(redisConnected ? 200 : 503).json({
    status: redisConnected ? 'ok' : 'degraded',
    service: 'zmart-vote-aggregator',
    version: '1.0.0',
    redis: redisConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
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

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('Vote Aggregator Service started', {
        port: PORT,
        environment: process.env.NODE_ENV,
        network: process.env.SOLANA_NETWORK,
        healthCheck: `http://localhost:${PORT}/health`
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

  await redisClient.quit();
  logger.info('Redis connection closed');

  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');

  await redisClient.quit();
  logger.info('Redis connection closed');

  process.exit(0);
});

if (require.main === module) {
  start();
}

export default app;
