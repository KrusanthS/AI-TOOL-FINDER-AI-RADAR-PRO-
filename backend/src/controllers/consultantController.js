// backend/src/controllers/consultantController.js
// Controller for the AI CONSULTANT endpoints (LLM-FIRST + direct tool search)
//
// STEP 17: Auto-detects between two search modes:
//   - Mode 1: INTENT SEARCH  → LLM-first workflow (consult())
//   - Mode 2: DIRECT TOOL SEARCH → fast DB lookup (directToolSearch())
//
// Endpoints:
//   POST /api/consultant/recommend  → Auto-detect mode & return appropriate response
//   POST /api/consultant/understand → Just run requirement understanding (preview)
//   POST /api/consultant/direct     → Force direct tool search (skip mode detection)

import { consult } from '../services/aiConsultantOrchestrator.js';
import { directToolSearch } from '../services/directToolSearchService.js';
import { detectSearchModeAsync } from '../services/searchModeDetector.js';
import { getCanonicalFromAlias } from '../services/toolAliasRegistry.js';
import { CANONICAL_CATEGORIES } from '../services/categoryRegistry.js';
import logger from '../utils/logger.js';

/**
 * POST /api/consultant/recommend
 * Body: { query: string, limit?: number, budget?: string, skipCache?: boolean, forceMode?: 'intent'|'direct' }
 *
 * Auto-detects whether the query is an intent or a direct tool name,
 * and returns the appropriate response shape.
 *
 * Direct tool response shape:
 *   { type: 'direct_tool', exact_match, query, did_you_mean, confidence, tool, related, source: 'direct_search' }
 *
 * Intent response shape (unchanged from prior steps):
 *   { type: 'intent_search', user_intent, recommended_tools, reasoning, confidence, source, ... }
 */
export const recommend = async (req, res) => {
  const {
    query,
    limit = 8,
    budget = null,
    skipCache = false,
    skipLLM = false,
    forceMode = null, // 'intent' | 'direct' | null
  } = req.body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query is required and must be a non-empty string' });
  }

  if (query.length > 1000) {
    return res.status(400).json({ error: 'Query is too long (max 1000 chars)' });
  }

  const trimmedQuery = query.trim();

  try {
    // ── Step 1: Detect search mode ──────────────────────────────────────────
    let mode = forceMode;
    let modeInfo = null;

    if (!mode) {
      modeInfo = await detectSearchModeAsync(trimmedQuery);
      mode = modeInfo.mode;
    }

    logger.info(`[Consultant] Query="${trimmedQuery}" mode=${mode} reason=${modeInfo?.reason || 'forced'}`);

    // ── Step 2: Route to the appropriate handler ────────────────────────────
    if (mode === 'direct') {
      // Direct tool search — no LLM, no intent understanding
      const start = Date.now();
      const result = await directToolSearch(trimmedQuery, { includeRelated: true });
      const elapsed = Date.now() - start;

      return res.json({
        type: 'direct_tool',
        source: 'direct_search',
        mode_reason: modeInfo?.reason || 'forced_direct',
        responseTimeMs: elapsed,
        ...result,
      });
    }

    // ── Intent search — full LLM-first workflow ────────────────────────────
    const result = await consult(trimmedQuery, {
      limit: Math.min(Math.max(Number(limit) || 8, 1), 25),
      budgetFilter: budget,
      skipCache: Boolean(skipCache),
      skipLLM: Boolean(skipLLM),
    });

    res.json({
      type: 'intent_search',
      mode_reason: modeInfo?.reason || 'forced_intent',
      ...result,
    });
  } catch (error) {
    logger.error(`Consultant recommend error: ${error.message}`);
    res.status(500).json({
      error: 'Recommendation service temporarily unavailable.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/consultant/understand
 * Just run requirement understanding (step 1) without doing the full pipeline.
 */
export const understand = async (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const { understandRequirement } = await import('../services/llmConsultantService.js');
    const understanding = await understandRequirement(query.trim());
    res.json({ understanding });
  } catch (error) {
    logger.error(`Understand error: ${error.message}`);
    res.status(500).json({ error: 'Understanding service unavailable' });
  }
};

/**
 * POST /api/consultant/direct
 * Force a direct tool search, skipping the mode detector.
 * Body: { query: string, includeRelated?: boolean }
 */
export const direct = async (req, res) => {
  const { query, includeRelated = true } = req.body || {};

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const start = Date.now();
    const result = await directToolSearch(query.trim(), { includeRelated });
    res.json({
      type: 'direct_tool',
      source: 'direct_search_forced',
      responseTimeMs: Date.now() - start,
      ...result,
    });
  } catch (error) {
    logger.error(`Direct search error: ${error.message}`);
    res.status(500).json({ error: 'Direct search failed' });
  }
};

/**
 * POST /api/consultant/detect-mode
 * Detect the search mode for a given query (used for debugging / testing).
 * Body: { query: string }
 */
export const detectMode = async (req, res) => {
  const { query } = req.body || {};
  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: 'Query is required' });
  }
  try {
    const modeInfo = await detectSearchModeAsync(query.trim());
    const aliasMatch = getCanonicalFromAlias(query.trim());
    res.json({
      query: query.trim(),
      ...modeInfo,
      alias_match: aliasMatch,
      canonical_categories: CANONICAL_CATEGORIES,
    });
  } catch (error) {
    logger.error(`Detect mode error: ${error.message}`);
    res.status(500).json({ error: 'Mode detection failed' });
  }
};

export default { recommend, understand, direct, detectMode };
