// backend/src/controllers/aiController.js
// INTELLIGENT AI TOOL SEARCH + COMPARISON + ANALYSIS ENGINE

import Tool from '../models/Tool.js';
import { runAIComparisonAgent } from '../services/aiComparisonService.js';
import { searchAITools } from '../services/aiSearchService.js';
import { discoverFromInternet } from '../services/internetDiscoveryService.js';
import { hybridSearch, discoverNewTools } from '../services/hybridSearchService.js';
import { intelligentSearch as doIntelligentSearch } from '../services/intelligentSearchService.js';
import { compareForUseCase, quickCompare } from '../services/useCaseComparisonService.js';
import { analyzeTool as doAnalyzeTool, analyzeForDecision } from '../services/toolAnalysisService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

const GEMINI_MODEL = 'gemini-2.0-flash';
let genAI = null;
const getGenAI = () => { if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); return genAI; };

// ── Gemini JSON helper ─────────────────────────────────────────────────────────
async function geminiJSON(prompt) {
  const model = getGenAI().getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
  });
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

// ── Fuzzy deduplication ────────────────────────────────────────────────────────
function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── 🎯 INTELLIGENT SEARCH (NEW ENDPOINT) ───────────────────────────────────────
export const intelligentSearch = async (req, res) => {
  const { query, limit = 5, userContext = {} } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const cacheKey = `intelligent:${query.toLowerCase().replace(/\s+/g, '_')}:${limit}`;
    let cached = null;
    try { cached = await redisClient.get(cacheKey); } catch {}
    if (cached) return res.json(JSON.parse(cached));

    // Run intelligent search
    const result = await doIntelligentSearch(query, { limit, userContext });

    // Cache for 10 minutes
    try { await redisClient.setex(cacheKey, 600, JSON.stringify(result)); } catch {}
    res.json(result);
  } catch (error) {
    logger.error(`Intelligent search error: ${error.message}`);
    res.status(500).json({ error: 'Search service temporarily unavailable.' });
  }
};

// ── 🔍 SMART RECOMMEND (Use-case based) ───────────────────────────────────────
export const smartRecommend = async (req, res) => {
  const { query, useCase, context, limit = 5 } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const result = await doIntelligentSearch(query, { 
      limit, 
      userContext: { useCase, context } 
    });

    res.json({
      query,
      use_case: useCase || result.intent?.use_case,
      user_context: context || result.intent?.user_context,
      ...result
    });
  } catch (error) {
    logger.error(`Smart recommend error: ${error.message}`);
    res.status(500).json({ error: 'Recommendation service unavailable.' });
  }
};

// ── ⚖️ USE-CASE BASED COMPARISON (NEW ENDPOINT) ─────────────────────────────────
export const compareUseCase = async (req, res) => {
  const { toolIds, toolNames, useCase, context = {} } = req.body;
  
  const identifiers = toolIds || toolNames;
  if (!identifiers || identifiers.length < 2) {
    return res.status(400).json({ error: 'Provide at least 2 tools to compare' });
  }

  try {
    const cacheKey = `compare_usecase:${identifiers.sort().join(',')}:${useCase || ''}`;
    let cached = null;
    try { cached = await redisClient.get(cacheKey); } catch {}
    if (cached) return res.json(JSON.parse(cached));

    const result = await compareForUseCase(identifiers, useCase, context);

    // Cache for 30 minutes
    try { await redisClient.setex(cacheKey, 1800, JSON.stringify(result)); } catch {}
    res.json(result);
  } catch (error) {
    logger.error(`Use-case comparison error: ${error.message}`);
    res.status(500).json({ error: 'Comparison service unavailable.' });
  }
};

// ── ⚡ QUICK COMPARE ───────────────────────────────────────────────────────────
export const quickCompareTools = async (req, res) => {
  const { toolNames, useCase } = req.body;
  if (!toolNames || toolNames.length < 2) {
    return res.status(400).json({ error: 'Provide at least 2 tool names' });
  }

  try {
    const result = await quickCompare(toolNames, useCase);
    res.json(result);
  } catch (error) {
    logger.error(`Quick compare error: ${error.message}`);
    res.status(500).json({ error: 'Comparison service unavailable.' });
  }
};

// ── 📊 TOOL ANALYSIS (NEW ENDPOINT) ───────────────────────────────────────────
export const analyzeTool = async (req, res) => {
  const { toolName, toolId, context = {} } = req.body;
  const identifier = toolName || toolId;
  if (!identifier) return res.status(400).json({ error: 'Tool name or ID required' });

  try {
    const cacheKey = `analyze:${identifier.toLowerCase().replace(/\s+/g, '_')}`;
    let cached = null;
    try { cached = await redisClient.get(cacheKey); } catch {}
    if (cached) return res.json(JSON.parse(cached));

    const result = await doAnalyzeTool(identifier, context);

    // Cache for 1 hour
    try { await redisClient.setex(cacheKey, 3600, JSON.stringify(result)); } catch {}
    res.json(result);
  } catch (error) {
    logger.error(`Tool analysis error: ${error.message}`);
    res.status(500).json({ error: 'Analysis service unavailable.' });
  }
};

// ── 🎯 DECISION HELP (Compare for decision) ───────────────────────────────────
export const helpDecision = async (req, res) => {
  const { toolNames, decisionContext = {} } = req.body;
  if (!toolNames || toolNames.length < 2) {
    return res.status(400).json({ error: 'Provide at least 2 tool names' });
  }

  try {
    const result = await analyzeForDecision(toolNames, decisionContext);
    res.json(result);
  } catch (error) {
    logger.error(`Decision help error: ${error.message}`);
    res.status(500).json({ error: 'Decision service unavailable.' });
  }
};

// ── Original Compare (Legacy) ──────────────────────────────────────────────────
export const compare = async (req, res) => {
  const { toolIds } = req.body;
  if (!toolIds || !Array.isArray(toolIds) || toolIds.length < 2 || toolIds.length > 4) {
    return res.status(400).json({ error: 'Please provide between 2 and 4 tool IDs' });
  }
  try {
    const cacheKey = `compare:v3:${[...toolIds].sort().join(',')}`;
    let cached = null;
    try { cached = await redisClient.get(cacheKey); } catch {}
    if (cached) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ type: 'result', data: JSON.parse(cached) })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }
    const tools = await Tool.find({ _id: { $in: toolIds } });
    if (tools.length < 2) return res.status(404).json({ error: 'Could not find enough tools.' });
    const result = await runAIComparisonAgent(tools, res);
    if (result) { try { await redisClient.setex(cacheKey, 1800, JSON.stringify(result)); } catch {} }
  } catch (error) {
    logger.error(`Compare error: ${error.message}`);
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

// ── Original Recommend (Legacy - Hybrid Search) ────────────────────────────────
export const recommend = async (req, res) => {
  const { query, limit = 10, pricing, includeInternet = true } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  const lim = Number(limit);
  const cacheKey = `hybrid:${query.toLowerCase().replace(/\s+/g, '_')}:${lim}:${includeInternet}`;

  try {
    let cached = null;
    try { cached = await redisClient.get(cacheKey); } catch {}
    if (cached) return res.json(JSON.parse(cached));

    const result = await hybridSearch(query, { limit: lim, includeInternet });

    let filtered = result.results;
    if (pricing && pricing !== 'all') {
      filtered = filtered.filter(t => t.pricing === pricing);
    }

    const response = {
      query,
      total_found: result.total_results,
      sources: result.sources,
      categorized: result.categorized,
      tools: filtered.slice(0, lim),
      trust_levels: {
        database: 'High (verified stored tools)',
        github: 'High (open source)',
        product_hunt: 'Medium (community vetted)',
        huggingface: 'Medium (model repository)',
        hacker_news: 'Medium (tech community)',
      },
    };

    try { await redisClient.setex(cacheKey, 300, JSON.stringify(response)); } catch {}
    res.json(response);
  } catch (error) {
    logger.error(`Hybrid recommend error: ${error.message}`);
    res.status(500).json({ error: 'Search service temporarily unavailable.' });
  }
};

// ── Internet discovery endpoint (Enhanced) ─────────────────────────────────────
export const discoverInternet = async (req, res) => {
  const { query } = req.body;
  if (!query) return res.status(400).json({ error: 'Query is required' });

  try {
    const cacheKey = `discover:${query.toLowerCase().replace(/\s+/g, '_')}`;
    let cached = null;
    try { cached = await redisClient.get(cacheKey); } catch {}
    if (cached) return res.json(JSON.parse(cached));

    const result = await discoverNewTools(query);

    const existingNames = new Set((await Tool.find({}, 'name').lean()).map(t => normalize(t.name)));
    let newToolsAdded = 0;

    for (const tool of result.tools.filter(t => t.source === 'github')) {
      if (!existingNames.has(normalize(tool.name))) {
        try {
          await Tool.create({
            name: tool.name,
            shortDescription: tool.description?.slice(0, 200) || 'AI tool from GitHub',
            description: tool.description || '',
            links: { website: tool.url, github: tool.url },
            category: tool.category || 'Coding',
            tags: tool.tags?.slice(0, 5) || [],
            status: 'approved',
            source: 'hybrid-discovery',
            stats: { rating: 0, ratingCount: 0, views: 0 },
          });
          existingNames.add(normalize(tool.name));
          newToolsAdded++;
        } catch (e) {
          logger.warn(`Failed to add tool ${tool.name}: ${e.message}`);
        }
      }
    }

    const response = { ...result, newToolsAdded };
    try { await redisClient.setex(cacheKey, 3600, JSON.stringify(response)); } catch {}
    res.json(response);
  } catch (error) {
    logger.error(`Internet discovery error: ${error.message}`);
    res.status(500).json({ error: 'Discovery service unavailable.' });
  }
};

export const chat = async (req, res) => res.status(501).json({ error: 'Not implemented' });