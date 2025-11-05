// ============================================================
// Validation Utility
// ============================================================
// Purpose: Joi validation helpers for request/data validation
// Pattern Prevention: #6 (Security Afterthought) - Input validation from start

import Joi from "joi";
import { PublicKey } from "@solana/web3.js";

/**
 * Custom Joi validator for Solana public keys
 */
export const solanaPublicKey = Joi.string().custom((value, helpers) => {
  try {
    new PublicKey(value);
    return value;
  } catch (error) {
    return helpers.error("any.invalid");
  }
}, "Solana PublicKey validation");

/**
 * Common validation schemas
 */
export const schemas = {
  // Wallet address (Solana public key)
  wallet: solanaPublicKey.required().messages({
    "any.invalid": "Invalid Solana wallet address",
    "any.required": "Wallet address is required",
  }),

  // Market ID (UUID)
  marketId: Joi.string().uuid().required().messages({
    "string.guid": "Invalid market ID format",
    "any.required": "Market ID is required",
  }),

  // Boolean outcome
  outcome: Joi.boolean().required().messages({
    "boolean.base": "Outcome must be true (YES) or false (NO)",
    "any.required": "Outcome is required",
  }),

  // Amount (positive integer, in lamports)
  amount: Joi.number().integer().positive().required().messages({
    "number.base": "Amount must be a number",
    "number.integer": "Amount must be an integer",
    "number.positive": "Amount must be positive",
    "any.required": "Amount is required",
  }),

  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),

  // Vote
  vote: Joi.boolean().required().messages({
    "boolean.base": "Vote must be true (like) or false (dislike)",
    "any.required": "Vote is required",
  }),

  // Discussion content
  discussionContent: Joi.string().min(1).max(2000).required().messages({
    "string.empty": "Discussion content cannot be empty",
    "string.max": "Discussion content must be less than 2000 characters",
    "any.required": "Discussion content is required",
  }),
};

/**
 * Validate data against schema
 * @param data Data to validate
 * @param schema Joi schema
 * @returns Validated data
 * @throws ValidationError if validation fails
 */
export function validate<T>(data: any, schema: Joi.Schema): T {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const details = error.details.map((d) => d.message).join(", ");
    throw new ValidationError(details, error.details);
  }

  return value as T;
}

/**
 * Custom validation error
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public details: Joi.ValidationErrorItem[]
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export default {
  schemas,
  validate,
  ValidationError,
};
