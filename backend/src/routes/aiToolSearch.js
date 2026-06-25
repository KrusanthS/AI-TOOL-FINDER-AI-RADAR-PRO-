// backend/src/routes/aiToolSearch.js
// API route for live AI tool fetching
// Provides endpoint to search for AI tools with live data from Gemini API

import express from 'express';
import { searchLiveAiTool, batchSearchAiTools, clearToolCache, getCacheStats } from '../services/aiToolSearchService.js';
import { errorHandler } from '../middleware/errorHandler.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/ai-tool-search
 * Search for a single AI tool with live data
 * 
 * Body: { toolName: string, forceRefresh?: boolean }
 */
router.post('/search', async (req, res, next) => {
  try {
    const { toolName, forceRefresh } = req.body;

    // Validate input
    if (!toolName || typeof toolName !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Tool name is required and must be a string',
      });
    }

    if (toolName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Tool name must be at least 2 characters',
      });
    }

    logger.info(`AI Tool Search request: ${toolName}, forceRefresh: ${forceRefresh}`);

    const result = await searchLiveAiTool(toolName, {
      forceRefresh: Boolean(forceRefresh),
    });

    if (result.success) {
      res.json({
        success: true,
        tool: result.tool,
        source: result.source,
        normalizedName: result.normalizedName,
        fromCache: result.fromCache || false,
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error || 'Tool not found',
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/ai-tool-search/batch
 * Search for multiple AI tools at once
 * 
 * Body: { toolNames: string[], forceRefresh?: boolean }
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { toolNames, forceRefresh } = req.body;

    // Validate input
    if (!Array.isArray(toolNames) || toolNames.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'toolNames array is required and must not be empty',
      });
    }

    if (toolNames.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 tools can be searched at once',
      });
    }

    logger.info(`Batch AI Tool Search request: ${toolNames.length} tools`);

    const results = await batchSearchAiTools(toolNames, {
      forceRefresh: Boolean(forceRefresh),
    });

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      success: true,
      total: results.length,
      found: successful.length,
      notFound: failed.length,
      results: results.map(r => ({
        searchTerm: r.searchTerm,
        success: r.success,
        tool: r.tool,
        source: r.source,
        error: r.error,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/ai-tool-search/cache/:toolName
 * Clear cache for a specific tool
 */
router.delete('/cache/:toolName', async (req, res, next) => {
  try {
    const { toolName } = req.params;

    if (!toolName || toolName.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Tool name must be at least 2 characters',
      });
    }

    const cleared = await clearToolCache(toolName);

    res.json({
      success: cleared,
      message: cleared ? `Cache cleared for ${toolName}` : 'Failed to clear cache',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-tool-search/cache/stats
 * Get cache statistics
 */
router.get('/cache/stats', async (req, res, next) => {
  try {
    const stats = await getCacheStats();

    res.json({
      success: true,
      ...stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/ai-tool-search/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-tool-search',
    timestamp: new Date().toISOString(),
  });
});

// Apply error handler middleware
router.use(errorHandler);

export default router;