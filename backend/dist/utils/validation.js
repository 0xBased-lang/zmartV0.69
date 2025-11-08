"use strict";
// ============================================================
// Validation Utility
// ============================================================
// Purpose: Joi validation helpers for request/data validation
// Pattern Prevention: #6 (Security Afterthought) - Input validation from start
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.schemas = exports.solanaPublicKey = void 0;
exports.validate = validate;
const joi_1 = __importDefault(require("joi"));
const web3_js_1 = require("@solana/web3.js");
/**
 * Custom Joi validator for Solana public keys
 */
exports.solanaPublicKey = joi_1.default.string().custom((value, helpers) => {
    try {
        new web3_js_1.PublicKey(value);
        return value;
    }
    catch (error) {
        return helpers.error("any.invalid");
    }
}, "Solana PublicKey validation");
/**
 * Common validation schemas
 */
exports.schemas = {
    // Wallet address (Solana public key)
    wallet: exports.solanaPublicKey.required().messages({
        "any.invalid": "Invalid Solana wallet address",
        "any.required": "Wallet address is required",
    }),
    // Market ID (UUID)
    marketId: joi_1.default.string().uuid().required().messages({
        "string.guid": "Invalid market ID format",
        "any.required": "Market ID is required",
    }),
    // Boolean outcome
    outcome: joi_1.default.boolean().required().messages({
        "boolean.base": "Outcome must be true (YES) or false (NO)",
        "any.required": "Outcome is required",
    }),
    // Amount (positive integer, in lamports)
    amount: joi_1.default.number().integer().positive().required().messages({
        "number.base": "Amount must be a number",
        "number.integer": "Amount must be an integer",
        "number.positive": "Amount must be positive",
        "any.required": "Amount is required",
    }),
    // Pagination
    pagination: joi_1.default.object({
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20),
    }),
    // Vote
    vote: joi_1.default.boolean().required().messages({
        "boolean.base": "Vote must be true (like) or false (dislike)",
        "any.required": "Vote is required",
    }),
    // Discussion content
    discussionContent: joi_1.default.string().min(1).max(2000).required().messages({
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
function validate(data, schema) {
    const { error, value } = schema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
    });
    if (error) {
        const details = error.details.map((d) => d.message).join(", ");
        throw new ValidationError(details, error.details);
    }
    return value;
}
/**
 * Custom validation error
 */
class ValidationError extends Error {
    details;
    constructor(message, details) {
        super(message);
        this.details = details;
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
exports.default = {
    schemas: exports.schemas,
    validate,
    ValidationError,
};
//# sourceMappingURL=validation.js.map