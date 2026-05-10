import Queue from 'bull';
import Tool from '../models/Tool.js';
import logger from '../utils/logger.js';
import { invalidateCache } from '../middleware/cacheMiddleware.js';
import redisClient, { redisOptions, createBullClient } from '../config/redis.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const trendingQueue = new Queue('trending-decay', REDIS_URL, {
  createClient: createBullClient,
});



// Handle connection errors to prevent process crash
trendingQueue.on('error', (err) => logger.warn(`Bull Trending Queue connection issue: ${err.message}`));



export const runTrendingDecay = async () => {
  logger.info('Running trending decay job (manual/fallback)');
  try {
    // Decay weeklyViews by 5% every hour (multiply by 0.95)
    await Tool.updateMany(
      { 'stats.weeklyViews': { $gt: 0 } },
      { $mul: { 'stats.weeklyViews': 0.95 } }
    );

    // Invalidate trending cache if redis is alive
    if (redisClient.isReady) {
      await invalidateCache('/api/trending');
    }

    return { success: true };
  } catch (error) {
    logger.error(`Trending decay job failed: ${error.message}`);
    throw error;
  }
};

trendingQueue.process(runTrendingDecay);

export const scheduleTrendingDecay = () => {
  if (redisClient.isReady) {
    trendingQueue.add({}, { repeat: { cron: '0 * * * *' } }).catch(err => {
      logger.warn(`Could not schedule trending decay job via Bull: ${err.message}`);
    });
  } else {
    logger.warn('Redis unavailable: Falling back to internal scheduler for trending decay.');
    // Run every hour
    setInterval(runTrendingDecay, 60 * 60 * 1000);
  }
};

