"use strict";
// ============================================================
// Error Handling Middleware
// ============================================================
// Purpose: Centralized error handling for API
// Story: 2.4 (Day 12)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const logger_1 = __importDefault(require("../../utils/logger"));
/**
 * Custom API Error class
 */
class ApiError extends Error {
    statusCode;
    message;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
        this.details = details;
        this.name = "ApiError";
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.ApiError = ApiError;
/**
 * Error handling middleware
 */
function errorHandler(err, req, res, next) {
    // Log error
    logger_1.default.error("[API Error]", {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });
    // Default to 500 server error
    let statusCode = 500;
    let message = "Internal Server Error";
    let details = undefined;
    // Handle ApiError
    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        message = err.message;
        details = err.details;
    }
    // Handle Joi validation errors
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = "Validation Error";
        details = err.details;
    }
    // Handle specific error types
    if (err.message.includes("not found")) {
        statusCode = 404;
    }
    if (err.message.includes("unauthorized") || err.message.includes("authentication")) {
        statusCode = 401;
    }
    if (err.message.includes("forbidden") || err.message.includes("permission")) {
        statusCode = 403;
    }
    // Create error response
    const errorResponse = {
        error: err.name || "Error",
        message,
        status: statusCode,
        timestamp: new Date().toISOString(),
        path: req.path,
    };
    // Add details if present
    if (details) {
        errorResponse.details = details;
    }
    // Send response
    res.status(statusCode).json(errorResponse);
}
/**
 * Async error wrapper
 * Catches async errors and passes them to error handler
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=error-handler.js.map