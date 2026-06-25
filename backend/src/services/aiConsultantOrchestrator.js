// backend/src/services/aiConsultantOrchestrator.js
// THE ORCHESTRATOR — LLM-first recommendation engine
//
// Full workflow:
//   User Query
//     → LLM Requirement Understanding
//     → Intent Extraction
//     → Capability Mapping
//     → Database Capability Matching
//     → Ranking (40% capability + 25% use case + 15% feature + 10% popularity + 10% trust)
//     → Database Sufficiency Evaluation
//     → Web Discovery (only if needed)
//     → Tool Validation
//     → Recommendation Generation
//     → Intent-based Caching
//     → Response

import logger from '../utils/logger.js';
import { understandRequirement, mapCapabilitiesToSearch } from './llmConsultantService.js';
import { searchByCapabilities } from './capabilitySearchService.js';
import { validateToolBatch, validateBatchReachability } from './toolValidationService.js';
import { discoverToolsForIntent } from './intentWebDiscoveryService.js';
import { generateRecommendations } from './recommendationService.js';
import {
  buildIntentCacheKey,
  getCachedIntent,
  setCachedIntent,
} from './intentCacheService.js';

const DB_SUFFICIENCY_MIN_RESULTS = 3;
const DB_SUFFICIENCY_MIN_SCORE = 70;

/**
 * Run the full LLM-first recommendation pipeline.
 *
 * @param {string} userQuery - The user's natural-language request
 * @param {object} options
 * @returns {object} structured response with user_intent, recommended_tools, reasoning, source
 */
export async function consult(userQuery, options = {}) {
  const {
    limit = 8,
    skipCache = false,
    skipLLM = false,
    budgetFilter = null,
  } = options;

  const startTime = Date.now();
  logger.info(`[Consultant] Query: "${userQuery}"`);

  // ── Step 1: LLM Requirement Understanding ────────────────────────────────
  let understanding;
  if (skipLLM) {
    understanding = makeMinimalUnderstanding(userQuery);
  } else {
    understanding = await understandRequirement(userQuery);
  }
  logger.info(`[Consultant] Understood intent: ${understanding.intent}`);

  // ── Step 2: Capability Mapping ──────────────────────────────────────────
  const capabilityMap = skipLLM
    ? makeMinimalCapabilityMap(understanding)
    : await mapCapabilitiesToSearch(understanding);

  // ── Step 3: Intent-based cache lookup ──────────────────────────────────
  const cacheKey = buildIntentCacheKey(understanding, { limit });
  if (!skipCache) {
    const cached = await getCachedIntent(cacheKey);
    if (cached) {
      logger.info(`[Consultant] Cache HIT — returning in ${Date.now() - startTime}ms`);
      return { ...cached, fromCache: true, responseTimeMs: Date.now() - startTime };
    }
  }

  // ── Step 4: Database Capability Matching ───────────────────────────────
  const dbResults = await searchByCapabilities(understanding, capabilityMap, {
    limit: limit * 2,
    budgetFilter,
  });

  logger.info(`[Consultant] DB returned ${dbResults.length} candidates`);

  // Filter out low-relevance matches — only keep tools that genuinely match
  const minScore = capabilityMap.minimum_relevance_threshold || 25;
  const filteredDbResults = dbResults.filter(r => r.score >= minScore);
  logger.info(`[Consultant] After relevance filter (>=${minScore}): ${filteredDbResults.length} relevant candidates`);

  // ── Step 5: Database Sufficiency Evaluation ───────────────────────────
  const highestScore = filteredDbResults[0]?.score || 0;
  const isSufficient = filteredDbResults.length >= DB_SUFFICIENCY_MIN_RESULTS && highestScore >= DB_SUFFICIENCY_MIN_SCORE;

  let allCandidates = filteredDbResults;
  let discoverySource = 'database';

  // ── Step 6: Web Discovery (only if DB insufficient) ────────────────────
  if (!isSufficient) {
    logger.info(`[Consultant] DB insufficient (results=${filteredDbResults.length}, top=${highestScore}). Triggering web discovery.`);
    const webResults = await discoverToolsForIntent(understanding, capabilityMap, { maxResults: limit * 2 });

    // ── Step 7: Tool Validation ──────────────────────────────────────────
    const { valid: validatedWeb, rejected } = validateToolBatch(webResults);
    logger.info(`[Consultant] Web discovery: ${webResults.length} found, ${validatedWeb.length} validated, ${rejected.length} rejected`);

    // Convert validated web results into the same shape as DB candidates
    // Only include web results with trust >= 75 (famous/trusted tools only)
    const webAsCandidates = validatedWeb
      .filter(tool => (tool.trust || 0) >= 75 || tool.source === 'llm_suggested')
      .map(tool => ({
        tool: {
          name: tool.name,
          description: tool.description,
          shortDescription: tool.shortDescription,
          category: tool.category,
          pricing: tool.pricing,
          capabilities: tool.capabilities || [],
          use_cases: tool.tags || [],
          primary_use_cases: tool.tags || [],
          features: tool.features || [],
          target_users: [],
          stats: { rating: 0, ratingCount: 0, views: tool.popularity || 0, saves: 0 },
          source: tool.source,
          source_detail: tool.source_detail,
          links: { website: tool.website || tool.url },
          media: { logo: tool.logo || '' },
          verified: false,
          url: tool.url,
        },
        score: tool.trust || 75,
        scoreBreakdown: { web: tool.trust || 75 },
        confidence: (tool.trust || 75) / 100,
        why_recommended: tool.why_top_rated
          ? `${tool.why_top_rated} Matches your ${understanding.intent} need.`
          : `Top-rated tool for ${understanding.intent} — matches your goal: ${understanding.goal}`,
        best_for: tool.best_for || understanding.use_case || understanding.intent,
        source: tool.source,
      }));

    // Merge DB + web, dedupe, keep best score
    const seen = new Set();
    allCandidates = [...filteredDbResults, ...webAsCandidates].filter(c => {
      const key = String(c.tool.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    allCandidates.sort((a, b) => b.score - a.score);
    discoverySource = filteredDbResults.length > 0 ? 'hybrid' : 'web';
  } else {
    logger.info(`[Consultant] DB sufficient (results=${filteredDbResults.length}, top=${highestScore}). Skipping web discovery.`);
  }

  // ── Step 8: Recommendation Generation ──────────────────────────────────
  const recommendations = await generateRecommendations(allCandidates, understanding, capabilityMap, { limit });

  // ── Step 9: Build response ─────────────────────────────────────────────
  const response = {
    user_intent: {
      intent: understanding.intent,
      use_case: understanding.use_case,
      goal: understanding.goal,
      desired_outcome: understanding.desired_outcome,
      skill_level: understanding.skill_level,
      budget_preference: understanding.budget_preference,
      content_type: understanding.content_type,
      required_capabilities: understanding.required_capabilities || [],
      preferred_capabilities: understanding.preferred_capabilities || [],
      deal_breakers: understanding.deal_breakers || [],
      constraints: understanding.constraints || [],
      industry: understanding.industry,
      original_query: understanding.original_query || userQuery,
    },
    recommended_tools: recommendations.map(formatRecommendedTool),
    reasoning: buildReasoning(understanding, allCandidates, recommendations, discoverySource),
    confidence: recommendations.length > 0
      ? Math.round(recommendations.reduce((s, r) => s + (r.confidence_score || 0), 0) / recommendations.length)
      : 0,
    source: discoverySource,
    total_candidates: allCandidates.length,
    db_sufficiency: {
      is_sufficient: isSufficient,
      db_results_count: filteredDbResults.length,
      highest_db_score: highestScore,
    },
    responseTimeMs: Date.now() - startTime,
    fromCache: false,
  };

  // ── Step 10: Intent-based cache write ──────────────────────────────────
  if (!skipCache) {
    await setCachedIntent(cacheKey, response);
  }

  logger.info(`[Consultant] Done in ${response.responseTimeMs}ms — ${recommendations.length} recommendations (source: ${discoverySource})`);

  return response;
}

/**
 * Format a recommended tool for the final response.
 */
function formatRecommendedTool(rec) {
  const t = rec.tool;
  return {
    tool_name: t.name,
    slug: t.slug || String(t.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: t.name,
    description: t.shortDescription || t.description,
    shortDescription: t.shortDescription || t.description,
    url: t.url || t.links?.website || t.website_url,
    website: t.links?.website || t.url || t.website_url,
    logo: t.logo || t.media?.logo || t.logo_url,
    category: t.category,
    pricing: t.pricing,
    tags: t.tags || [],
    capabilities: t.capabilities || [],
    use_cases: t.use_cases || t.primary_use_cases || [],
    rating: t.stats?.rating || 0,
    why_recommended: rec.why_recommended,
    best_for: rec.best_for,
    pros: rec.pros || [],
    limitations: rec.limitations || [],
    confidence_score: rec.confidence_score,
    confidence: rec.confidence,
    source: rec.source || t.source || 'database',
    verified: t.verified || false,
    match_score: rec.score,
  };
}

/**
 * Build a transparent reasoning explanation.
 */
function buildReasoning(understanding, candidates, recommendations, discoverySource) {
  if (!recommendations.length) {
    return `I analyzed your request for "${understanding.goal || understanding.original_query}" but couldn't find suitable tools. Try broadening your description or adjusting your budget preference.`;
  }

  const top = recommendations[0];
  const sources = [...new Set(candidates.slice(0, 5).map(c => c.source || c.tool?.source).filter(Boolean))];

  let reasoning = `I understood you want to ${understanding.goal || understanding.original_query}. `;
  reasoning += `Your key requirements are: ${(understanding.required_capabilities || []).slice(0, 3).join(', ') || 'general AI assistance'}. `;
  reasoning += `I evaluated ${candidates.length} candidate tools from ${sources.join(', ') || 'our database'}. `;
  reasoning += `My top recommendation is **${top.tool_name}** (confidence: ${top.confidence_score}%) because ${top.why_recommended || 'it best matches your stated requirements'}.`;

  return reasoning;
}

function makeMinimalUnderstanding(query) {
  return {
    intent: 'general_ai_assistance',
    use_case: 'general',
    goal: query,
    desired_outcome: query,
    skill_level: 'intermediate',
    budget_preference: 'free_preferred',
    content_type: 'text',
    constraints: [],
    industry: 'general',
    required_capabilities: query.toLowerCase().split(/\s+/).filter(w => w.length > 3),
    preferred_capabilities: [],
    deal_breakers: [],
    workflow_needs: [],
    keywords: query.toLowerCase().split(/\s+/).filter(w => w.length > 2),
    original_query: query,
  };
}

function makeMinimalCapabilityMap(understanding) {
  return {
    capability_filters: understanding.required_capabilities || [],
    use_case_filters: [understanding.use_case].filter(Boolean),
    feature_filters: [],
    target_user_filters: [understanding.skill_level].filter(Boolean),
    category_filters: [],
    exclude_terms: [],
    weight_overrides: { capability_match: 40, use_case_match: 25, feature_match: 15, popularity: 10, trust: 10 },
  };
}

export default { consult };
