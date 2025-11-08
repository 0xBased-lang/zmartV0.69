// ============================================================
// Event Indexer Service
// ============================================================
// Purpose: Main orchestrator for Solana event indexing
// Story: Week 1, Days 3-7 - Event Indexer Implementation
//
// Architecture:
// Helius Webhooks → Webhook Handler → Event Parser → Writers → Supabase
//
// Components:
// - EventParser: Extract events from transaction logs
// - MarketEventWriter: Market lifecycle events (7 events)
// - TradeEventWriter: Trading events (4 events)
// - VoteEventWriter: Voting events (2 events)
// - AdminEventWriter: Admin events (3 events)
// - WebhookHandler: Express route for Helius webhooks

import express, { Express } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import winston, { Logger } from 'winston';
import { EventParser } from './parsers/event-parser';
import { MarketEventWriter } from './writers/market-writer';
import { TradeEventWriter } from './writers/trade-writer';
import { VoteEventWriter } from './writers/vote-writer';
import { AdminEventWriter } from './writers/admin-writer';
import { WebhookHandler } from './handlers/webhook-handler';

export interface EventIndexerConfig {
  supabaseUrl: string;
  supabaseKey: string;
  heliusWebhookSecret?: string;
  port?: number;
  logLevel?: string;
}

export class EventIndexerService {
  private app: Express;
  private supabase!: SupabaseClient;
  private logger!: Logger;
  private eventParser!: EventParser;
  private marketWriter!: MarketEventWriter;
  private tradeWriter!: TradeEventWriter;
  private voteWriter!: VoteEventWriter;
  private adminWriter!: AdminEventWriter;
  private webhookHandler!: WebhookHandler;
  private server: any;

  constructor(private config: EventIndexerConfig) {
    this.app = express();
    this.app.use(express.json());
  }

  /**
   * Initialize all service components
   *
   * Sets up:
   * - Logger
   * - Supabase client
   * - Event parser
   * - All event writers (market, trade, vote, admin)
   * - Webhook handler
   */
  async initialize(): Promise<void> {
    // Setup logger
    this.logger = winston.createLogger({
      level: this.config.logLevel || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });

    this.logger.info('Initializing Event Indexer Service');

    // Setup Supabase client
    this.supabase = createClient(
      this.config.supabaseUrl,
      this.config.supabaseKey
    );

    // Initialize event parser
    // TODO: Get actual program ID from environment
    const programId = process.env.ZMART_PROGRAM_ID || 'PROGRAM_ID_PLACEHOLDER';
    this.eventParser = new EventParser(programId, this.logger);

    // Initialize writers
    this.marketWriter = new MarketEventWriter(this.supabase, this.logger);
    this.tradeWriter = new TradeEventWriter(this.supabase, this.logger);
    this.voteWriter = new VoteEventWriter(this.supabase, this.logger);
    this.adminWriter = new AdminEventWriter(this.supabase, this.logger);

    // Initialize webhook handler
    this.webhookHandler = new WebhookHandler(
      this.eventParser,
      this.marketWriter,
      this.tradeWriter,
      this.voteWriter,
      this.adminWriter,
      this.logger,
      this.config.heliusWebhookSecret
    );

    this.logger.info('Event Indexer Service initialized');
  }

  /**
   * Start the webhook server
   *
   * Sets up Express routes and starts listening for webhooks
   */
  async start(): Promise<void> {
    const port = this.config.port || 3001;

    // Setup webhook route
    this.app.post('/api/events/webhook', this.webhookHandler.handle);

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'event-indexer',
        timestamp: new Date().toISOString(),
      });
    });

    // Start server
    this.server = this.app.listen(port, () => {
      this.logger.info(`Event Indexer Service listening on port ${port}`);
    });
  }

  /**
   * Stop the webhook server
   *
   * Gracefully shuts down Express server
   */
  async stop(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve, reject) => {
        this.server.close((err: Error | undefined) => {
          if (err) {
            this.logger.error('Error stopping server', { error: err });
            reject(err);
          } else {
            this.logger.info('Event Indexer Service stopped');
            resolve();
          }
        });
      });
    }
  }
}

// Export all components for external use
export { EventParser } from './parsers/event-parser';
export { MarketEventWriter } from './writers/market-writer';
export { TradeEventWriter } from './writers/trade-writer';
export { VoteEventWriter } from './writers/vote-writer';
export { AdminEventWriter } from './writers/admin-writer';
export { WebhookHandler } from './handlers/webhook-handler';
export * from './types/events';
