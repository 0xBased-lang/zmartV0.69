// ============================================================
// Request Validation Middleware
// ============================================================
// Purpose: Validate API requests with Joi schemas
// Story: 2.4 (Day 12)

import Joi from "joi";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "./error-handler";

/**
 * Validation schemas for API endpoints
 */
export const schemas = {
  // Market schemas
  createMarket: Joi.object({
    question: Joi.string().min(10).max(200).required(),
    category: Joi.string()
      .valid("crypto", "sports", "politics", "other")
      .required(),
    end_date: Joi.date().greater("now").required(),
    liquidity: Joi.number().min(1_000_000_000).required(), // 1 SOL minimum (9 decimals)
  }),

  // Trade schemas
  buyTrade: Joi.object({
    market_id: Joi.string().uuid().required(),
    outcome: Joi.boolean().required(),
    shares: Joi.number().integer().min(1_000_000).required(), // Minimum 0.001 shares (9 decimals)
    max_cost: Joi.number().integer().min(0).required(), // Slippage protection (9 decimals)
  }),

  sellTrade: Joi.object({
    market_id: Joi.string().uuid().required(),
    outcome: Joi.boolean().required(),
    shares: Joi.number().integer().min(1_000_000).required(),
    min_proceeds: Joi.number().integer().min(0).required(), // Slippage protection
  }),

  // Vote schemas
  proposalVote: Joi.object({
    market_id: Joi.string().uuid().required(),
    vote: Joi.boolean().required(), // true = like, false = dislike
  }),

  disputeVote: Joi.object({
    market_id: Joi.string().uuid().required(),
    vote: Joi.boolean().required(), // true = agree with resolution, false = disagree
  }),

  // Discussion schemas
  createDiscussion: Joi.object({
    market_id: Joi.string().uuid().required(),
    content: Joi.string().min(1).max(1000).required(),
  }),

  // Resolution schemas
  resolveMarket: Joi.object({
    outcome: Joi.boolean().allow(null).required(), // true = YES, false = NO, null = INVALID
    ipfs_evidence_hash: Joi.string().min(46).max(46).required(), // IPFS CID format
  }),

  // User schemas
  userWallet: Joi.object({
    wallet: Joi.string()
      .pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/) // Solana address
      .required(),
  }),
};

/**
 * Validate request middleware factory
 */
export function validate(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      throw new ApiError(400, "Validation failed", details);
    }

    // Replace request body with validated/sanitized value
    req.body = value;
    next();
  };
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      throw new ApiError(400, "Query validation failed", details);
    }

    req.query = value;
    next();
  };
}

/**
 * Validate route parameters
 */
export function validateParams(schema: Joi.ObjectSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      throw new ApiError(400, "Parameter validation failed", details);
    }

    req.params = value;
    next();
  };
}
