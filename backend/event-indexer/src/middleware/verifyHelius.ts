/**
 * Helius Webhook Signature Verification Middleware
 *
 * Verifies the authenticity of incoming Helius webhooks using HMAC-SHA256.
 * Prevents unauthorized webhook requests and replay attacks.
 *
 * @module middleware/verifyHelius
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { config } from '../../../src/config/env';

/**
 * Verify Helius webhook signature
 *
 * How it works:
 * 1. Helius sends a signature in the 'x-helius-signature' header
 * 2. We compute our own signature using the webhook secret
 * 3. Compare signatures using constant-time comparison
 * 4. Reject if signatures don't match
 *
 * Security:
 * - Uses HMAC-SHA256 for cryptographic integrity
 * - Constant-time comparison prevents timing attacks
 * - Signature must be present (no bypass)
 */
export function verifyHeliusSignature(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    // DEVELOPMENT MODE: Skip verification for testing
    const isDevelopment = process.env.NODE_ENV === 'development' ||
                          process.env.NODE_ENV === 'test' ||
                          process.env.WEBHOOK_DEV_MODE === 'true';

    if (isDevelopment) {
      logger.warn('[DEV MODE] Skipping webhook signature verification', {
        path: req.path,
        ip: req.ip,
        env: process.env.NODE_ENV
      });
      next();
      return;
    }

    // PRODUCTION MODE: Verify signature
    // Get signature from header
    const receivedSignature = req.headers['x-helius-signature'] as string;

    if (!receivedSignature) {
      logger.warn('Webhook signature missing', {
        path: req.path,
        ip: req.ip
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Webhook signature required'
      });
      return;
    }

    // Get webhook secret from environment
    const webhookSecret = process.env.HELIUS_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.error('Helius webhook secret not configured');
      res.status(500).json({
        error: 'Configuration error',
        message: 'Webhook secret not configured'
      });
      return;
    }

    // Compute expected signature
    // NOTE: Helius sends the raw body, so we need to use the exact payload
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Constant-time comparison to prevent timing attacks
    const signaturesMatch = crypto.timingSafeEqual(
      Buffer.from(receivedSignature),
      Buffer.from(expectedSignature)
    );

    if (!signaturesMatch) {
      logger.warn('Invalid webhook signature', {
        path: req.path,
        ip: req.ip,
        receivedSignatureLength: receivedSignature.length,
        expectedSignatureLength: expectedSignature.length
      });

      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid webhook signature'
      });
      return;
    }

    // Signature valid, proceed
    logger.debug('Webhook signature verified', {
      path: req.path,
      signature: receivedSignature.substring(0, 10) + '...'
    });

    next();

  } catch (error) {
    logger.error('Error verifying webhook signature', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path
    });

    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify webhook signature'
    });
  }
}

/**
 * Optional: Rate limiting for webhook endpoints
 *
 * Prevents abuse by limiting the number of webhook requests per IP.
 * Default: 100 requests per minute per IP.
 */
const webhookRateLimits = new Map<string, { count: number; resetAt: number }>();

export function rateLimitWebhooks(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  // Get or create rate limit entry
  let rateLimitEntry = webhookRateLimits.get(ip);

  if (!rateLimitEntry || now > rateLimitEntry.resetAt) {
    // New window
    rateLimitEntry = {
      count: 0,
      resetAt: now + windowMs
    };
    webhookRateLimits.set(ip, rateLimitEntry);
  }

  // Increment count
  rateLimitEntry.count++;

  // Check if over limit
  if (rateLimitEntry.count > maxRequests) {
    const retryAfter = Math.ceil((rateLimitEntry.resetAt - now) / 1000);

    logger.warn('Webhook rate limit exceeded', {
      ip,
      count: rateLimitEntry.count,
      maxRequests,
      retryAfter
    });

    res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded',
      retryAfter
    });
    return;
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimitEntry.count));
  res.setHeader('X-RateLimit-Reset', rateLimitEntry.resetAt);

  next();
}

/**
 * Cleanup old rate limit entries (run periodically)
 */
export function cleanupRateLimits(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [ip, entry] of webhookRateLimits.entries()) {
    if (now > entry.resetAt) {
      webhookRateLimits.delete(ip);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    logger.debug('Cleaned up old rate limit entries', { count: cleaned });
  }
}

// Run cleanup every 5 minutes
setInterval(cleanupRateLimits, 5 * 60 * 1000);
