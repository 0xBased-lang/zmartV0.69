"use strict";
// ============================================================
// Request Validation Middleware
// ============================================================
// Purpose: Validate API requests with Joi schemas
// Story: 2.4 (Day 12)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.schemas = void 0;
exports.validate = validate;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const joi_1 = __importDefault(require("joi"));
const error_handler_1 = require("./error-handler");
/**
 * Validation schemas for API endpoints
 */
exports.schemas = {
    // Market schemas
    createMarket: joi_1.default.object({
        question: joi_1.default.string().min(10).max(200).required(),
        category: joi_1.default.string()
            .valid("crypto", "sports", "politics", "other")
            .required(),
        end_date: joi_1.default.date().greater("now").required(),
        liquidity: joi_1.default.number().min(1_000_000_000).required(), // 1 SOL minimum (9 decimals)
    }),
    // Trade schemas
    buyTrade: joi_1.default.object({
        market_id: joi_1.default.string().uuid().required(),
        outcome: joi_1.default.boolean().required(),
        shares: joi_1.default.number().integer().min(1_000_000).required(), // Minimum 0.001 shares (9 decimals)
        max_cost: joi_1.default.number().integer().min(0).required(), // Slippage protection (9 decimals)
    }),
    sellTrade: joi_1.default.object({
        market_id: joi_1.default.string().uuid().required(),
        outcome: joi_1.default.boolean().required(),
        shares: joi_1.default.number().integer().min(1_000_000).required(),
        min_proceeds: joi_1.default.number().integer().min(0).required(), // Slippage protection
    }),
    // Vote schemas
    proposalVote: joi_1.default.object({
        market_id: joi_1.default.string().required(), // Accept any string ID (UUID or custom ID)
        vote: joi_1.default.boolean().required(), // true = like, false = dislike
    }),
    disputeVote: joi_1.default.object({
        market_id: joi_1.default.string().required(), // Accept any string ID (UUID or custom ID)
        vote: joi_1.default.boolean().required(), // true = agree with resolution, false = disagree
    }),
    // Discussion schemas
    createDiscussion: joi_1.default.object({
        market_id: joi_1.default.string().uuid().required(),
        content: joi_1.default.string().min(1).max(1000).required(),
    }),
    // Resolution schemas
    resolveMarket: joi_1.default.object({
        outcome: joi_1.default.boolean().allow(null).required(), // true = YES, false = NO, null = INVALID
        ipfs_evidence_hash: joi_1.default.string().min(46).max(46).required(), // IPFS CID format
    }),
    // User schemas
    userWallet: joi_1.default.object({
        wallet: joi_1.default.string()
            .pattern(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/) // Solana address
            .required(),
    }),
};
/**
 * Validate request middleware factory
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, // Return all errors
            stripUnknown: true, // Remove unknown fields
        });
        if (error) {
            const details = error.details.map((detail) => ({
                field: detail.path.join("."),
                message: detail.message,
            }));
            throw new error_handler_1.ApiError(400, "Validation failed", details);
        }
        // Replace request body with validated/sanitized value
        req.body = value;
        next();
    };
}
/**
 * Validate query parameters
 */
function validateQuery(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const details = error.details.map((detail) => ({
                field: detail.path.join("."),
                message: detail.message,
            }));
            throw new error_handler_1.ApiError(400, "Query validation failed", details);
        }
        req.query = value;
        next();
    };
}
/**
 * Validate route parameters
 */
function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const details = error.details.map((detail) => ({
                field: detail.path.join("."),
                message: detail.message,
            }));
            throw new error_handler_1.ApiError(400, "Parameter validation failed", details);
        }
        req.params = value;
        next();
    };
}
//# sourceMappingURL=validation.js.map