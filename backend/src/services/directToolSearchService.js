// backend/src/services/directToolSearchService.js
// STEP 17: Direct Tool Search Service
//
// This is the engine behind "Mode 2: Direct Tool Search" in the spec.
//
// Pipeline (NO LLM INVOLVED — every step is deterministic and fast):
//   1. Normalize the user's query
//   2. Try the static alias registry (e.g. "gpt" → "ChatGPT")
//   3. Try exact case-insensitive match against `name` or `tool_name`
//   4. Try exact match against any element in the tool's `aliases` array
//   5. Try MongoDB regex prefix/substring match
//   6. Try fuzzy match (Levenshtein distance) — only for short queries
//   7. Return ranked matches with confidence scores
//
// Output shape:
//   {
//     type: 'direct_tool' | 'not_found',
//     exact_match: bool,
//     query: string,
//     did_you_mean: string | null,
//     confidence: 0..1,
//     tool: <tool object> | null,
//     related: [<tool objects>],
//     suggestions: [<tool objects>],   // for "not found" cases
//   }

import Tool from '../models/Tool.js';
import { getCanonicalFromAlias, normalizeAlias } from './toolAliasRegistry.js';
import logger from '../utils/logger.js';

// ── Confidence thresholds ────────────────────────────────────────────────────
const EXACT_MATCH_THRESHOLD = 0.95;
const FUZZY_MATCH_THRESHOLD = 0.7;   // 70% similarity is considered a good match
const SUGGESTION_THRESHOLD = 0.4;    // anything below this isn't worth suggesting

// ── Levenshtein distance for fuzzy matching ──────────────────────────────────
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

/**
 * Normalized similarity score in [0, 1].
 * 1.0 = identical, 0 = no similarity.
 */
export function similarity(a, b) {
  if (!a || !b) return 0;
  const aa = String(a).toLowerCase();
  const bb = String(b).toLowerCase();
  if (aa === bb) return 1;
  const maxLen = Math.max(aa.length, bb.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(aa, bb);
  return 1 - dist / maxLen;
}

/**
 * Normalize a search string for matching:
 * - lowercases
 * - removes whitespace, hyphens, and underscores
 * - trims punctuation
 */
function norm(str) {
  if (!str) return '';
  return String(str).toLowerCase().trim()
    .replace(/[.,!?'"()]/g, '')
    .replace(/[\s\-_]+/g, '')
    .trim();
}

/**
 * Build a normalized search key for a tool (used in DB-side normalization).
 * Combines: lowercased name, lowercased tool_name, all aliases (normalized).
 */
function buildSearchKey(tool) {
  const parts = [tool.name, tool.tool_name, ...(tool.aliases || [])];
  return parts.filter(Boolean).map(norm);
}

/**
 * Search the database directly for a tool by name.
 * Returns { type, tool, did_you_mean, confidence, related, suggestions }.
 */
export async function directToolSearch(query, options = {}) {
  const { includeRelated = true, relatedLimit = 5 } = options;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return {
      type: 'not_found',
      exact_match: false,
      query,
      did_you_mean: null,
      confidence: 0,
      tool: null,
      related: [],
      suggestions: [],
      message: 'Empty query.',
    };
  }

  const originalQuery = query.trim();
  const q = query.trim();
  const qNorm = norm(q);

  // ── 1) Check static alias registry ────────────────────────────────────────
  const aliasMatch = getCanonicalFromAlias(q);
  let resolvedName = aliasMatch; // possibly a canonical name like "ChatGPT"

  // ── 2) Exact case-insensitive match on name/tool_name ────────────────────
  let tool = null;
  let exact = false;
  let confidence = 0;

  if (resolvedName) {
    tool = await Tool.findOne({
      status: 'approved',
      $or: [
        { name: new RegExp(`^${escapeRegex(resolvedName)}$`, 'i') },
        { tool_name: new RegExp(`^${escapeRegex(resolvedName)}$`, 'i') },
        { aliases: new RegExp(`^${escapeRegex(resolvedName)}$`, 'i') },
      ],
    });
    if (tool) {
      exact = true;
      confidence = 1.0;
    }
  }

  if (!tool) {
    tool = await Tool.findOne({
      status: 'approved',
      $or: [
        { name: new RegExp(`^${escapeRegex(q)}$`, 'i') },
        { tool_name: new RegExp(`^${escapeRegex(q)}$`, 'i') },
        { aliases: new RegExp(`^${escapeRegex(q)}$`, 'i') },
      ],
    });
    if (tool) {
      exact = true;
      confidence = 1.0;
    }
  }

  // ── 3) Substring / case-insensitive contains match ───────────────────────
  if (!tool) {
    const candidates = await Tool.find({
      status: 'approved',
      $or: [
        { name: new RegExp(escapeRegex(q), 'i') },
        { tool_name: new RegExp(escapeRegex(q), 'i') },
        { aliases: new RegExp(escapeRegex(q), 'i') },
        { slug: new RegExp(escapeRegex(q), 'i') },
      ],
    })
      .sort({ 'stats.rating': -1, 'stats.views': -1 })
      .limit(20)
      .lean();

    if (candidates.length) {
      // Pick the best candidate by name similarity
      const scored = candidates.map((c) => {
        const nameSim = similarity(q, c.name);
        const aliasSim = (c.aliases || []).reduce(
          (m, a) => Math.max(m, similarity(q, a)),
          0,
        );
        return { tool: c, score: Math.max(nameSim, aliasSim) };
      });
      scored.sort((a, b) => b.score - a.score);
      const best = scored[0];
      tool = best.tool;
      confidence = best.score;
      exact = best.score >= EXACT_MATCH_THRESHOLD;
    }
  }

  // ── 4) Fuzzy / Levenshtein match (only for short queries) ────────────────
  if (!tool && qNorm.length >= 3 && qNorm.length <= 30) {
    // Use a coarse pre-filter: tools whose normalized name/aliases start
    // with the first 2 characters of the query. This keeps it fast.
    const prefix = qNorm.slice(0, 2);
    const candidates = await Tool.find({
      status: 'approved',
      $or: [
        { search_normalized: new RegExp(`^${escapeRegex(prefix)}`, 'i') },
        { name: new RegExp(`^${escapeRegex(q.slice(0, 2))}`, 'i') },
        { tool_name: new RegExp(`^${escapeRegex(q.slice(0, 2))}`, 'i') },
        { aliases: new RegExp(`^${escapeRegex(q.slice(0, 2))}`, 'i') },
      ],
    })
      .limit(200)
      .lean();

    if (candidates.length) {
      const scored = candidates.map((c) => {
        const nameSim = similarity(qNorm, norm(c.name));
        const toolNameSim = similarity(qNorm, norm(c.tool_name || c.name));
        const aliasSim = (c.aliases || []).reduce(
          (m, a) => Math.max(m, similarity(qNorm, norm(a))),
          0,
        );
        // Containment bonus
        const nameContains = norm(c.name).includes(qNorm) ? 0.2 : 0;
        const aliasContains = (c.aliases || []).some((a) => norm(a).includes(qNorm)) ? 0.2 : 0;
        return { tool: c, score: Math.max(nameSim, toolNameSim, aliasSim) + nameContains + aliasContains };
      });

      scored.sort((a, b) => b.score - a.score);

      // Pick best candidate
      const best = scored[0];
      if (best && best.score >= FUZZY_MATCH_THRESHOLD) {
        tool = best.tool;
        confidence = best.score;
        exact = false;
      }

      // Build suggestions from all candidates above the suggestion threshold
      const suggestions = scored
        .filter((s) => s.score >= SUGGESTION_THRESHOLD)
        .slice(0, 5)
        .map((s) => ({ tool: s.tool, confidence: Math.min(1, s.score) }));

      if (!tool) {
        return {
          type: 'not_found',
          exact_match: false,
          query: originalQuery,
          did_you_mean: suggestions[0]?.tool.name || null,
          confidence: 0,
          tool: null,
          related: [],
          suggestions: suggestions.map((s) => ({
            ...s.tool,
            _match_confidence: s.confidence,
          })),
          message: `Tool not available in our database.${suggestions[0] ? ` Did you mean "${suggestions[0].tool.name}"?` : ''}`,
        };
      }
    }
  }

  if (!tool) {
    logger.info(`[DirectSearch] No match for "${q}"`);
    return {
      type: 'not_found',
      exact_match: false,
      query: originalQuery,
      did_you_mean: null,
      confidence: 0,
      tool: null,
      related: [],
      suggestions: [],
      message: 'Tool not available in our database.',
    };
  }

  // ── 5) Fetch related tools (same canonical categories) ──────────────────
  let related = [];
  if (includeRelated) {
    const cats = (tool.canonical_categories && tool.canonical_categories.length)
      ? tool.canonical_categories
      : (tool.categories && tool.categories.length)
        ? tool.categories
        : tool.category
          ? [tool.category]
          : [];
    if (cats.length) {
      related = await Tool.find({
        status: 'approved',
        _id: { $ne: tool._id },
        $or: [
          { canonical_categories: { $in: cats } },
          { category: { $in: cats } },
          { categories: { $in: cats } },
        ],
      })
        .sort({ 'stats.rating': -1, 'stats.views': -1 })
        .limit(relatedLimit)
        .select('name slug category canonical_categories shortDescription pricing stats media')
        .lean();
    }
    if (related.length < relatedLimit) {
      const more = await Tool.find({
        status: 'approved',
        _id: { $ne: tool._id, $nin: related.map((r) => r._id) },
        name: { $ne: tool.name },
      })
        .sort({ 'stats.rating': -1, 'stats.views': -1 })
        .limit(relatedLimit - related.length)
        .select('name slug category canonical_categories shortDescription pricing stats media')
        .lean();
      related = [...related, ...more];
    }
  }

  return {
    type: 'direct_tool',
    exact_match: exact,
    query: originalQuery,
    did_you_mean: null,
    confidence: Math.min(1, confidence),
    tool,
    related,
    suggestions: [],
  };
}

/**
 * Escape a string for safe use inside a RegExp.
 */
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

logger.info('[DirectToolSearch] Direct tool search service initialized');

export default { directToolSearch, levenshtein, similarity };
