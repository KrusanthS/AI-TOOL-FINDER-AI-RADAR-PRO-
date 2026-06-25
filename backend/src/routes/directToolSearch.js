// backend/src/routes/directToolSearch.js
// STEP 17: Direct Tool Search + Category Browsing API routes
//
// These routes are part of the category-based browsing experience. They
// answer the user the moment they type a tool name or click a category.
//
//   GET /api/tools/categories          → list of all 17 canonical categories with counts
//   GET /api/tools/by-category/:cat    → tools in a specific category (no LLM)
//   GET /api/tools/search/direct?q=    → direct tool name search (no LLM)
//
// All endpoints are cache-friendly and LLM-free for fast responses.

import express from 'express';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';
import { directToolSearch } from '../services/directToolSearchService.js';
import {
  getCanonicalCategoriesWithCounts,
  getToolsByCategory,
  getAllCategoriesSummary,
} from '../services/categoryService.js';
import { detectSearchModeAsync } from '../services/searchModeDetector.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /api/tools/categories
 * Returns the canonical 17-category list with tool counts and metadata.
 * Used by the Discover page category bar.
 *
 * Cached for 1 hour since category counts change infrequently.
 */
router.get('/categories', cacheMiddleware(3600), async (req, res) => {
  try {
    const data = await getCanonicalCategoriesWithCounts();
    res.json({
      success: true,
      categories: data.categories,
      total_tools: data.total_tools,
      canonical_count: data.canonical_count,
    });
  } catch (error) {
    logger.error(`getCategories error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tools/by-category/:category
 * Returns all tools in a specific canonical category.
 * Supports pagination, sorting, and pricing filter.
 * NO LLM CALL — direct DB query.
 *
 * Examples:
 *   /api/tools/by-category/Writing
 *   /api/tools/by-category/Coding?page=2&limit=20&pricing=free
 */
router.get('/by-category/:category', cacheMiddleware(300), async (req, res) => {
  try {
    const { category } = req.params;
    const {
      page = 1,
      limit = 20,
      pricing,
      sort = 'newest',
    } = req.query;

    const result = await getToolsByCategory(category, {
      page: Number(page),
      limit: Math.min(Number(limit) || 20, 100),
      pricing,
      sort,
    });

    res.json({
      success: true,
      category: result.canonical_category,
      matched_categories: result.matched_categories,
      tools: result.tools,
      total: result.total,
      pages: result.pages,
      currentPage: result.currentPage,
    });
  } catch (error) {
    logger.error(`getToolsByCategory error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tools/search/direct?q=<query>
 * Direct tool name search. NO LLM CALL.
 *
 * Examples:
 *   /api/tools/search/direct?q=ChatGPT
 *   /api/tools/search/direct?q=chatgbt    (typo)
 *   /api/tools/search/direct?q=GPT        (alias)
 *   /api/tools/search/direct?q=midjorney  (typo)
 *
 * Returns:
 *   { type: 'direct_tool', tool, related, confidence }
 *   or
 *   { type: 'not_found', message, suggestions }
 */
router.get('/search/direct', async (req, res) => {
  try {
    const { q, query, includeRelated } = req.query;
    const searchTerm = (q || query || '').trim();

    if (!searchTerm) {
      return res.status(400).json({
        success: false,
        type: 'not_found',
        error: 'Query parameter `q` is required',
        message: 'Please provide a tool name to search for.',
      });
    }

    if (searchTerm.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Query is too long (max 100 chars)',
      });
    }

    const result = await directToolSearch(searchTerm, {
      includeRelated: includeRelated !== 'false',
    });

    res.json({
      success: result.type === 'direct_tool',
      ...result,
    });
  } catch (error) {
    logger.error(`directToolSearch error: ${error.message}`);
    res.status(500).json({
      success: false,
      type: 'not_found',
      error: 'Direct search failed',
      message: 'Tool not available in our database.',
    });
  }
});

/**
 * GET /api/tools/search/direct-batch?tools=ChatGPT,Claude,Midjourney
 * Batch direct tool search — looks up multiple tool names at once.
 * Useful for the frontend "did you mean" type interactions.
 */
router.get('/search/direct-batch', async (req, res) => {
  try {
    const { tools } = req.query;
    if (!tools) {
      return res.status(400).json({ success: false, error: '`tools` query parameter is required (comma-separated)' });
    }
    const names = tools.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 20);
    if (names.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid tool names provided' });
    }
    const results = await Promise.all(names.map((n) => directToolSearch(n, { includeRelated: false })));
    res.json({
      success: true,
      results: names.map((n, i) => ({ query: n, ...results[i] })),
    });
  } catch (error) {
    logger.error(`directToolSearchBatch error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/tools/categories/all
 * Returns the FULL list of categories (canonical + any other categories
 * found in the DB) with counts. Used by admin / analytics dashboards.
 */
router.get('/categories/all', cacheMiddleware(3600), async (req, res) => {
  try {
    const data = await getAllCategoriesSummary();
    res.json({ success: true, ...data });
  } catch (error) {
    logger.error(`getAllCategoriesSummary error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/tools/search/smart?q=<query>
 * Auto-detects whether the query is a direct tool name or an intent search.
 * - Direct tool name  → DB lookup (no LLM)
 * - Intent search     → returns { mode: 'intent' } so frontend can dispatch to consultant
 */
router.get('/search/smart', async (req, res) => {
  try {
    const { q, query } = req.query;
    const searchTerm = (q || query || '').trim();
    if (!searchTerm) {
      return res.status(400).json({ success: false, error: 'Query parameter `q` is required' });
    }
    const modeResult = await detectSearchModeAsync(searchTerm);
    if (modeResult.mode === 'direct') {
      const result = await directToolSearch(searchTerm, { includeRelated: true });
      return res.json({ success: true, search_mode: 'direct', ...result });
    }
    // Intent mode — let the frontend route to the consultant
    return res.json({
      success: true,
      search_mode: 'intent',
      query: searchTerm,
      reason: modeResult.reason,
      confidence: modeResult.confidence,
    });
  } catch (error) {
    logger.error(`smartSearch error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
