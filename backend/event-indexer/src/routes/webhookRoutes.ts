/**
 * Webhook Routes
 *
 * Express routes for receiving Helius webhooks.
 */

import { Router, Request, Response } from 'express';
import { parseHeliusWebhook } from '../parsers/eventParser';
import { processEvent } from '../services/eventProcessor';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export function createWebhookRoutes(): Router {
  const router = Router();

  /**
   * POST /api/webhooks/helius
   *
   * Receives webhook events from Helius
   */
  router.post('/helius', async (req: Request, res: Response) => {
    try {
      // Verify webhook signature
      const isValid = verifyHeliusSignature(req);

      if (!isValid) {
        logger.warn('Invalid Helius webhook signature', {
          ip: req.ip,
          headers: req.headers
        });

        return res.status(401).json({
          error: 'Invalid signature'
        });
      }

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
 * Verify Helius webhook signature
 */
function verifyHeliusSignature(req: Request): boolean {
  const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.warn('HELIUS_WEBHOOK_SECRET not set, skipping signature verification');
    return true; // Allow in development
  }

  const signature = req.headers['x-helius-signature'] as string;

  if (!signature) {
    logger.warn('Missing x-helius-signature header');
    return false;
  }

  const body = JSON.stringify(req.body);
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  const isValid = signature === expectedSignature;

  if (!isValid) {
    logger.warn('Signature mismatch', {
      expected: expectedSignature.substring(0, 10) + '...',
      received: signature.substring(0, 10) + '...'
    });
  }

  return isValid;
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
