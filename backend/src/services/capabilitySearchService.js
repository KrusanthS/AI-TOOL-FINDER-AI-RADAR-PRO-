// backend/src/services/capabilitySearchService.js
// CAPABILITY-BASED DATABASE SEARCH
// Searches MongoDB by structured capability matching, NOT raw user text

import Tool from '../models/Tool.js';
import logger from '../utils/logger.js';

const DEFAULT_WEIGHTS = {
  capability_match: 40,
  use_case_match: 25,
  feature_match: 15,
  popularity: 10,
  trust: 10,
};

const NORMALIZE_PRICING = {
  free: ['free', 'free_plan', 'free_only'],
  freemium: ['freemium'],
  paid: ['paid', 'subscription'],
  enterprise: ['enterprise'],
};

/**
 * Search the database for tools that match the given capabilities.
 * Returns a ranked list with detailed scoring breakdown.
 */
export async function searchByCapabilities(understanding, capabilityMap, options = {}) {
  const { limit = 30, weights = DEFAULT_WEIGHTS, budgetFilter } = options;

  const {
    capability_filters = [],
    use_case_filters = [],
    feature_filters = [],
    target_user_filters = [],
    category_filters = [],
    exclude_terms = [],
  } = capabilityMap || {};

  // Build MongoDB query
  const query = { status: 'approved' };

  // OR-based capability matching — match if ANY filter matches
  const orClauses = [];

  if (capability_filters.length) {
    orClauses.push({ capabilities: { $in: capability_filters.map(c => new RegExp(escapeRegex(c), 'i')) } });
  }
  if (use_case_filters.length) {
    orClauses.push({ use_cases: { $in: use_case_filters.map(c => new RegExp(escapeRegex(c), 'i')) } });
    orClauses.push({ primary_use_cases: { $in: use_case_filters.map(c => new RegExp(escapeRegex(c), 'i')) } });
  }
  if (feature_filters.length) {
    orClauses.push({ features: { $in: feature_filters.map(c => new RegExp(escapeRegex(c), 'i')) } });
  }
  if (category_filters.length) {
    orClauses.push({ category: { $in: category_filters.map(c => new RegExp(escapeRegex(c), 'i')) } });
  }
  if (target_user_filters.length) {
    orClauses.push({ target_users: { $in: target_user_filters.map(c => new RegExp(escapeRegex(c), 'i')) } });
  }

  // Fallback to text search if no structured filters or to widen results
  const keywords = understanding.keywords || [];
  if (keywords.length) {
    orClauses.push({ tags: { $in: keywords.map(k => new RegExp(escapeRegex(k), 'i')) } });
    orClauses.push({ semantic_keywords: { $in: keywords.map(k => new RegExp(escapeRegex(k), 'i')) } });
    try {
      orClauses.push({ $text: { $search: keywords.join(' ') } });
    } catch (e) { /* text index may not exist */ }
  }

  if (orClauses.length) {
    query.$or = orClauses;
  }

  // Apply budget filter if specified
  if (budgetFilter && budgetFilter !== 'all') {
    const pricingMatches = NORMALIZE_PRICING[budgetFilter] || [budgetFilter];
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { pricing_model: { $in: pricingMatches } },
        { 'pricing.model': { $in: pricingMatches } },
        { pricing_type: { $in: pricingMatches } },
      ],
    });
  }

  try {
    const candidates = await Tool.find(query).limit(limit * 3).lean();

    logger.info(`Capability search returned ${candidates.length} candidates`);

    // Score each candidate
    const scored = candidates.map(tool => scoreTool(tool, understanding, capabilityMap, weights));

    // Filter out excluded terms
    const filtered = exclude_terms.length
      ? scored.filter(t => !matchesExcludeTerms(t, exclude_terms))
      : scored;

    // Sort by score descending
    filtered.sort((a, b) => b.score - a.score);

    return filtered.slice(0, limit);
  } catch (error) {
    logger.error(`Capability search error: ${error.message}`);
    return [];
  }
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Score a tool against the user's understanding using the specified weights.
 * Returns { tool, score, scoreBreakdown, why_recommended }.
 */
function scoreTool(tool, understanding, capabilityMap, weights) {
  const w = { ...DEFAULT_WEIGHTS, ...(weights || {}) };
  const breakdown = {};

  // Capability match (40%)
  const capMatches = countMatches(tool.capabilities, capabilityMap.capability_filters);
  breakdown.capability_match = (capMatches / Math.max(1, (capabilityMap.capability_filters || []).length)) * w.capability_match;

  // Use case match (25%)
  const ucMatches = countMatches(tool.use_cases, capabilityMap.use_case_filters) +
                    countMatches(tool.primary_use_cases, capabilityMap.use_case_filters);
  breakdown.use_case_match = (ucMatches / Math.max(1, (capabilityMap.use_case_filters || []).length)) * w.use_case_match;

  // Feature match (15%)
  const featMatches = countMatches(tool.features, capabilityMap.feature_filters) +
                      countMatches(tool.supported_tasks, capabilityMap.feature_filters);
  breakdown.feature_match = (featMatches / Math.max(1, (capabilityMap.feature_filters || []).length)) * w.feature_match;

  // Popularity (10%) — combine rating + views + saves
  const rating = (tool.stats?.rating || 0) / 5;        // 0..1
  const views = Math.min(1, (tool.stats?.views || 0) / 1000);
  const saves = Math.min(1, (tool.stats?.saves || 0) / 100);
  breakdown.popularity = ((rating * 0.5 + views * 0.3 + saves * 0.2)) * w.popularity;

  // Trust (10%)
  let trust = 0.5;
  if (tool.verified) trust += 0.3;
  if (tool.source === 'database') trust += 0.2;
  if ((tool.trust_score || 0) > 0) trust = Math.max(trust, (tool.trust_score || 0) / 100);
  breakdown.trust = Math.min(1, trust) * w.trust;

  const total = Object.values(breakdown).reduce((s, v) => s + v, 0);

  return {
    tool,
    score: Math.round(total * 100) / 100,
    scoreBreakdown: breakdown,
    confidence: Math.min(1, total / 100),
    why_recommended: buildWhyRecommended(tool, understanding, capabilityMap, capMatches, ucMatches, featMatches),
    best_for: buildBestFor(tool, understanding, capabilityMap),
  };
}

function countMatches(field, filters) {
  if (!field || !filters || !filters.length) return 0;
  const fieldLower = (Array.isArray(field) ? field : [field]).map(v => String(v).toLowerCase());
  return filters.filter(f => {
    const fLower = String(f).toLowerCase();
    return fieldLower.some(v => v.includes(fLower) || fLower.includes(v));
  }).length;
}

function matchesExcludeTerms(scored, excludeTerms) {
  const haystack = [
    scored.tool.name,
    scored.tool.shortDescription || scored.tool.description,
    (scored.tool.tags || []).join(' '),
    (scored.tool.categories || []).join(' '),
  ].join(' ').toLowerCase();
  return excludeTerms.some(t => haystack.includes(String(t).toLowerCase()));
}

function buildWhyRecommended(tool, understanding, capMap, capMatches, ucMatches, featMatches) {
  const reasons = [];

  if (capMatches > 0) {
    reasons.push(`Has ${capMatches} of your required capabilities (${(capMap.capability_filters || []).slice(0, 3).join(', ')})`);
  }
  if (ucMatches > 0) {
    reasons.push(`Matches ${ucMatches} use case(s) you need`);
  }
  if (featMatches > 0) {
    reasons.push(`Supports ${featMatches} of your preferred features`);
  }
  if (tool.verified) {
    reasons.push('Verified tool in our database');
  }
  if ((tool.stats?.rating || 0) >= 4) {
    reasons.push(`Highly rated (${tool.stats.rating}/5)`);
  }
  if (tool.pricing?.model === 'free' || tool.pricing?.model === 'freemium') {
    reasons.push(`Available in ${tool.pricing.model} tier — matches your budget preference`);
  }

  if (!reasons.length) {
    reasons.push(`Listed in ${tool.category || 'AI'} category — relevant to "${understanding.intent}"`);
  }

  return reasons.join('. ');
}

function buildBestFor(tool, understanding, capMap) {
  const useCases = (tool.use_cases || tool.primary_use_cases || []).slice(0, 3);
  if (useCases.length) {
    return useCases.join(', ');
  }
  if (tool.category) {
    return `${tool.category} tasks`;
  }
  return understanding.use_case || understanding.intent || 'general AI tasks';
}

export default { searchByCapabilities };
