// backend/src/services/intelligentSearchService.js
// Full intelligent AI tool search + discovery + recommendation engine

import Tool from '../models/Tool.js';
import { hybridSearch } from './hybridSearchService.js';
import { analyzeIntent, expandQuery, analyzeUseCase } from './intentAnalysisService.js';
import { searchPermanentTools } from './permanentToolService.js';
import logger from '../utils/logger.js';

// ── Main Intelligent Search ───────────────────────────────────────────────────
export async function intelligentSearch(query, options = {}) {
  const { limit = 5, userContext = {} } = options;
  
  logger.info(`Intelligent search: "${query}"`);
  
  // Step 1: Analyze user intent
  const intent = await analyzeIntent(query);
  logger.info(`Intent analyzed: ${JSON.stringify(intent)}`);
  
  // Step 2: Expand query semantically
  const expanded = await expandQuery(query, intent);
  logger.info(`Query expanded: ${JSON.stringify(expanded)}`);
  
  // Step 3: Search all sources in parallel (database + permanent DB + internet)
  const [dbResults, permanentResults, internetResults] = await Promise.all([
    searchDatabase(expanded, intent),
    searchPermanentDB(query, expanded, intent),
    searchInternet(expanded, intent)
  ]);
  
  // Step 4: Merge and rank results (permanent DB results fed alongside DB results)
  const merged = mergeResults([...dbResults, ...permanentResults], internetResults, intent);
  
  // Step 5: Generate recommendations
  const recommendations = generateRecommendations(merged, query, intent);
  
  return {
    query,
    intent,
    expanded,
    total_found: merged.length,
    tools: recommendations.slice(0, limit),
    sources: {
      database: dbResults.length,
      permanent_db: permanentResults.length,
      internet: internetResults.length,
    },
    reasoning: generateReasoning(recommendations, intent)
  };
}

// ── Database Search (Semantic) ─────────────────────────────────────────────────
async function searchDatabase(expanded, intent) {
  try {
    const searchTerms = [
      ...expanded.expanded_keywords,
      ...expanded.semantic_terms.slice(0, 5)
    ];
    
    const filter = { status: 'approved' };
    
    if (intent.category_hint) {
      filter.category = { $regex: intent.category_hint, $options: 'i' };
    }
    
    // Text search with expanded keywords
    const searchText = searchTerms.join(' ');
    let tools = [];
    
    try {
      tools = await Tool.find(
        { ...filter, $text: { $search: searchText } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(30)
        .lean();
    } catch { }
    
    // If no text results, fallback to regex search
    if (tools.length < 5) {
      const orConditions = searchTerms.map(term => ({
        $or: [
          { name: { $regex: term, $options: 'i' } },
          { shortDescription: { $regex: term, $options: 'i' } },
          { tags: { $in: [new RegExp(term, 'i')] } }
        ]
      }));
      
      tools = await Tool.find({ ...filter, $or: orConditions })
        .sort({ 'stats.rating': -1, 'stats.views': -1 })
        .limit(30)
        .lean();
    }
    
    return tools.map(tool => ({
      ...tool,
      source: 'database',
      source_detail: 'stored',
      relevance_score: calculateRelevanceScore(tool, expanded, intent),
      trust_level: 'High (verified)',
      why_recommended: generateWhyRecommended(tool, intent)
    }));
  } catch (error) {
    logger.error(`Database search error: ${error.message}`);
    return [];
  }
}

// ── Permanent Database Search ─────────────────────────────────────────────────
// Queries the dedicated PermanentTool collection (curated, always-on storage).
// Results are mapped to the same shape as searchDatabase() so mergeResults()
// can handle them without any special-casing.
async function searchPermanentDB(query, expanded, intent) {
  try {
    // Use expanded keywords to improve recall
    const searchTerms = [
      query,
      ...(expanded.expanded_keywords || []).slice(0, 3),
    ].filter(Boolean);

    // Run parallel: text-based search for each term, then merge
    const resultSets = await Promise.all(
      searchTerms.map(term => searchPermanentTools(term, { limit: 20 }))
    );

    // Flatten and deduplicate by _id
    const seen = new Set();
    const tools = [];
    for (const set of resultSets) {
      for (const t of set) {
        const key = t._id ? t._id.toString() : t.name;
        if (!seen.has(key)) {
          seen.add(key);
          tools.push(t);
        }
      }
    }

    return tools.map(tool => ({
      // Normalize to common shape used by mergeResults()
      _id: tool._id,
      name: tool.name,
      shortDescription: tool.short_description || tool.description || '',
      description: tool.description || '',
      category: tool.category || 'General',
      tags: tool.tags || [],
      pricing: { model: (tool.pricing || 'unknown').toLowerCase() },
      stats: {
        rating: tool.rating || 0,
        ratingCount: 0,
        views: tool.popularity_score || 0,
      },
      links: { website: tool.website_url || '' },
      media: { logo: tool.logo_url || '' },
      features: tool.features || [],
      use_cases: tool.use_cases || [],
      url: tool.website_url || '',
      logo: tool.logo_url || '',
      // Source metadata
      source: 'permanent_db',
      source_detail: 'curated',
      relevance_score: calculatePermanentRelevanceScore(tool, expanded, intent),
      trust_level: 'High (curated database)',
      why_recommended: generateWhyRecommended(
        { ...tool, source: 'permanent_db', stats: { rating: tool.rating || 0 } },
        intent
      ),
    }));
  } catch (error) {
    logger.error(`Permanent DB search error: ${error.message}`);
    return [];
  }
}

// ── Relevance score for permanent DB tools ────────────────────────────────────
function calculatePermanentRelevanceScore(tool, expanded, intent) {
  let score = 0;

  // Category match (40%)
  const cat = (tool.category || '').toLowerCase();
  const hint = (intent.category_hint || '').toLowerCase();
  if (hint && cat === hint) score += 40;
  else if (hint && cat.includes(hint)) score += 25;

  // Name / keyword match (30%)
  const nameLower = (tool.name || '').toLowerCase();
  const descLower = (tool.description || tool.short_description || '').toLowerCase();
  const matchedKeyword = (expanded.expanded_keywords || []).some(k =>
    nameLower.includes(k.toLowerCase()) || descLower.includes(k.toLowerCase())
  );
  if (matchedKeyword) score += 30;

  // Popularity (15%)
  score += Math.min(15, (tool.popularity_score || 0) / 10);

  // Rating (10%)
  score += Math.min(10, (tool.rating || 0) * 2);

  // Permanent DB trust bonus (5%)
  score += 5;

  return Math.round(score * 100) / 100;
}

// ── Internet Search (Real-time) ───────────────────────────────────────────────
async function searchInternet(expanded, intent) {
  try {
    // Search with multiple queries
    const queries = expanded.search_queries?.slice(0, 3) || [intent.user_intent];
    
    const results = await Promise.all(
      queries.map(q => hybridSearch(q, { limit: 20, includeInternet: true }))
    );
    
    // Flatten and deduplicate
    const allTools = results
      .flatMap(r => r.results || [])
      .reduce((acc, tool) => {
        const key = tool.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!acc.has(key)) {
          acc.set(key, { ...tool, relevance_score: 0 });
        }
        return acc;
      }, new Map())
      .values();
    
    return Array.from(allTools).map(tool => ({
      ...tool,
      source: 'internet',
      source_detail: tool.source || 'discovered',
      relevance_score: calculateInternetRelevance(tool, expanded, intent),
      trust_level: tool.trust_level || 'Medium (internet)',
      why_recommended: generateWhyRecommended(tool, intent)
    }));
  } catch (error) {
    logger.error(`Internet search error: ${error.message}`);
    return [];
  }
}

// ── Merge Results ──────────────────────────────────────────────────────────────
function mergeResults(dbResults, internetResults, intent) {
  const merged = [...dbResults, ...internetResults];
  
  // Deduplicate by normalized name
  const seen = new Map();
  const deduplicated = merged.filter(tool => {
    const key = tool.name?.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (seen.has(key)) {
      // Merge: prefer database source, combine scores
      const existing = seen.get(key);
      if (tool.source === 'database') {
        existing.source = 'database';
        existing.trust_level = 'High (verified + internet)';
      }
      existing.relevance_score = Math.max(existing.relevance_score, tool.relevance_score);
      return false;
    }
    seen.set(key, tool);
    return true;
  });
  
  // Sort by relevance score
  deduplicated.sort((a, b) => b.relevance_score - a.relevance_score);
  
  return deduplicated;
}

// ── Scoring System (Use-case based) ───────────────────────────────────────────
function calculateRelevanceScore(tool, expanded, intent) {
  let score = 0;
  
  // Use-case match (50%)
  const categoryMatch = tool.category?.toLowerCase() === intent.category_hint?.toLowerCase();
  if (categoryMatch) score += 50;
  else if (intent.category_hint && tool.category?.toLowerCase().includes(intent.category_hint?.toLowerCase())) score += 30;
  
  // Semantic relevance (20%)
  const nameMatch = expanded.expanded_keywords?.some(k => 
    tool.name?.toLowerCase().includes(k.toLowerCase())
  );
  if (nameMatch) score += 20;
  
  // Popularity (10%)
  const popularity = (tool.stats?.rating || 0) * 5 + (tool.stats?.views || 0) / 100;
  score += Math.min(10, popularity);
  
  // Recency (10%)
  const recency = tool.updated_at ? Math.min(10, (Date.now() - new Date(tool.updated_at)) / (1000 * 60 * 60 * 24 * 30)) : 5;
  score += recency;
  
  // Trust (10%)
  score += tool.source === 'database' ? 10 : 5;
  
  return Math.round(score * 100) / 100;
}

function calculateInternetRelevance(tool, expanded, intent) {
  let score = 0;
  
  // Use-case match (50%)
  if (tool.category?.toLowerCase() === intent.category_hint?.toLowerCase()) score += 50;
  
  // Popularity from source (20%)
  score += Math.min(20, (tool.scores?.popularity || 0) / 10);
  
  // Recency (10%)
  score += Math.min(10, tool.scores?.recency || 0) / 10;
  
  // Trust (10%)
  score += (tool.scores?.trust || 65) / 10;
  
  // Engagement (10%)
  score += Math.min(10, (tool.scores?.engagement || 0) / 50);
  
  return Math.round(score * 100) / 100;
}

// ── Generate Recommendations ───────────────────────────────────────────────────
function generateRecommendations(tools, query, intent) {
  return tools.map(tool => ({
    name: tool.name,
    description: tool.shortDescription || tool.description || '',
    url: tool.url || tool.links?.website || '',
    category: tool.category || 'General',
    source: tool.source,
    trust_level: tool.trust_level,
    relevance_score: tool.relevance_score,
    why_recommended: tool.why_recommended,
    pricing: tool.pricing?.model || tool.pricing || 'unknown',
    logo: tool.logo || tool.media?.logo || '',
    tags: tool.tags || []
  }));
}

// ── Generate Reasoning ─────────────────────────────────────────────────────────
function generateReasoning(recommendations, intent) {
  return {
    user_intent: intent.user_intent,
    use_case: intent.use_case,
    context: intent.user_context,
    search_strategy: 'Parallel database + internet search with semantic expansion',
    ranking_criteria: 'Use-case match (50%) + Semantic relevance (20%) + Popularity (10%) + Recency (10%) + Trust (10%)',
    top_pick_reason: recommendations[0] 
      ? `${recommendations[0].name} is recommended because ${recommendations[0].why_recommended}`
      : 'No matching tools found'
  };
}

// ── Generate Why Recommended ───────────────────────────────────────────────────
function generateWhyRecommended(tool, intent) {
  const reasons = [];
  
  if (tool.source === 'database') {
    reasons.push('Verified tool from our database');
  }
  
  if (tool.category?.toLowerCase() === intent.category_hint?.toLowerCase()) {
    reasons.push(`Perfect match for ${intent.use_case} needs`);
  }
  
  if (tool.stats?.rating >= 4) {
    reasons.push('Highly rated by users');
  }
  
  if (tool.stats?.views > 1000) {
    reasons.push('Popular among users');
  }
  
  return reasons.join('. ') || `Suitable for ${intent.use_case} tasks`;
}

export default { intelligentSearch };