"use strict";
// ============================================================
// Redis Configuration
// ============================================================
// Purpose: Initialize Redis client for caching and pub/sub
// Pattern Prevention: #6 (Performance Afterthought) - Caching from start
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRedisClient = getRedisClient;
exports.testRedisConnection = testRedisConnection;
exports.closeRedis = closeRedis;
const ioredis_1 = __importDefault(require("ioredis"));
const env_1 = require("./env");
const logger_1 = __importDefault(require("../utils/logger"));
// Singleton Redis client
let redisClient = null;
/**
 * Get or create Redis client instance
 * @returns Redis client
 */
function getRedisClient() {
    if (!redisClient) {
        logger_1.default.info("Initializing Redis client", {
            url: env_1.config.redis.url,
        });
        redisClient = new ioredis_1.default(env_1.config.redis.url, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                logger_1.default.warn(`Redis connection retry attempt ${times}`, { delay });
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            showFriendlyErrorStack: env_1.config.node.isDevelopment,
        });
        // Event handlers
        redisClient.on("connect", () => {
            logger_1.default.info("Redis client connected");
        });
        redisClient.on("ready", () => {
            logger_1.default.info("Redis client ready");
        });
        redisClient.on("error", (error) => {
            logger_1.default.error("Redis client error", { error: error.message });
        });
        redisClient.on("close", () => {
            logger_1.default.warn("Redis client connection closed");
        });
        redisClient.on("reconnecting", () => {
            logger_1.default.info("Redis client reconnecting");
        });
    }
    return redisClient;
}
/**
 * Test Redis connection
 * @returns True if connection successful
 */
async function testRedisConnection() {
    try {
        const client = getRedisClient();
        // Simple ping to test connection
        const pong = await client.ping();
        if (pong === "PONG") {
            logger_1.default.info("Redis connection test successful");
            return true;
        }
        logger_1.default.error("Redis connection test failed: unexpected response");
        return false;
    }
    catch (error) {
        logger_1.default.error("Redis connection test failed", { error });
        return false;
    }
}
/**
 * Close Redis connection gracefully
 */
async function closeRedis() {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        logger_1.default.info("Redis connection closed");
    }
}
exports.default = getRedisClient;
//# sourceMappingURL=redis.js.map