/**
 * Vote Routes
 *
 * API endpoints for vote submission.
 */

import { Router, Request, Response } from 'express';
import { VoteService, VoteSubmission } from '../services/voteService';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';
import rateLimit from 'express-rate-limit';

// Rate limiting configuration (constant defaults)
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per window

export function createVoteRoutes(redisClient: RedisClientType): Router {
  const router = Router();
  const voteService = new VoteService(redisClient);

  // Rate limiting: 100 requests per minute per IP
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false
  });

  router.use(limiter);

  /**
   * POST /api/votes/proposal/:marketId
   *
   * Submit a proposal vote (like/dislike)
   */
  router.post('/proposal/:marketId', async (req: Request, res: Response) => {
    try {
      const { marketId } = req.params;
      const submission: VoteSubmission = req.body;

      // Validate request body
      if (!submission.vote || !submission.signature || !submission.publicKey || !submission.message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: vote, signature, publicKey, message'
        });
      }

      // Submit vote
      const result = await voteService.submitProposalVote(marketId, submission);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);

    } catch (error) {
      logger.error('Error in POST /api/votes/proposal/:marketId', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * POST /api/votes/dispute/:marketId
   *
   * Submit a dispute vote (agree/disagree)
   */
  router.post('/dispute/:marketId', async (req: Request, res: Response) => {
    try {
      const { marketId } = req.params;
      const submission: VoteSubmission = req.body;

      // Validate request body
      if (!submission.vote || !submission.signature || !submission.publicKey || !submission.message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: vote, signature, publicKey, message'
        });
      }

      // Submit vote
      const result = await voteService.submitDisputeVote(marketId, submission);

      if (!result.success) {
        return res.status(400).json(result);
      }

      return res.status(200).json(result);

    } catch (error) {
      logger.error('Error in POST /api/votes/dispute/:marketId', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/votes/proposal/:marketId
   *
   * Get proposal vote counts for a market
   */
  router.get('/proposal/:marketId', async (req: Request, res: Response) => {
    try {
      const { marketId } = req.params;
      const counts = await voteService.getVoteCounts(marketId, 'proposal');

      return res.status(200).json({
        success: true,
        marketId,
        counts
      });

    } catch (error) {
      logger.error('Error in GET /api/votes/proposal/:marketId', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  /**
   * GET /api/votes/dispute/:marketId
   *
   * Get dispute vote counts for a market
   */
  router.get('/dispute/:marketId', async (req: Request, res: Response) => {
    try {
      const { marketId } = req.params;
      const counts = await voteService.getVoteCounts(marketId, 'dispute');

      return res.status(200).json({
        success: true,
        marketId,
        counts
      });

    } catch (error) {
      logger.error('Error in GET /api/votes/dispute/:marketId', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  });

  return router;
}
