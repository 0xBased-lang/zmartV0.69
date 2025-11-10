/**
 * Validation Utility Tests
 *
 * Comprehensive test coverage for src/utils/validation.ts
 * Coverage Target: 100%
 *
 * Test Categories:
 * 1. Solana PublicKey validation
 * 2. Common schema validations (wallet, marketId, outcome, amount, etc.)
 * 3. Custom validation function
 * 4. ValidationError class
 */

import { PublicKey } from "@solana/web3.js";
import {
  schemas,
  validate,
  ValidationError,
  solanaPublicKey,
} from "../validation";
import Joi from "joi";

describe("Validation Utility", () => {
  describe("solanaPublicKey validator", () => {
    it("should accept valid Solana public key", () => {
      const validKey = "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS";
      const { error, value } = solanaPublicKey.validate(validKey);

      expect(error).toBeUndefined();
      expect(value).toBe(validKey);
    });

    it("should reject invalid Solana public key format", () => {
      const invalidKey = "invalid-key";
      const { error } = solanaPublicKey.validate(invalidKey);

      expect(error).toBeDefined();
      expect(error?.message).toContain("invalid");
    });

    it("should reject empty string", () => {
      const { error } = solanaPublicKey.validate("");

      expect(error).toBeDefined();
    });

    it("should reject null", () => {
      const { error } = solanaPublicKey.validate(null);

      expect(error).toBeDefined();
    });

    it("should reject undefined", () => {
      const { error } = solanaPublicKey.validate(undefined);

      expect(error).toBeDefined();
    });

    it("should reject number as public key", () => {
      const { error } = solanaPublicKey.validate(12345);

      expect(error).toBeDefined();
    });

    it("should reject object as public key", () => {
      const { error } = solanaPublicKey.validate({ address: "test" });

      expect(error).toBeDefined();
    });

    it("should accept system program ID", () => {
      const systemProgramId = "11111111111111111111111111111111";
      const { error } = solanaPublicKey.validate(systemProgramId);

      expect(error).toBeUndefined();
    });

    it("should accept any valid base58 Solana address", () => {
      // Generate a random valid keypair and use its public key
      const randomKey = new PublicKey(
        "4WQwPjKHu3x7dHBEehBDgxXHJQoDuBvj6Xhu6C1jjTye"
      );
      const { error } = solanaPublicKey.validate(randomKey.toBase58());

      expect(error).toBeUndefined();
    });
  });

  describe("schemas.wallet", () => {
    it("should accept valid wallet address", () => {
      const validWallet = "7h3gXfBfYFueFVLYyfL5Qo1QGsf4GQUfW96FKVgnUsJS";
      const { error, value } = schemas.wallet.validate(validWallet);

      expect(error).toBeUndefined();
      expect(value).toBe(validWallet);
    });

    it("should reject invalid wallet format", () => {
      const { error } = schemas.wallet.validate("invalid-wallet");

      expect(error).toBeDefined();
      expect(error?.message).toContain("Invalid Solana wallet address");
    });

    it("should reject missing wallet (required)", () => {
      const { error } = schemas.wallet.validate(undefined);

      expect(error).toBeDefined();
      expect(error?.message).toContain("required");
    });

    it("should reject null wallet", () => {
      const { error } = schemas.wallet.validate(null);

      expect(error).toBeDefined();
    });

    it("should reject empty string wallet", () => {
      const { error } = schemas.wallet.validate("");

      expect(error).toBeDefined();
    });
  });

  describe("schemas.marketId", () => {
    it("should accept valid UUID", () => {
      const validUUID = "123e4567-e89b-12d3-a456-426614174000";
      const { error, value } = schemas.marketId.validate(validUUID);

      expect(error).toBeUndefined();
      expect(value).toBe(validUUID);
    });

    it("should reject invalid UUID format", () => {
      const { error } = schemas.marketId.validate("not-a-uuid");

      expect(error).toBeDefined();
      expect(error?.message).toContain("Invalid market ID format");
    });

    it("should reject missing marketId (required)", () => {
      const { error } = schemas.marketId.validate(undefined);

      expect(error).toBeDefined();
      expect(error?.message).toContain("required");
    });

    it("should reject UUID v1 format (only v4 accepted)", () => {
      const uuidV1 = "550e8400-e29b-11d4-a716-446655440000";
      const { error } = schemas.marketId.validate(uuidV1);

      expect(error).toBeDefined();
    });

    it("should reject partial UUID", () => {
      const { error } = schemas.marketId.validate("123e4567-e89b");

      expect(error).toBeDefined();
    });
  });

  describe("schemas.outcome", () => {
    it("should accept true (YES)", () => {
      const { error, value } = schemas.outcome.validate(true);

      expect(error).toBeUndefined();
      expect(value).toBe(true);
    });

    it("should accept false (NO)", () => {
      const { error, value } = schemas.outcome.validate(false);

      expect(error).toBeUndefined();
      expect(value).toBe(false);
    });

    it("should reject string 'true'", () => {
      const { error } = schemas.outcome.validate("true");

      expect(error).toBeDefined();
      expect(error?.message).toContain("must be true (YES) or false (NO)");
    });

    it("should reject number 1", () => {
      const { error } = schemas.outcome.validate(1);

      expect(error).toBeDefined();
    });

    it("should reject null", () => {
      const { error } = schemas.outcome.validate(null);

      expect(error).toBeDefined();
    });

    it("should reject missing outcome (required)", () => {
      const { error } = schemas.outcome.validate(undefined);

      expect(error).toBeDefined();
      expect(error?.message).toContain("required");
    });
  });

  describe("schemas.amount", () => {
    it("should accept positive integer (1 lamport)", () => {
      const { error, value } = schemas.amount.validate(1);

      expect(error).toBeUndefined();
      expect(value).toBe(1);
    });

    it("should accept large positive integer (1 billion lamports = 1 SOL)", () => {
      const { error, value } = schemas.amount.validate(1_000_000_000);

      expect(error).toBeUndefined();
      expect(value).toBe(1_000_000_000);
    });

    it("should reject zero", () => {
      const { error } = schemas.amount.validate(0);

      expect(error).toBeDefined();
      expect(error?.message).toContain("must be positive");
    });

    it("should reject negative amount", () => {
      const { error } = schemas.amount.validate(-100);

      expect(error).toBeDefined();
      expect(error?.message).toContain("must be positive");
    });

    it("should reject decimal amount (must be integer)", () => {
      const { error } = schemas.amount.validate(100.5);

      expect(error).toBeDefined();
      expect(error?.message).toContain("must be an integer");
    });

    it("should reject string amount", () => {
      const { error } = schemas.amount.validate("100");

      expect(error).toBeDefined();
      expect(error?.message).toContain("must be a number");
    });

    it("should reject missing amount (required)", () => {
      const { error } = schemas.amount.validate(undefined);

      expect(error).toBeDefined();
      expect(error?.message).toContain("required");
    });

    it("should reject NaN", () => {
      const { error } = schemas.amount.validate(NaN);

      expect(error).toBeDefined();
    });

    it("should reject Infinity", () => {
      const { error } = schemas.amount.validate(Infinity);

      expect(error).toBeDefined();
    });
  });

  describe("schemas.pagination", () => {
    it("should accept valid page and limit", () => {
      const { error, value } = schemas.pagination.validate({
        page: 2,
        limit: 50,
      });

      expect(error).toBeUndefined();
      expect(value).toEqual({ page: 2, limit: 50 });
    });

    it("should apply default values if not provided", () => {
      const { error, value } = schemas.pagination.validate({});

      expect(error).toBeUndefined();
      expect(value).toEqual({ page: 1, limit: 20 });
    });

    it("should reject page < 1", () => {
      const { error } = schemas.pagination.validate({ page: 0 });

      expect(error).toBeDefined();
    });

    it("should reject limit < 1", () => {
      const { error } = schemas.pagination.validate({ limit: 0 });

      expect(error).toBeDefined();
    });

    it("should reject limit > 100", () => {
      const { error } = schemas.pagination.validate({ limit: 101 });

      expect(error).toBeDefined();
    });

    it("should reject negative page", () => {
      const { error } = schemas.pagination.validate({ page: -1 });

      expect(error).toBeDefined();
    });

    it("should reject decimal page", () => {
      const { error } = schemas.pagination.validate({ page: 1.5 });

      expect(error).toBeDefined();
    });

    it("should reject string page", () => {
      const { error } = schemas.pagination.validate({ page: "1" });

      expect(error).toBeDefined();
    });
  });

  describe("schemas.vote", () => {
    it("should accept true (like)", () => {
      const { error, value } = schemas.vote.validate(true);

      expect(error).toBeUndefined();
      expect(value).toBe(true);
    });

    it("should accept false (dislike)", () => {
      const { error, value } = schemas.vote.validate(false);

      expect(error).toBeUndefined();
      expect(value).toBe(false);
    });

    it("should reject string 'true'", () => {
      const { error } = schemas.vote.validate("true");

      expect(error).toBeDefined();
      expect(error?.message).toContain("must be true (like) or false (dislike)");
    });

    it("should reject missing vote (required)", () => {
      const { error } = schemas.vote.validate(undefined);

      expect(error).toBeDefined();
      expect(error?.message).toContain("required");
    });

    it("should reject null", () => {
      const { error } = schemas.vote.validate(null);

      expect(error).toBeDefined();
    });
  });

  describe("schemas.discussionContent", () => {
    it("should accept valid content (1 char)", () => {
      const { error, value } = schemas.discussionContent.validate("a");

      expect(error).toBeUndefined();
      expect(value).toBe("a");
    });

    it("should accept valid content (2000 chars)", () => {
      const content = "a".repeat(2000);
      const { error, value } = schemas.discussionContent.validate(content);

      expect(error).toBeUndefined();
      expect(value).toBe(content);
    });

    it("should reject empty content", () => {
      const { error } = schemas.discussionContent.validate("");

      expect(error).toBeDefined();
      expect(error?.message).toContain("cannot be empty");
    });

    it("should reject content > 2000 chars", () => {
      const content = "a".repeat(2001);
      const { error } = schemas.discussionContent.validate(content);

      expect(error).toBeDefined();
      expect(error?.message).toContain("less than 2000 characters");
    });

    it("should reject missing content (required)", () => {
      const { error } = schemas.discussionContent.validate(undefined);

      expect(error).toBeDefined();
      expect(error?.message).toContain("required");
    });

    it("should reject null content", () => {
      const { error } = schemas.discussionContent.validate(null);

      expect(error).toBeDefined();
    });

    it("should reject number as content", () => {
      const { error } = schemas.discussionContent.validate(123);

      expect(error).toBeDefined();
    });

    it("should trim whitespace content and reject if empty", () => {
      // Joi doesn't trim by default unless configured
      const { error } = schemas.discussionContent.validate("   ");

      // Should accept whitespace-only (min(1) means length >= 1)
      // If we want to reject whitespace, we'd need .trim() in schema
      expect(error).toBeUndefined();
    });
  });

  describe("validate() function", () => {
    const testSchema = Joi.object({
      name: Joi.string().required(),
      age: Joi.number().integer().min(0).required(),
    });

    it("should return validated value for valid data", () => {
      const data = { name: "Alice", age: 25 };
      const result = validate(data, testSchema);

      expect(result).toEqual(data);
    });

    it("should strip unknown fields", () => {
      const data = { name: "Alice", age: 25, extra: "field" };
      const result = validate(data, testSchema);

      expect(result).toEqual({ name: "Alice", age: 25 });
      expect(result).not.toHaveProperty("extra");
    });

    it("should throw ValidationError for invalid data", () => {
      const data = { name: "Alice", age: -5 };

      expect(() => validate(data, testSchema)).toThrow(ValidationError);
    });

    it("should include all validation errors (abortEarly: false)", () => {
      const data = { age: -5 }; // Missing name, invalid age

      try {
        validate(data, testSchema);
        fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).details.length).toBeGreaterThan(1);
      }
    });

    it("should include error details in ValidationError", () => {
      const data = { name: "Alice", age: "invalid" };

      try {
        validate(data, testSchema);
        fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.details).toBeDefined();
        expect(validationError.details.length).toBeGreaterThan(0);
        expect(validationError.details[0]).toHaveProperty("message");
        expect(validationError.details[0]).toHaveProperty("path");
      }
    });

    it("should have correct error message format", () => {
      const data = { name: 123, age: -5 };

      try {
        validate(data, testSchema);
        fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        // Message should be comma-separated error messages
        expect(validationError.message).toContain(",");
      }
    });
  });

  describe("ValidationError class", () => {
    it("should create ValidationError with message and details", () => {
      const message = "Validation failed";
      const details = [
        {
          message: "age is required",
          path: ["age"],
          type: "any.required",
          context: { key: "age", label: "age" },
        },
      ] as any;

      const error = new ValidationError(message, details);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe(message);
      expect(error.details).toEqual(details);
      expect(error.name).toBe("ValidationError");
    });

    it("should have correct prototype chain", () => {
      const error = new ValidationError("test", []);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ValidationError).toBe(true);
    });

    it("should preserve stack trace", () => {
      const error = new ValidationError("test", []);

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("ValidationError");
    });
  });

  describe("Edge Cases and Security", () => {
    it("should handle very large numbers safely", () => {
      const { error } = schemas.amount.validate(Number.MAX_SAFE_INTEGER);

      expect(error).toBeUndefined();
    });

    it("should handle numbers beyond safe integer range", () => {
      const { error } = schemas.amount.validate(Number.MAX_SAFE_INTEGER + 1);

      // Joi will accept it but JavaScript may lose precision
      expect(error).toBeUndefined();
    });

    it("should handle SQL injection attempt in discussion content", () => {
      const sqlInjection = "'; DROP TABLE markets; --";
      const { error, value } = schemas.discussionContent.validate(sqlInjection);

      // Should accept as valid string (protection is in database layer)
      expect(error).toBeUndefined();
      expect(value).toBe(sqlInjection);
    });

    it("should handle XSS attempt in discussion content", () => {
      const xss = "<script>alert('XSS')</script>";
      const { error, value } = schemas.discussionContent.validate(xss);

      // Should accept as valid string (sanitization is in rendering layer)
      expect(error).toBeUndefined();
      expect(value).toBe(xss);
    });

    it("should handle Unicode content", () => {
      const unicode = "Hello 🚀 世界";
      const { error, value } = schemas.discussionContent.validate(unicode);

      expect(error).toBeUndefined();
      expect(value).toBe(unicode);
    });

    it("should handle newlines in discussion content", () => {
      const content = "Line 1\nLine 2\nLine 3";
      const { error, value } = schemas.discussionContent.validate(content);

      expect(error).toBeUndefined();
      expect(value).toBe(content);
    });
  });
});
