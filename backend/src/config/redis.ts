// ============================================================
// Redis Configuration
// ============================================================
// Purpose: Initialize Redis client for caching and pub/sub
// Pattern Prevention: #6 (Performance Afterthought) - Caching from start

import Redis from "ioredis";
import { config } from "./env";
import logger from "../utils/logger";

// Singleton Redis client
let redisClient: Redis | null = null;

/**
 * Get or create Redis client instance
 * @returns Redis client
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    logger.info("Initializing Redis client", {
      url: config.redis.url,
    });

    redisClient = new Redis(config.redis.url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        logger.warn(`Redis connection retry attempt ${times}`, { delay });
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      showFriendlyErrorStack: config.node.isDevelopment,
    });

    // Event handlers
    redisClient.on("connect", () => {
      logger.info("Redis client connected");
    });

    redisClient.on("ready", () => {
      logger.info("Redis client ready");
    });

    redisClient.on("error", (error) => {
      logger.error("Redis client error", { error: error.message });
    });

    redisClient.on("close", () => {
      logger.warn("Redis client connection closed");
    });

    redisClient.on("reconnecting", () => {
      logger.info("Redis client reconnecting");
    });
  }

  return redisClient;
}

/**
 * Test Redis connection
 * @returns True if connection successful
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const client = getRedisClient();

    // Simple ping to test connection
    const pong = await client.ping();

    if (pong === "PONG") {
      logger.info("Redis connection test successful");
      return true;
    }

    logger.error("Redis connection test failed: unexpected response");
    return false;
  } catch (error) {
    logger.error("Redis connection test failed", { error });
    return false;
  }
}

/**
 * Close Redis connection gracefully
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis connection closed");
  }
}

export default getRedisClient;
