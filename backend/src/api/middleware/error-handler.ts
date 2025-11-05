// ============================================================
// Error Handling Middleware
// ============================================================
// Purpose: Centralized error handling for API
// Story: 2.4 (Day 12)

import { Request, Response, NextFunction } from "express";
import logger from "../../utils/logger";

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    this.name = "ApiError";
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error response interface
 */
export interface ErrorResponse {
  error: string;
  message: string;
  details?: any;
  status: number;
  timestamp: string;
  path?: string;
}

/**
 * Error handling middleware
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error("[API Error]", {
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
    details = (err as any).details;
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
  const errorResponse: ErrorResponse = {
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
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
