// backend/src/services/hybridSearchService.js
// HYBRID AI TOOL SEARCH ENGINE - Combines Database + Permanent DB + Live Internet Sources

import Tool from '../models/Tool.js';
import { searchPermanentTools } from './permanentToolService.js';
import axios from 'axios';
import logger from '../utils/logger.js';

// ── Config ─────────────────────────────────────────────────────────────────────
const TIMEOUT = 10000;
const MAX_INTERNET_RESULTS = 50;
const MAX_DB_RESULTS = 200;

// ── SSRF allowlist ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_HOSTS = new Set([
  'api.github.com',
  'huggingface.co',
  'hacker-news.firebaseio.com',
  'www.producthunt.com',
  'techcrunch.com',
  'venturebeat.com',
]);

function isAllowedUrl(urlStr) {
  try {
    const u = new URL(urlStr);
    if (!['https:', 'http:'].includes(u.protocol)) return false;
    const host = u.hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.)/.test(host)) return false;
    return ALLOWED_HOSTS.has(host);
  } catch {
    return false;
  }
}

// ── Helper: Safe HTTP fetch ────────────────────────────────────────────────────────
async function fetch(url, options = {}) {
  if (!isAllowedUrl(url)) {
    logger.warn(`Hybrid fetch blocked (SSRF protection) [${url}]`);
    return null;
  }
  try {
    return await axios.get(url, { timeout: TIMEOUT, ...options }).then(r => r.data).catch(() => null);
  } catch (e) {
    logger.warn(`Hybrid fetch failed [${url}]: ${e.message}`);
    return null;
  }
}

// ── STEP 1: Fetch from DATABASE ───────────────────────────────────────────────
async function fetchDatabaseTools(query) {
  try {
    const filter = { status: 'approved' };
    
    if (query) {
      const searchText = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');
      filter.$or = [
        { name: { $regex: searchText, $options: 'i' } },
        { shortDescription: { $regex: searchText, $options: 'i' } },
        { category: { $regex: searchText, $options: 'i' } },
        { tags: { $in: [new RegExp(searchText, 'i')] } },
      ];
    }

    const tools = await Tool.find(filter)
      .sort({ 'stats.rating': -1, 'stats.views': -1 })
      .limit(MAX_DB_RESULTS)
      .lean();

    return tools.map(tool => ({
      name: tool.name,
      description: tool.shortDescription || tool.description || '',
      url: tool.links?.website || tool.website_url || '',
      category: tool.category || 'General',
      popularity_score: tool.popularity_score || (tool.stats?.rating || 0) * 10,
      recency_score: 0,
      trust_score: 100,
      engagement_score: tool.stats?.views || 0,
      source: 'database',
      source_detail: 'stored',
      logo: tool.media?.logo || tool.logo_url,
      pricing: tool.pricing?.model || tool.pricing_type || 'unknown',
      tags: tool.tags || [],
      raw: tool,
    }));
  } catch (error) {
    logger.error(`Database fetch error: ${error.message}`);
    return [];
  }
}

// ── STEP 1b: Fetch from PERMANENT TOOL DATABASE ───────────────────────────────
// Queries the curated PermanentTool collection. Gracefully returns [] on error.
async function fetchPermanentTools(query) {
  try {
    const tools = await searchPermanentTools(query || '', { limit: 50 });
    return tools.map(tool => ({
      name: tool.name,
      description: tool.short_description || tool.description || '',
      url: tool.website_url || '',
      category: tool.category || 'General',
      popularity_score: tool.popularity_score || (tool.rating || 0) * 20,
      recency_score: 50,
      trust_score: 95, // curated tools get high trust
      engagement_score: tool.popularity_score || 0,
      source: 'permanent_db',
      source_detail: 'curated',
      logo: tool.logo_url || '',
      pricing: (tool.pricing || 'unknown').toLowerCase(),
      tags: tool.tags || [],
      raw: tool,
    }));
  } catch (error) {
    logger.error(`Permanent DB fetch error: ${error.message}`);
    return [];
  }
}

// ── STEP 1: Fetch from LIVE INTERNET SOURCES ───────────────────────────────────

// Product Hunt (using RSS Feed - No Auth Required)
async function fetchProductHunt(query) {
  try {
    const response = await axios.get('https://www.producthunt.com/feed', {
      headers: { 'User-Agent': 'AIRadarBot/2.0' },
      timeout: TIMEOUT,
    });

    const xmlData = response.data;
    if (!xmlData) return [];

    // Parse XML entries
    const entryMatches = xmlData.match(/<entry>([\s\S]*?)<\/entry>/g);
    if (!entryMatches) return [];

    const queryLower = query.toLowerCase();
    const aiKeywords = ['ai', 'gpt', 'chatbot', 'agent', 'llm', 'claude', 'gemini', 'copilot', 'assistant', 'automation', 'model', 'voice', 'video', 'image', 'coding', 'code', 'writing'];

    const items = entryMatches.map(entry => {
      const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim();
      const link = (entry.match(/<link rel="alternate" type="text\/html" href="([^"]+)"/)?.[1] || '');
      const published = (entry.match(/<published>([\s\S]*?)<\/published>/)?.[1] || '').trim();
      const content = (entry.match(/<content[\s\S]*?>([\s\S]*?)<\/content>/)?.[1] || '').trim();
      const description = content.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
      
      return { title, link, published, description };
    }).filter(item => {
      const titleLower = item.title.toLowerCase();
      const descLower = item.description.toLowerCase();
      return titleLower.includes(queryLower) || 
             aiKeywords.some(k => titleLower.includes(k)) ||
             aiKeywords.some(k => descLower.includes(k));
    }).slice(0, MAX_INTERNET_RESULTS);

    return items.map(item => ({
      name: item.title,
      description: item.description?.slice(0, 200) || '',
      url: item.link,
      category: 'General',
      popularity_score: 50,
      recency_score: item.published ? daysSince(new Date(item.published)) : 50,
      trust_score: 70,
      engagement_score: 30,
      source: 'product_hunt',
      source_detail: 'trending',
      logo: '',
      pricing: 'unknown',
      tags: ['AI', 'Product Hunt'],
      raw: item,
    }));
  } catch (error) {
    logger.warn(`Product Hunt fetch failed: ${error.message}`);
    return [];
  }
}

// GitHub
async function fetchGitHub(query) {
  const headers = process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {};

  const data = await fetch('https://api.github.com/search/repositories', {
    params: { q: `${query} AI tool`, sort: 'stars', order: 'desc', per_page: MAX_INTERNET_RESULTS },
    headers: { ...headers, Accept: 'application/vnd.github.v3+json' },
  });

  if (!data?.items) return [];
  return data.items.map(r => ({
    name: r.name,
    description: r.description || '',
    url: r.html_url,
    category: mapCategory([r.language, ...(r.topics || [])]),
    popularity_score: r.stargazers_count * 3,
    recency_score: r.updated_at ? daysSince(r.updated_at) : 30,
    trust_score: 80,
    engagement_score: r.stargazers_count + (r.forks_count || 0),
    source: 'github',
    source_detail: 'open_source',
    logo: r.owner?.avatar_url || '',
    pricing: r.license?.spdx_id ? 'free' : 'unknown',
    tags: r.topics || [],
    raw: r,
  }));
}

// HuggingFace
async function fetchHuggingFace(query) {
  const data = await fetch('https://huggingface.co/api/models', {
    params: { search: query, limit: MAX_INTERNET_RESULTS, sort: 'downloads', direction: -1 },
  });

  if (!Array.isArray(data)) return [];
  return data.map(m => ({
    name: m.modelId || m.id,
    description: m.pipeline_tag || 'AI model',
    url: `https://huggingface.co/${m.modelId || m.id}`,
    category: mapCategory([m.pipeline_tag, ...(m.tags || [])]),
    popularity_score: (m.downloads || 0) / 1000,
    recency_score: m.lastModified ? daysSince(m.lastModified) : 40,
    trust_score: 75,
    engagement_score: m.likes || 0,
    source: 'huggingface',
    source_detail: 'model',
    logo: '',
    pricing: 'free',
    tags: m.tags || [],
    raw: m,
  }));
}

// Hacker News API (Official)
async function fetchHackerNews(query) {
  // Get top stories IDs
  const storyIds = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  if (!Array.isArray(storyIds)) return [];

  // Fetch first 30 items
  const ids = storyIds.slice(0, 30);
  const items = await Promise.all(
    ids.map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`))
  );

  // Filter for AI-related items
  const aiKeywords = ['ai', 'gpt', 'llm', 'chatbot', 'machine learning', 'neural', 'openai', 'anthropic', 'claude', 'gemini', 'copilot', 'assistant', 'automation', 'agent'];
  
  const aiItems = items.filter(item => {
    if (!item || !item.title) return false;
    const titleLower = item.title.toLowerCase();
    return aiKeywords.some(keyword => titleLower.includes(keyword));
  });

  return aiItems.slice(0, MAX_INTERNET_RESULTS).map(item => ({
    name: item.title,
    description: item.text ? item.text.slice(0, 200).replace(/<[^>]*>/g, '') : '',
    url: `https://news.ycombinator.com/item?id=${item.id}`,
    category: 'Tech News',
    popularity_score: item.score || 0,
    recency_score: item.time ? daysSince(item.time * 1000) : 50,
    trust_score: 65,
    engagement_score: item.descendants || 0,
    source: 'hacker_news',
    source_detail: 'tech_news',
    logo: '',
    pricing: 'unknown',
    tags: ['AI', 'Tech', 'HackerNews'],
    raw: item,
  }));
}

// RSS Feeds (TechCrunch, VentureBeat AI) — parse raw XML manually
async function fetchRSSFeeds(query) {
  const feeds = [
    'https://techcrunch.com/category/artificial-intelligence/feed/',
    'https://venturebeat.com/category/ai/feed/',
  ];

  const results = [];
  for (const feedUrl of feeds) {
    if (!isAllowedUrl(feedUrl)) continue;
    try {
      const response = await axios.get(feedUrl, { timeout: TIMEOUT, headers: { 'User-Agent': 'AIRadarBot/2.0' } });
      const xml = response.data;
      if (typeof xml !== 'string') continue;

      const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g);
      if (!itemMatches) continue;

      const items = itemMatches.slice(0, 5).map(item => {
        const title = (item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] || '').trim();
        const link = (item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || '').trim();
        const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || '').trim();
        const desc = (item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/)?.[1] || '')
          .replace(/<[^>]*>/g, '').trim().slice(0, 200);
        return { title, link, pubDate, desc };
      }).filter(i => i.title && i.link);

      results.push(...items.map(item => ({
        name: item.title,
        description: item.desc,
        url: item.link,
        category: 'AI News',
        popularity_score: 10,
        recency_score: item.pubDate ? daysSince(new Date(item.pubDate)) : 50,
        trust_score: 70,
        engagement_score: 5,
        source: 'rss_feed',
        source_detail: 'news',
        logo: '',
        pricing: 'unknown',
        tags: ['AI', 'News'],
        raw: item,
      })));
    } catch (error) {
      logger.warn(`RSS feed fetch failed [${feedUrl}]: ${error.message}`);
    }
  }

  return results;
}

// ── STEP 2: Normalization Helper ───────────────────────────────────────────────
function mapCategory(tags) {
  const tagStr = (tags || []).join(' ').toLowerCase();
  
  if (tagStr.match(/image|vision|stable diffusion|midjourney|dalle/)) return 'Image Generation';
  if (tagStr.match(/code|programming|developer|software/)) return 'Coding';
  if (tagStr.match(/chat|llm|language model|gpt|claude/)) return 'Chat AI';
  if (tagStr.match(/video|animation|video generation/)) return 'Video AI';
  if (tagStr.match(/audio|speech|tts|voice/)) return 'Audio AI';
  if (tagStr.match(/research|paper|scientific/)) return 'Research';
  if (tagStr.match(/automation|workflow|agent/)) return 'Automation';
  if (tagStr.match(/writing|text|content|copywriting/)) return 'Writing';
  if (tagStr.match(/marketing|seo|ads/)) return 'Marketing';
  
  return 'General';
}

function daysSince(date) {
  if (!date) return 50;
  const days = (Date.now() - new Date(date)) / (1000 * 60 * 60 * 24);
  return Math.max(0, 100 - days);
}

// ── STEP 3: Deduplication ───────────────────────────────────────────────────────
function normalizeName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findDuplicates(items) {
  const seen = new Map();
  const duplicates = new Set();

  items.forEach((item, index) => {
    const norm = normalizeName(item.name);
    if (seen.has(norm)) {
      duplicates.add(index);
      const prevIndex = seen.get(norm);
      duplicates.add(prevIndex);
    } else {
      seen.set(norm, index);
    }
  });

  return duplicates;
}

// ── STEP 4: Scoring Engine ──────────────────────────────────────────────────────
function calculateFinalScore(item) {
  const {
    popularity_score = 0,
    engagement_score = 0,
    recency_score = 0,
    trust_score = 0,
  } = item;

  const score = 
    (popularity_score * 0.25) +
    (engagement_score * 0.20) +
    (recency_score * 0.25) +
    (trust_score * 0.30);

  return Math.round(score * 100) / 100;
}

// ── STEP 5: Merge Strategy ──────────────────────────────────────────────────────
function mergeTools(dbTools, internetTools) {
  const merged = [...dbTools];
  const dbNames = new Set(dbTools.map(t => normalizeName(t.name)));

  internetTools.forEach(tool => {
    const norm = normalizeName(tool.name);
    if (!dbNames.has(norm)) {
      merged.push(tool);
      dbNames.add(norm);
    }
  });

  return merged;
}

// ── STEP 6: Categorization ──────────────────────────────────────────────────────
function categorizeTools(tools) {
  const categories = {
    'Chat AI': [],
    'Coding': [],
    'Image Generation': [],
    'Video AI': [],
    'Audio AI': [],
    'Writing': [],
    'Research': [],
    'Automation': [],
    'Marketing': [],
    'General': [],
  };

  tools.forEach(tool => {
    const cat = tool.category || 'General';
    if (categories[cat]) {
      categories[cat].push(tool);
    } else {
      categories['General'].push(tool);
    }
  });

  return categories;
}

// ── MAIN: Hybrid Search Engine ─────────────────────────────────────────────────
export async function hybridSearch(query, options = {}) {
  const { limit = 20, includeInternet = true } = options;

  logger.info(`Hybrid search: query="${query}", includeInternet=${includeInternet}`);

  // STEP 1: Fetch from all sources in parallel (DB + Permanent DB + Internet)
  const [dbTools, permanentTools, internetResults] = await Promise.all([
    fetchDatabaseTools(query),
    fetchPermanentTools(query),
    includeInternet
      ? Promise.all([
          fetchProductHunt(query),
          fetchGitHub(query),
          fetchHuggingFace(query),
          fetchHackerNews(query),
          fetchRSSFeeds(query),
        ])
      : Promise.resolve([]),
  ]);

  const internetTools = includeInternet
    ? internetResults.flat().filter(Boolean)
    : [];

  logger.info(`Fetched: ${dbTools.length} from DB, ${permanentTools.length} from permanent DB, ${internetTools.length} from internet`);

  // STEP 2: Merge datasets (DB first, then permanent DB, then internet — priority order)
  let allTools = mergeTools(dbTools, permanentTools);
  allTools = mergeTools(allTools, internetTools);

  // STEP 3: Deduplicate
  const duplicates = findDuplicates(allTools);
  allTools = allTools.filter((_, i) => !duplicates.has(i));

  // STEP 4: Calculate scores
  allTools = allTools.map(tool => ({
    ...tool,
    final_score: calculateFinalScore(tool),
  }));

  // STEP 5: Sort by score
  allTools.sort((a, b) => b.final_score - a.final_score);

  // STEP 6: Categorize
  const categorized = categorizeTools(allTools);

  // STEP 7: Get top results
  const topResults = allTools.slice(0, limit);

  // Build response
  return {
    query,
    total_results: allTools.length,
    sources: {
      database: dbTools.length,
      permanent_db: permanentTools.length,
      internet: internetTools.length,
      product_hunt: internetTools.filter(t => t.source === 'product_hunt').length,
      github: internetTools.filter(t => t.source === 'github').length,
      huggingface: internetTools.filter(t => t.source === 'huggingface').length,
      hacker_news: internetTools.filter(t => t.source === 'hacker_news').length,
      rss: internetTools.filter(t => t.source === 'rss_feed').length,
    },
    categorized,
    results: topResults.map(t => ({
      name: t.name,
      description: t.description,
      url: t.url,
      category: t.category,
      source: t.source,
      source_detail: t.source_detail,
      logo: t.logo,
      pricing: t.pricing,
      tags: t.tags,
      scores: {
        final: t.final_score,
        popularity: t.popularity_score,
        recency: t.recency_score,
        trust: t.trust_score,
        engagement: t.engagement_score,
      },
      trust_level: t.trust_score >= 80 ? 'High' : t.trust_score >= 60 ? 'Medium' : 'Low',
    })),
  };
}

// ── Discovery Mode: Get all new tools from internet ─────────────────────────────
export async function discoverNewTools(query) {
  const [productHunt, github, huggingface, hn, rss] = await Promise.all([
    fetchProductHunt(query),
    fetchGitHub(query),
    fetchHuggingFace(query),
    fetchHackerNews(query),
    fetchRSSFeeds(query),
  ]);

  const all = [...productHunt, ...github, ...huggingface, ...hn, ...rss];

  const scored = all.map(t => ({ ...t, final_score: calculateFinalScore(t) }))
    .sort((a, b) => b.final_score - a.final_score);

  return {
    query,
    total_found: all.length,
    tools: scored.slice(0, 30).map(t => ({
      name: t.name,
      description: t.description,
      url: t.url,
      category: t.category,
      source: t.source,
      source_detail: t.source_detail,
      logo: t.logo,
      pricing: t.pricing,
      scores: {
        final: t.final_score,
        popularity: t.popularity_score,
        recency: t.recency_score,
        trust: t.trust_score,
      },
    })),
  };
}

export default { hybridSearch, discoverNewTools };