// ============================================================
// Webhook Handler
// ============================================================
// Purpose: Handle Helius webhook events and route to appropriate writers
// Story: Week 1, Days 3-7 - Event Indexer Implementation

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Logger } from 'winston';
import { HeliusWebhookPayload, HeliusTransaction, ProgramEvent } from '../types/events';
import { EventParser } from '../parsers/event-parser';
import { MarketEventWriter } from '../writers/market-writer';
import { TradeEventWriter } from '../writers/trade-writer';
import { VoteEventWriter } from '../writers/vote-writer';
import { AdminEventWriter } from '../writers/admin-writer';

export class WebhookHandler {
  constructor(
    private eventParser: EventParser,
    private marketWriter: MarketEventWriter,
    private tradeWriter: TradeEventWriter,
    private voteWriter: VoteEventWriter,
    private adminWriter: AdminEventWriter,
    private logger: Logger,
    private webhookSecret?: string
  ) {}

  /**
   * Main webhook handler
   *
   * Flow:
   * 1. Verify HMAC signature (if webhookSecret provided)
   * 2. Parse webhook payload
   * 3. Extract events from transactions
   * 4. Route each event to appropriate writer
   * 5. Return success/failure response
   */
  handle = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const startTime = Date.now();

    try {
      // Verify webhook signature
      if (this.webhookSecret) {
        const signature = req.headers['x-helius-signature'] as string;
        if (!this.verifySignature(req.body, signature)) {
          this.logger.warn('Invalid webhook signature', {
            headers: req.headers,
          });
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
      }

      const payload: HeliusWebhookPayload = req.body;

      this.logger.info('Received webhook', {
        transactionCount: payload.length,
      });

      // Process each transaction
      const results = await Promise.allSettled(
        payload.map((tx: HeliusTransaction) => this.processTransaction(tx))
      );

      // Count successes and failures
      const successes = results.filter((r: PromiseSettledResult<void>) => r.status === 'fulfilled').length;
      const failures = results.filter((r: PromiseSettledResult<void>) => r.status === 'rejected').length;

      this.logger.info('Webhook processing complete', {
        total: payload.length,
        successes,
        failures,
        processingTime: Date.now() - startTime,
      });

      res.status(200).json({
        success: true,
        processed: successes,
        failed: failures,
        processingTime: Date.now() - startTime,
      });
    } catch (error) {
      this.logger.error('Webhook handler error', { error });
      next(error);
    }
  };

  /**
   * Process a single transaction
   *
   * Extracts all events from transaction logs and routes to writers
   */
  private async processTransaction(
    transaction: HeliusTransaction
  ): Promise<void> {
    try {
      const events = this.eventParser.parseTransaction(transaction);

      if (events.length === 0) {
        this.logger.debug('No events found in transaction', {
          signature: transaction.signature,
        });
        return;
      }

      this.logger.info('Extracted events from transaction', {
        signature: transaction.signature,
        eventCount: events.length,
        eventTypes: events.map((e: ProgramEvent) => e.type),
      });

      // Process each event
      for (const event of events) {
        await this.routeEvent(event);
      }
    } catch (error) {
      this.logger.error('Error processing transaction', {
        error,
        signature: transaction.signature,
      });
      throw error;
    }
  }

  /**
   * Route event to appropriate writer based on event type
   */
  private async routeEvent(event: any): Promise<void> {
    try {
      let result;

      switch (event.type) {
        // Market lifecycle events
        case 'MarketProposed':
          result = await this.marketWriter.writeMarketProposed(event);
          break;
        case 'MarketApproved':
          result = await this.marketWriter.writeMarketApproved(event);
          break;
        case 'MarketActivated':
          result = await this.marketWriter.writeMarketActivated(event);
          break;
        case 'MarketResolved':
          result = await this.marketWriter.writeMarketResolved(event);
          break;
        case 'DisputeInitiated':
          result = await this.marketWriter.writeDisputeInitiated(event);
          break;
        case 'MarketFinalized':
          result = await this.marketWriter.writeMarketFinalized(event);
          break;
        case 'MarketCancelled':
          result = await this.marketWriter.writeMarketCancelled(event);
          break;

        // Trading events
        case 'SharesBought':
          result = await this.tradeWriter.writeSharesBought(event);
          break;
        case 'SharesSold':
          result = await this.tradeWriter.writeSharesSold(event);
          break;
        case 'WinningsClaimed':
          result = await this.tradeWriter.writeWinningsClaimed(event);
          break;
        case 'LiquidityWithdrawn':
          result = await this.tradeWriter.writeLiquidityWithdrawn(event);
          break;

        // Voting events
        case 'ProposalVoteSubmitted':
          result = await this.voteWriter.writeProposalVote(event);
          break;
        case 'DisputeVoteSubmitted':
          result = await this.voteWriter.writeDisputeVote(event);
          break;

        // Admin events
        case 'ConfigInitialized':
          result = await this.adminWriter.writeConfigInitialized(event);
          break;
        case 'ConfigUpdated':
          result = await this.adminWriter.writeConfigUpdated(event);
          break;
        case 'EmergencyPauseToggled':
          result = await this.adminWriter.writeEmergencyPauseToggled(event);
          break;

        default:
          this.logger.warn('Unknown event type', { eventType: event.type });
          return;
      }

      if (result && !result.success) {
        this.logger.error('Event write failed', {
          eventType: event.type,
          txSignature: event.txSignature,
          error: result.error,
        });
      }
    } catch (error) {
      this.logger.error('Error routing event', {
        error,
        eventType: event.type,
      });
      throw error;
    }
  }

  /**
   * Verify Helius webhook signature using HMAC-SHA256
   */
  private verifySignature(payload: any, signature: string): boolean {
    if (!this.webhookSecret || !signature) {
      return false;
    }

    const hmac = crypto.createHmac('sha256', this.webhookSecret);
    const digest = hmac.update(JSON.stringify(payload)).digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(digest)
    );
  }
}
