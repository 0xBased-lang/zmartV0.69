/**
 * Webhook Routes
 *
 * Express routes for receiving Helius webhooks.
 */

import { Router, Request, Response } from 'express';
import { parseHeliusWebhook } from '../parsers/eventParser';
import { processEvent } from '../services/eventProcessor';
import { logger } from '../utils/logger';
import { verifyHeliusSignature, rateLimitWebhooks } from '../middleware/verifyHelius';

export function createWebhookRoutes(): Router {
  const router = Router();

  // Apply middleware to all webhook routes
  // 1. Rate limiting (100 req/min per IP)
  // 2. Signature verification (HMAC-SHA256)
  router.use(rateLimitWebhooks);
  router.use(verifyHeliusSignature);

  /**
   * POST /api/webhooks/helius
   *
   * Receives webhook events from Helius
   * Note: Signature already verified by middleware
   */
  router.post('/helius', async (req: Request, res: Response) => {
    try {
      const payload = req.body;

      logger.info('Received Helius webhook', {
        signature: payload.signature,
        slot: payload.slot,
        type: payload.type
      });

      // Parse webhook into events
      const events = parseHeliusWebhook(payload);

      if (events.length === 0) {
        logger.info('No events parsed from webhook', {
          signature: payload.signature
        });

        return res.status(200).json({
          received: true,
          eventsProcessed: 0
        });
      }

      logger.info('Parsed events from webhook', {
        signature: payload.signature,
        eventCount: events.length,
        eventTypes: events.map(e => e.type)
      });

      // Process events (async, don't wait)
      processEventsAsync(events);

      // Return 200 immediately (Helius requires fast response)
      res.status(200).json({
        received: true,
        eventsProcessed: events.length
      });

    } catch (error) {
      logger.error('Error handling Helius webhook', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Still return 200 to prevent Helius from retrying
      res.status(200).json({
        received: true,
        error: 'Internal error'
      });
    }
  });

  /**
   * GET /api/webhooks/health
   *
   * Health check for webhook endpoint
   */
  router.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'event-indexer',
      endpoint: 'webhooks',
      timestamp: new Date().toISOString()
    });
  });

  return router;
}

/**
 * Process events asynchronously (don't block webhook response)
 */
async function processEventsAsync(events: any[]): Promise<void> {
  for (const event of events) {
    try {
      await processEvent(event);
    } catch (error) {
      logger.error('Error processing event async', {
        type: event.type,
        signature: event.txSignature,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
