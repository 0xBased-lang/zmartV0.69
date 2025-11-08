import Redis from "ioredis";
/**
 * Get or create Redis client instance
 * @returns Redis client
 */
export declare function getRedisClient(): Redis;
/**
 * Test Redis connection
 * @returns True if connection successful
 */
export declare function testRedisConnection(): Promise<boolean>;
/**
 * Close Redis connection gracefully
 */
export declare function closeRedis(): Promise<void>;
export default getRedisClient;
//# sourceMappingURL=redis.d.ts.map