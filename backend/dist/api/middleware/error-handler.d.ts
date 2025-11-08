import { Request, Response, NextFunction } from "express";
/**
 * Custom API Error class
 */
export declare class ApiError extends Error {
    statusCode: number;
    message: string;
    details?: any | undefined;
    constructor(statusCode: number, message: string, details?: any | undefined);
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
export declare function errorHandler(err: Error | ApiError, req: Request, res: Response, next: NextFunction): void;
/**
 * Async error wrapper
 * Catches async errors and passes them to error handler
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error-handler.d.ts.map