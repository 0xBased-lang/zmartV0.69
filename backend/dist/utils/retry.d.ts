export interface RetryOptions {
    maxAttempts?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    onRetry?: (error: Error, attempt: number) => void;
}
/**
 * Execute function with exponential backoff retry
 * @param fn Function to execute
 * @param options Retry options
 * @returns Result of function execution
 */
export declare function withRetry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T>;
/**
 * Sleep for specified milliseconds
 * @param ms Milliseconds to sleep
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Retry with custom backoff strategy
 * @param fn Function to execute
 * @param delays Array of delays for each retry attempt
 */
export declare function withCustomRetry<T>(fn: () => Promise<T>, delays: number[]): Promise<T>;
export { withRetry as retryWithBackoff };
export default withRetry;
//# sourceMappingURL=retry.d.ts.map