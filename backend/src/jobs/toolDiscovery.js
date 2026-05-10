import Queue from 'bull';
import redisClient, { redisOptions, createBullClient } from '../config/redis.js';
import { fetchProductHuntAITools, fetchGitHubAITools, autonomousAISearch } from '../services/scrapingService.js';
import Tool from '../models/Tool.js';
import logger from '../utils/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const discoveryQueue = new Queue('tool-discovery', REDIS_URL, {
  createClient: createBullClient,
});

export const enrichmentQueue = new Queue('ai-enrichment', REDIS_URL, {
  createClient: createBullClient,
});



// Handle connection errors to prevent process crash
discoveryQueue.on('error', (err) => logger.warn(`Bull Discovery Queue connection issue: ${err.message}`));
enrichmentQueue.on('error', (err) => logger.warn(`Bull Enrichment Queue connection issue: ${err.message}`));



const CATEGORIES = ['Video', 'Audio', 'Coding', 'Productivity', 'Image', 'Text', 'Design', 'Marketing', 'Research'];

// Logic for discovery to be reused
export const runDiscovery = async () => {
  logger.info('Starting manual/fallback tool discovery job');
  let addedCount = 0;

  try {
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    logger.info(`Running autonomous AI search for category: ${randomCategory}`);
    const aiTools = await autonomousAISearch(randomCategory);
    
    for (const tool of aiTools) {
      if (tool.name && tool.website) {
        const exists = await Tool.findOne({ 
          $or: [{ name: tool.name }, { 'links.website': tool.website }] 
        });

        if (!exists) {
          const newTool = await Tool.create({
            name: tool.name,
            shortDescription: tool.tagline || 'AI Tool',
            description: tool.description || 'Discovered automatically.',
            links: { website: tool.website },
            source: 'autonomous-ai',
            category: tool.category || randomCategory,
            status: 'approved'
          });
          
          if (redisClient.isReady) {
            enrichmentQueue.add({ toolId: newTool._id }).catch(err => logger.warn(`Skipped enrichment queue: ${err.message}`));
          } else {
            logger.info(`Redis down: skipping background enrichment for ${newTool.name}. Admin can trigger manually.`);
          }
          addedCount++;
        }
      }
    }

    const phPosts = await fetchProductHuntAITools();
    if (phPosts && phPosts.edges) {
      for (const edge of phPosts.edges) {
        const post = edge.node;
        const exists = await Tool.findOne({ 
          $or: [{ name: post.name }, { 'links.website': post.website }] 
        });

        if (!exists && post.website) {
          const newTool = await Tool.create({
            name: post.name,
            shortDescription: post.tagline,
            description: post.description,
            links: { website: post.website },
            media: { logo: post.thumbnail?.url },
            source: 'producthunt',
            category: 'Other',
            status: 'approved'
          });
          
          if (redisClient.isReady) {
            enrichmentQueue.add({ toolId: newTool._id }).catch(err => logger.warn(`Skipped enrichment queue: ${err.message}`));
          }
          addedCount++;
        }
      }
    }

    logger.info(`Tool discovery complete. Discovered ${addedCount} new tools.`);
    return { addedCount };
  } catch (error) {
    logger.error(`Discovery job failed: ${error.message}`);
    throw error;
  }
};

discoveryQueue.process(runDiscovery);

// Schedule the discovery job to run daily automatically
export const scheduleDiscovery = () => {
  if (redisClient.isReady) {
    // Runs every day at midnight to search the internet for new tools
    discoveryQueue.add({}, { repeat: { cron: '0 0 * * *' } }).catch(err => {
      logger.warn(`Could not schedule discovery job via Bull: ${err.message}`);
    });
  } else {
    logger.warn('Redis unavailable: Falling back to internal scheduler for tool discovery.');
    // Run once on startup after 10s, then every 24 hours
    setTimeout(runDiscovery, 10000);
    setInterval(runDiscovery, 24 * 60 * 60 * 1000);
  }
};

