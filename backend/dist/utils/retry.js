"use strict";
// ============================================================
// Retry Utility
// ============================================================
// Purpose: Exponential backoff retry logic for resilient operations
// Pattern Prevention: #3 (Reactive Crisis Loop) - Proactive error handling
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
exports.retryWithBackoff = withRetry;
exports.sleep = sleep;
exports.withCustomRetry = withCustomRetry;
const logger_1 = __importDefault(require("./logger"));
const defaultOptions = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    onRetry: (error, attempt) => {
        logger_1.default.warn(`Retry attempt ${attempt}`, {
            error: error.message,
        });
    },
};
/**
 * Execute function with exponential backoff retry
 * @param fn Function to execute
 * @param options Retry options
 * @returns Result of function execution
 */
async function withRetry(fn, options = {}) {
    const opts = { ...defaultOptions, ...options };
    let lastError;
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === opts.maxAttempts) {
                logger_1.default.error(`All ${opts.maxAttempts} retry attempts failed`, {
                    error: lastError.message,
                });
                throw lastError;
            }
            // Calculate delay with exponential backoff
            const delay = Math.min(opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1), opts.maxDelay);
            opts.onRetry(lastError, attempt);
            // Wait before retrying
            await sleep(delay);
        }
    }
    throw lastError;
}
/**
 * Sleep for specified milliseconds
 * @param ms Milliseconds to sleep
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Retry with custom backoff strategy
 * @param fn Function to execute
 * @param delays Array of delays for each retry attempt
 */
async function withCustomRetry(fn, delays) {
    let lastError;
    for (let i = 0; i < delays.length + 1; i++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (i === delays.length) {
                logger_1.default.error(`All ${delays.length + 1} retry attempts failed`, {
                    error: lastError.message,
                });
                throw lastError;
            }
            logger_1.default.warn(`Retry attempt ${i + 1}/${delays.length}`, {
                error: lastError.message,
                nextDelay: delays[i],
            });
            await sleep(delays[i]);
        }
    }
    throw lastError;
}
exports.default = withRetry;
//# sourceMappingURL=retry.js.map