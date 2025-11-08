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

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'zmart-vote-aggregator',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Routes (to be implemented)
app.use('/api/votes', (req, res) => {
  res.status(501).json({ message: 'Vote endpoints not yet implemented' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Vote Aggregator Service running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🌐 Network: ${process.env.SOLANA_NETWORK}`);
    console.log(`✅ Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
