/**
 * Cache Middleware
 *
 * Caches GET responses in Redis for 30 seconds to reduce database load.
 */

import { Request, Response, NextFunction } from 'express';
import { RedisClientType } from 'redis';
import { logger } from '../utils/logger';

const CACHE_TTL = 30; // 30 seconds

/**
 * Create cache middleware
 */
export function createCacheMiddleware(redisClient: RedisClientType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Don't cache health check
    if (req.path === '/health') {
      return next();
    }

    const cacheKey = `cache:${req.originalUrl}`;

    try {
      // Check if cached
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        logger.debug('Cache hit', {
          path: req.originalUrl,
          key: cacheKey
        });

        // Return cached response
        return res.status(200).json({
          ...JSON.parse(cachedData),
          cached: true,
          cachedAt: new Date().toISOString()
        });
      }

      logger.debug('Cache miss', {
        path: req.originalUrl,
        key: cacheKey
      });

      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to cache response
      res.json = function (data: any) {
        // Cache the response
        redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(data))
          .catch(err => {
            logger.error('Failed to cache response', {
              error: err.message,
              key: cacheKey
            });
          });

        // Send response
        return originalJson(data);
      };

      next();

    } catch (error) {
      logger.error('Cache middleware error', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.originalUrl
      });

      // On cache error, continue without caching
      next();
    }
  };
}

/**
 * Create cache invalidation middleware
 */
export function createCacheInvalidationMiddleware(redisClient: RedisClientType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only invalidate on write operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      // Store original res.json
      const originalJson = res.json.bind(res);

      // Override res.json to invalidate cache after successful response
      res.json = function (data: any) {
        // Only invalidate on successful responses (2xx)
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Invalidate related caches
          invalidateRelatedCaches(redisClient, req.originalUrl)
            .catch(err => {
              logger.error('Failed to invalidate cache', {
                error: err.message,
                path: req.originalUrl
              });
            });
        }

        // Send response
        return originalJson(data);
      };
    }

    next();
  };
}

/**
 * Invalidate caches related to a URL
 */
async function invalidateRelatedCaches(
  redisClient: RedisClientType,
  url: string
): Promise<void> {
  try {
    // Get all cache keys
    const keys = await redisClient.keys('cache:*');

    // Filter keys related to this URL
    const relatedKeys = keys.filter(key => {
      // If URL contains "/votes/proposal", invalidate all proposal-related caches
      if (url.includes('/votes/proposal')) {
        return key.includes('/votes/proposal') || key.includes('/counts/proposal');
      }

      // If URL contains "/votes/dispute", invalidate all dispute-related caches
      if (url.includes('/votes/dispute')) {
        return key.includes('/votes/dispute') || key.includes('/counts/dispute');
      }

      return false;
    });

    // Delete related cache entries
    if (relatedKeys.length > 0) {
      await redisClient.del(relatedKeys);

      logger.info('Invalidated related caches', {
        url,
        invalidated: relatedKeys.length
      });
    }

  } catch (error) {
    logger.error('Error invalidating caches', {
      error: error instanceof Error ? error.message : 'Unknown error',
      url
    });
  }
}
