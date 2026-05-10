// backend/src/services/toolService.js
import Tool from '../models/Tool.js';
import logger from '../utils/logger.js';
import redisClient from '../config/redis.js';

export const incrementToolView = async (slug) => {
  try {
    const cacheKey = `view_buffer:${slug}`;
    const currentViews = await redisClient.incr(cacheKey);
    
    // Periodically flush views to DB (e.g., every 10 views)
    if (currentViews >= 10) {
      await Tool.findOneAndUpdate(
        { slug },
        { 
          $inc: { 
            'stats.views': currentViews, 
            'stats.weeklyViews': currentViews 
          } 
        }
      );
      await redisClient.del(cacheKey);
    }
  } catch (error) {
    logger.error(`incrementToolView error: ${error.message}`);
  }
};

export const findSimilarTools = async (tool, limit = 4) => {
  try {
    return await Tool.find({
      _id: { $ne: tool._id },
      category: tool.category,
      status: 'approved'
    })
    .sort({ 'stats.rating': -1, 'stats.views': -1 })
    .limit(limit)
    .select('name slug shortDescription media.logo pricing.model category stats.rating');
  } catch (error) {
    logger.error(`findSimilarTools error: ${error.message}`);
    return [];
  }
};
