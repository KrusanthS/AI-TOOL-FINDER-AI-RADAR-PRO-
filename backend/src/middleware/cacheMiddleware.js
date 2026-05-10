// backend/src/middleware/cacheMiddleware.js
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

export const cacheMiddleware = (durationInSeconds) => {
  return async (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `cache:${req.originalUrl || req.url}`;
    
    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }

      const originalJson = res.json.bind(res);
      res.json = function (body) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          redisClient.setex(key, durationInSeconds, JSON.stringify(body)).catch(() => {});
        }
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      // Redis unavailable — just skip caching
      next();
    }
  };
};

export const invalidateCache = async (pattern) => {
  try {
    const keys = await redisClient.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  } catch (error) {
    // Silent fail if Redis is down
  }
};

