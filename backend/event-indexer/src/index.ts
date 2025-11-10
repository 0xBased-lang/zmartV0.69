/**
 * ZMART Event Indexer Service
 *
 * Entry point for the event indexing service.
 * Receives Helius webhooks and indexes events to Supabase.
 *
 * @module event-indexer
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createWebhookRoutes } from './routes/webhookRoutes';
import { initSupabase, testConnection } from './services/supabaseClient';
import { logger } from './utils/logger';
import { config } from '../../src/config/env';

const app: Application = express();
const PORT = config.api.port + 2; // Event indexer runs on API port + 2 (e.g., 3002 if API is 3000)

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.api.corsOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' })); // Helius webhooks can be large
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;

    logger.info('HTTP request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();

    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? 'ok' : 'degraded',
      service: 'zmart-event-indexer',
      version: '1.0.0',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'zmart-event-indexer',
      version: '1.0.0',
      database: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Webhook routes
app.use('/api/webhooks', createWebhookRoutes());

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
    // Initialize Supabase
    logger.info('Initializing Supabase connection...');
    initSupabase();

    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }

    logger.info('Database connection successful');

    // Start HTTP server
    app.listen(PORT, () => {
      // Derive network from RPC URL
      const network = config.solana.rpcUrl.includes('devnet') ? 'devnet' :
                     config.solana.rpcUrl.includes('testnet') ? 'testnet' :
                     config.solana.rpcUrl.includes('localhost') ? 'localnet' : 'mainnet';

      logger.info('Event Indexer Service started', {
        port: PORT,
        environment: config.node.env,
        network: network,
        programId: config.solana.programIds.core,
        healthCheck: `http://localhost:${PORT}/health`,
        webhookEndpoint: `http://localhost:${PORT}/api/webhooks/helius`
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
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  process.exit(0);
});

if (require.main === module) {
  start();
}

export default app;
