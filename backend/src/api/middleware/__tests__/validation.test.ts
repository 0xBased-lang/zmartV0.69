/**
 * API Request Validation Middleware Tests
 *
 * Comprehensive test coverage for src/api/middleware/validation.ts
 * Coverage Target: 100%
 *
 * Test Categories:
 * 1. All schema validations (createMarket, buyTrade, sellTrade, votes, etc.)
 * 2. validate() middleware function
 * 3. validateQuery() middleware function
 * 4. validateParams() middleware function
 * 5. Error handling and ApiError integration
 */

import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import {
  schemas,
  validate,
  validateQuery,
  validateParams,
} from "../validation";
import { ApiError } from "../error-handler";

// Mock Express request/response/next
const mockRequest = (body: any = {}, query: any = {}, params: any = {}) =>
  ({
    body,
    query,
    params,
  } as Request);

const mockResponse = () => {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext = jest.fn() as NextFunction;

describe("API Middleware Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("schemas.createMarket", () => {
    it("should accept valid market creation data", () => {
      const validData = {
        question: "Will Bitcoin reach $100k in 2025?",
        category: "crypto",
        end_date: new Date("2025-12-31"),
        liquidity: 5_000_000_000, // 5 SOL
      };

      const { error, value } = schemas.createMarket.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toMatchObject(validData);
    });

    it("should reject question < 10 characters", () => {
      const data = {
        question: "Short?",
        category: "crypto",
        end_date: new Date("2025-12-31"),
        liquidity: 5_000_000_000,
      };

      const { error } = schemas.createMarket.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject question > 200 characters", () => {
      const data = {
        question: "A".repeat(201),
        category: "crypto",
        end_date: new Date("2025-12-31"),
        liquidity: 5_000_000_000,
      };

      const { error } = schemas.createMarket.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject invalid category", () => {
      const data = {
        question: "Valid question here?",
        category: "invalid_category",
        end_date: new Date("2025-12-31"),
        liquidity: 5_000_000_000,
      };

      const { error } = schemas.createMarket.validate(data);
      expect(error).toBeDefined();
    });

    it("should accept all valid categories", () => {
      const categories = ["crypto", "sports", "politics", "other"];

      categories.forEach((category) => {
        const data = {
          question: "Valid question here?",
          category,
          end_date: new Date("2025-12-31"),
          liquidity: 5_000_000_000,
        };

        const { error } = schemas.createMarket.validate(data);
        expect(error).toBeUndefined();
      });
    });

    it("should reject end_date in the past", () => {
      const data = {
        question: "Valid question here?",
        category: "crypto",
        end_date: new Date("2020-01-01"),
        liquidity: 5_000_000_000,
      };

      const { error } = schemas.createMarket.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject liquidity < 1 SOL (1B lamports)", () => {
      const data = {
        question: "Valid question here?",
        category: "crypto",
        end_date: new Date("2025-12-31"),
        liquidity: 999_999_999, // Just under 1 SOL
      };

      const { error } = schemas.createMarket.validate(data);
      expect(error).toBeDefined();
    });

    it("should accept liquidity = exactly 1 SOL", () => {
      const data = {
        question: "Valid question here?",
        category: "crypto",
        end_date: new Date("2025-12-31"),
        liquidity: 1_000_000_000,
      };

      const { error } = schemas.createMarket.validate(data);
      expect(error).toBeUndefined();
    });

    it("should reject missing required fields", () => {
      const data = {
        question: "Valid question here?",
        // Missing category, end_date, liquidity
      };

      const { error } = schemas.createMarket.validate(data);
      expect(error).toBeDefined();
      expect(error?.details.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("schemas.buyTrade", () => {
    it("should accept valid buy trade data", () => {
      const validData = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: true,
        shares: 1_000_000, // 0.001 shares (min)
        max_cost: 100_000_000, // 0.1 SOL
      };

      const { error, value } = schemas.buyTrade.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it("should reject invalid market_id format", () => {
      const data = {
        market_id: "not-a-uuid",
        outcome: true,
        shares: 1_000_000,
        max_cost: 100_000_000,
      };

      const { error } = schemas.buyTrade.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject shares < minimum (1M lamports = 0.001 shares)", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: true,
        shares: 999_999,
        max_cost: 100_000_000,
      };

      const { error } = schemas.buyTrade.validate(data);
      expect(error).toBeDefined();
    });

    it("should accept outcome = true (YES)", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: true,
        shares: 1_000_000,
        max_cost: 100_000_000,
      };

      const { error } = schemas.buyTrade.validate(data);
      expect(error).toBeUndefined();
    });

    it("should accept outcome = false (NO)", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: false,
        shares: 1_000_000,
        max_cost: 100_000_000,
      };

      const { error } = schemas.buyTrade.validate(data);
      expect(error).toBeUndefined();
    });

    it("should accept max_cost = 0 (no slippage protection)", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: true,
        shares: 1_000_000,
        max_cost: 0,
      };

      const { error } = schemas.buyTrade.validate(data);
      expect(error).toBeUndefined();
    });

    it("should reject negative max_cost", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: true,
        shares: 1_000_000,
        max_cost: -1,
      };

      const { error } = schemas.buyTrade.validate(data);
      expect(error).toBeDefined();
    });
  });

  describe("schemas.sellTrade", () => {
    it("should accept valid sell trade data", () => {
      const validData = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: true,
        shares: 1_000_000,
        min_proceeds: 90_000_000,
      };

      const { error, value } = schemas.sellTrade.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it("should accept min_proceeds = 0", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: false,
        shares: 1_000_000,
        min_proceeds: 0,
      };

      const { error } = schemas.sellTrade.validate(data);
      expect(error).toBeUndefined();
    });

    it("should reject negative min_proceeds", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: true,
        shares: 1_000_000,
        min_proceeds: -1,
      };

      const { error } = schemas.sellTrade.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject shares < minimum", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: true,
        shares: 999_999,
        min_proceeds: 90_000_000,
      };

      const { error } = schemas.sellTrade.validate(data);
      expect(error).toBeDefined();
    });
  });

  describe("schemas.proposalVote", () => {
    it("should accept valid proposal vote (like)", () => {
      const validData = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        vote: true,
      };

      const { error, value } = schemas.proposalVote.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it("should accept valid proposal vote (dislike)", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        vote: false,
      };

      const { error } = schemas.proposalVote.validate(data);
      expect(error).toBeUndefined();
    });

    it("should reject invalid market_id", () => {
      const data = {
        market_id: "invalid",
        vote: true,
      };

      const { error } = schemas.proposalVote.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject missing vote", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
      };

      const { error } = schemas.proposalVote.validate(data);
      expect(error).toBeDefined();
    });
  });

  describe("schemas.disputeVote", () => {
    it("should accept valid dispute vote (agree)", () => {
      const validData = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        vote: true,
      };

      const { error, value } = schemas.disputeVote.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it("should accept valid dispute vote (disagree)", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        vote: false,
      };

      const { error } = schemas.disputeVote.validate(data);
      expect(error).toBeUndefined();
    });
  });

  describe("schemas.createDiscussion", () => {
    it("should accept valid discussion", () => {
      const validData = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        content: "This is my opinion on this market.",
      };

      const { error, value } = schemas.createDiscussion.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it("should accept content up to 1000 characters", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        content: "a".repeat(1000),
      };

      const { error } = schemas.createDiscussion.validate(data);
      expect(error).toBeUndefined();
    });

    it("should reject content > 1000 characters", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        content: "a".repeat(1001),
      };

      const { error } = schemas.createDiscussion.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject empty content", () => {
      const data = {
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        content: "",
      };

      const { error } = schemas.createDiscussion.validate(data);
      expect(error).toBeDefined();
    });
  });

  describe("schemas.resolveMarket", () => {
    it("should accept valid resolution (YES)", () => {
      const validData = {
        outcome: true,
        ipfs_evidence_hash: "QmX8j9k3L5m6N7o8P9q0R1s2T3u4V5w6X7y8Z9a0B1c2D3",
      };

      const { error, value } = schemas.resolveMarket.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it("should accept valid resolution (NO)", () => {
      const data = {
        outcome: false,
        ipfs_evidence_hash: "QmX8j9k3L5m6N7o8P9q0R1s2T3u4V5w6X7y8Z9a0B1c2D3",
      };

      const { error } = schemas.resolveMarket.validate(data);
      expect(error).toBeUndefined();
    });

    it("should accept valid resolution (INVALID)", () => {
      const data = {
        outcome: null,
        ipfs_evidence_hash: "QmX8j9k3L5m6N7o8P9q0R1s2T3u4V5w6X7y8Z9a0B1c2D3",
      };

      const { error } = schemas.resolveMarket.validate(data);
      expect(error).toBeUndefined();
    });

    it("should reject IPFS hash != 46 characters", () => {
      const data = {
        outcome: true,
        ipfs_evidence_hash: "Qm123", // Too short
      };

      const { error } = schemas.resolveMarket.validate(data);
      expect(error).toBeDefined();
    });

    it("should accept exactly 46-character IPFS CID", () => {
      const data = {
        outcome: true,
        ipfs_evidence_hash: "Q" + "m".repeat(45), // Exactly 46 chars
      };

      const { error } = schemas.resolveMarket.validate(data);
      expect(error).toBeUndefined();
    });
  });

  describe("schemas.userWallet", () => {
    it("should accept valid Solana wallet address", () => {
      const validData = {
        wallet: "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS",
      };

      const { error, value } = schemas.userWallet.validate(validData);

      expect(error).toBeUndefined();
      expect(value).toEqual(validData);
    });

    it("should reject wallet address < 32 characters", () => {
      const data = {
        wallet: "short",
      };

      const { error } = schemas.userWallet.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject wallet address > 44 characters", () => {
      const data = {
        wallet: "a".repeat(45),
      };

      const { error } = schemas.userWallet.validate(data);
      expect(error).toBeDefined();
    });

    it("should reject wallet with invalid characters", () => {
      const data = {
        wallet: "0OIl" + "a".repeat(40), // Contains confusing characters
      };

      const { error } = schemas.userWallet.validate(data);
      expect(error).toBeDefined();
    });

    it("should accept 32-character minimum address", () => {
      const data = {
        wallet: "1" + "a".repeat(31), // 32 chars
      };

      const { error } = schemas.userWallet.validate(data);
      expect(error).toBeUndefined();
    });

    it("should accept 44-character maximum address", () => {
      const data = {
        wallet: "1" + "a".repeat(43), // 44 chars
      };

      const { error } = schemas.userWallet.validate(data);
      expect(error).toBeUndefined();
    });
  });

  describe("validate() middleware", () => {
    const testSchema = schemas.proposalVote;

    it("should call next() with valid data", () => {
      const req = mockRequest({ market_id: "123e4567-e89b-12d3-a456-426614174000", vote: true });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validate(testSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should replace req.body with validated value", () => {
      const req = mockRequest({
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        vote: true,
        extra_field: "should be removed",
      });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validate(testSchema);
      middleware(req, res, next);

      expect(req.body).toEqual({
        market_id: "123e4567-e89b-12d3-a456-426614174000",
        vote: true,
      });
      expect(req.body).not.toHaveProperty("extra_field");
    });

    it("should throw ApiError for invalid data", () => {
      const req = mockRequest({ market_id: "invalid", vote: true });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validate(testSchema);

      expect(() => middleware(req, res, next)).toThrow(ApiError);
      expect(next).not.toHaveBeenCalled();
    });

    it("should include validation details in ApiError", () => {
      const req = mockRequest({ market_id: "invalid", vote: "not-boolean" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validate(testSchema);

      try {
        middleware(req, res, next);
        fail("Should have thrown ApiError");
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        const apiError = error as ApiError;
        expect(apiError.statusCode).toBe(400);
        expect(apiError.message).toContain("Validation failed");
        expect(apiError.details).toBeDefined();
        expect(Array.isArray(apiError.details)).toBe(true);
      }
    });

    it("should return all validation errors (abortEarly: false)", () => {
      const req = mockRequest({ market_id: "invalid" }); // Missing vote, invalid ID
      const res = mockResponse();
      const next = mockNext;

      const middleware = validate(testSchema);

      try {
        middleware(req, res, next);
        fail("Should have thrown ApiError");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.details).toBeDefined();
        expect((apiError.details as any[]).length).toBeGreaterThan(1);
      }
    });
  });

  describe("validateQuery() middleware", () => {
    // Create a simple query schema for testing
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(20),
    });

    it("should call next() with valid query", () => {
      const req = mockRequest({}, { page: "2", limit: "50" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateQuery(querySchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should replace req.query with validated value", () => {
      const req = mockRequest({}, { page: "2", limit: "50" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateQuery(querySchema);
      middleware(req, res, next);

      expect(req.query).toEqual({ page: 2, limit: 50 });
    });

    it("should apply default values to query", () => {
      const req = mockRequest({}, {});
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateQuery(querySchema);
      middleware(req, res, next);

      expect(req.query).toEqual({ page: 1, limit: 20 });
    });

    it("should throw ApiError for invalid query", () => {
      const req = mockRequest({}, { page: "0" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateQuery(querySchema);

      expect(() => middleware(req, res, next)).toThrow(ApiError);
    });

    it("should have correct error message for query validation", () => {
      const req = mockRequest({}, { page: "-1" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateQuery(querySchema);

      try {
        middleware(req, res, next);
        fail("Should have thrown ApiError");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.message).toContain("Query validation failed");
      }
    });
  });

  describe("validateParams() middleware", () => {
    // Create a simple params schema for testing
    const paramsSchema = Joi.object({
      id: Joi.string().uuid().required(),
    });

    it("should call next() with valid params", () => {
      const req = mockRequest({}, {}, { id: "123e4567-e89b-12d3-a456-426614174000" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateParams(paramsSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it("should replace req.params with validated value", () => {
      const req = mockRequest({}, {}, { id: "123e4567-e89b-12d3-a456-426614174000" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateParams(paramsSchema);
      middleware(req, res, next);

      expect(req.params).toEqual({ id: "123e4567-e89b-12d3-a456-426614174000" });
    });

    it("should throw ApiError for invalid params", () => {
      const req = mockRequest({}, {}, { id: "not-a-uuid" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateParams(paramsSchema);

      expect(() => middleware(req, res, next)).toThrow(ApiError);
    });

    it("should have correct error message for param validation", () => {
      const req = mockRequest({}, {}, { id: "invalid" });
      const res = mockResponse();
      const next = mockNext;

      const middleware = validateParams(paramsSchema);

      try {
        middleware(req, res, next);
        fail("Should have thrown ApiError");
      } catch (error) {
        const apiError = error as ApiError;
        expect(apiError.message).toContain("Parameter validation failed");
      }
    });
  });
});
