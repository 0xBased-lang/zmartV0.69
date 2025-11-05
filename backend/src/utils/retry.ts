// ============================================================
// Retry Utility
// ============================================================
// Purpose: Exponential backoff retry logic for resilient operations
// Pattern Prevention: #3 (Reactive Crisis Loop) - Proactive error handling

import logger from "./logger";

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

const defaultOptions: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  onRetry: (error, attempt) => {
    logger.warn(`Retry attempt ${attempt}`, {
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
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxAttempts) {
        logger.error(`All ${opts.maxAttempts} retry attempts failed`, {
          error: lastError.message,
        });
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      opts.onRetry(lastError, attempt);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError!;
}

/**
 * Sleep for specified milliseconds
 * @param ms Milliseconds to sleep
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry with custom backoff strategy
 * @param fn Function to execute
 * @param delays Array of delays for each retry attempt
 */
export async function withCustomRetry<T>(
  fn: () => Promise<T>,
  delays: number[]
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < delays.length + 1; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i === delays.length) {
        logger.error(`All ${delays.length + 1} retry attempts failed`, {
          error: lastError.message,
        });
        throw lastError;
      }

      logger.warn(`Retry attempt ${i + 1}/${delays.length}`, {
        error: lastError.message,
        nextDelay: delays[i],
      });

      await sleep(delays[i]);
    }
  }

  throw lastError!;
}

// Named exports
export { withRetry as retryWithBackoff };
export default withRetry;
