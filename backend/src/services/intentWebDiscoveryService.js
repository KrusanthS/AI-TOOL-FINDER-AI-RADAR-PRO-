// backend/src/services/intentWebDiscoveryService.js
// INTENT-DRIVEN WEB DISCOVERY
// Only executes when the database doesn't have enough good matches.
// Uses user intent to drive discovery (NOT keyword scraping).

import axios from 'axios';
import logger from '../utils/logger.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT = 10000;

let genAI = null;
let groq = null;
const getGenAI = () => { if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); return genAI; };
const getGroq  = () => { if (!groq)  groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });        return groq; };

async function llmJSON(prompt, temperature = 0.2) {
  if (process.env.GEMINI_API_KEY?.length > 20) {
    try {
      const model = getGenAI().getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: 'application/json', temperature },
      });
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (e) {
      if (e.status !== 429) logger.warn(`Gemini error: ${e.message}`);
    }
  }
  if (process.env.GROQ_API_KEY?.length > 10) {
    try {
      const client = getGroq();
      const completion = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: 'You are an AI tool expert. Return only valid JSON.' },
                   { role: 'user', content: prompt }],
        temperature,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      logger.warn(`Groq error: ${e.message}`);
    }
  }
  throw new Error('All LLM providers failed');
}

// SSRF allowlist
const ALLOWED_HOSTS = new Set([
  'api.github.com',
  'huggingface.co',
  'hacker-news.firebaseio.com',
  'www.producthunt.com',
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

async function safeFetch(url, options = {}) {
  if (!isAllowedUrl(url)) {
    logger.warn(`Discovery fetch blocked (SSRF): ${url}`);
    return null;
  }
  try {
    const res = await axios.get(url, { timeout: TIMEOUT, ...options });
    return res.data;
  } catch (e) {
    logger.warn(`Discovery fetch failed [${url}]: ${e.message}`);
    return null;
  }
}

/**
 * Discover tools online based on the user's intent.
 * The LLM determines what to search for (NOT the raw user query).
 */
export async function discoverToolsForIntent(understanding, capabilityMap, options = {}) {
  const { maxResults = 10 } = options;

  logger.info(`Discovering tools for intent: ${understanding.intent}`);

  // Step 1: Ask the LLM to generate search terms for the discovery sources
  const searchTerms = await generateSearchTerms(understanding, capabilityMap);

  // Step 2: Run all discovery sources in parallel
  const [githubResults, huggingfaceResults, productHuntResults, llmSuggested] = await Promise.all([
    searchGitHub(searchTerms, capabilityMap, maxResults),
    searchHuggingFace(searchTerms, maxResults),
    searchProductHunt(searchTerms, maxResults),
    llmSuggestTools(understanding, capabilityMap, maxResults),
  ]);

  // Step 3: Merge and dedupe
  const all = [...githubResults, ...huggingfaceResults, ...productHuntResults, ...llmSuggested];
  const seen = new Set();
  const unique = [];
  for (const tool of all) {
    const key = String(tool.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(tool);
  }

  return unique.slice(0, maxResults);
}

async function generateSearchTerms(understanding, capabilityMap) {
  const prompt = `You are an AI tool search strategist.

User wants: ${JSON.stringify({
  intent: understanding.intent,
  use_case: understanding.use_case,
  required_capabilities: understanding.required_capabilities,
  preferred_capabilities: understanding.preferred_capabilities,
})}

Generate 3-5 optimized search queries to find AI tools matching this need on:
- GitHub
- Hugging Face
- Product Hunt
- General web knowledge

Return JSON:
{
  "github_query": "optimized query for GitHub code search",
  "huggingface_query": "optimized query for model search",
  "producthunt_query": "optimized query for product search",
  "semantic_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"]
}`;

  try {
    return await llmJSON(prompt, 0.1);
  } catch (e) {
    return {
      github_query: `${understanding.intent} AI`,
      huggingface_query: understanding.intent,
      producthunt_query: `${understanding.use_case} AI tool`,
      semantic_keywords: understanding.keywords || [],
    };
  }
}

async function searchGitHub(searchTerms, capabilityMap, maxResults) {
  if (!searchTerms.github_query) return [];

  const data = await safeFetch('https://api.github.com/search/repositories', {
    params: { q: searchTerms.github_query, sort: 'stars', order: 'desc', per_page: maxResults },
    headers: { Accept: 'application/vnd.github.v3+json' },
  });

  if (!data?.items) return [];
  return data.items.map(r => ({
    name: r.name,
    description: r.description || r.full_name,
    shortDescription: r.description || '',
    url: r.html_url,
    website: r.homepage || r.html_url,
    category: mapCategoryByTopics([r.language, ...(r.topics || [])]),
    capabilities: r.topics || [],
    tags: r.topics || [],
    pricing: r.license?.spdx_id ? { model: 'free' } : { model: 'unknown' },
    source: 'github',
    source_detail: 'open_source',
    trust: 80,
    popularity: r.stargazers_count,
  }));
}

async function searchHuggingFace(searchTerms, maxResults) {
  if (!searchTerms.huggingface_query) return [];
  const data = await safeFetch('https://huggingface.co/api/models', {
    params: { search: searchTerms.huggingface_query, limit: maxResults, sort: 'downloads', direction: -1 },
  });
  if (!Array.isArray(data)) return [];

  return data.map(m => ({
    name: m.modelId || m.id,
    description: m.pipeline_tag || 'AI model',
    shortDescription: m.pipeline_tag || '',
    url: `https://huggingface.co/${m.modelId || m.id}`,
    website: `https://huggingface.co/${m.modelId || m.id}`,
    category: 'AI Model',
    capabilities: m.tags || [],
    tags: m.tags || [],
    pricing: { model: 'free' },
    source: 'huggingface',
    source_detail: 'model',
    trust: 75,
    popularity: m.downloads || 0,
  }));
}

async function searchProductHunt(searchTerms, maxResults) {
  try {
    const response = await axios.get('https://www.producthunt.com/feed', {
      headers: { 'User-Agent': 'AIRadarBot/2.0' },
      timeout: TIMEOUT,
    });
    const xml = response.data;
    if (!xml) return [];
    const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];

    const query = (searchTerms.producthunt_query || '').toLowerCase();
    const kws = (searchTerms.semantic_keywords || []).map(k => k.toLowerCase());

    const items = entries.slice(0, maxResults * 3).map(entry => {
      const title = (entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '').trim();
      const link = (entry.match(/<link rel="alternate" type="text\/html" href="([^"]+)"/)?.[1] || '');
      const content = (entry.match(/<content[\s\S]*?>([\s\S]*?)<\/content>/)?.[1] || '').trim();
      const description = content.replace(/<[^>]*>/g, '').replace(/</g, '<').replace(/>/g, '>').replace(/&/g, '&').trim();
      return { title, link, description };
    });

    const matched = items.filter(item => {
      const t = item.title.toLowerCase();
      const d = item.description.toLowerCase();
      if (query && (t.includes(query) || d.includes(query))) return true;
      return kws.some(k => t.includes(k) || d.includes(k));
    });

    return matched.slice(0, maxResults).map(item => ({
      name: item.title,
      description: item.description?.slice(0, 300) || '',
      shortDescription: item.description?.slice(0, 200) || '',
      url: item.link,
      website: item.link,
      category: 'AI Tool',
      source: 'product_hunt',
      source_detail: 'trending',
      trust: 70,
      pricing: { model: 'unknown' },
      tags: ['AI', 'Product Hunt'],
    }));
  } catch (e) {
    logger.warn(`Product Hunt discovery failed: ${e.message}`);
    return [];
  }
}

/**
 * Ask the LLM to suggest specific real AI tools for the user's intent.
 * This is the most reliable discovery source for well-known tools.
 */
async function llmSuggestTools(understanding, capabilityMap, maxResults) {
  const prompt = `You are a world-class AI tool expert and consultant with encyclopedic knowledge of every AI tool on the market as of 2025.

User needs:
- Intent: ${understanding.intent}
- Use case: ${understanding.use_case}
- Goal: ${understanding.goal}
- Required capabilities: ${(understanding.required_capabilities || []).join(', ')}
- Budget: ${understanding.budget_preference}

Your job: Recommend the TOP ${maxResults} most famous, highly-rated, and widely-trusted AI tools that DIRECTLY match this user's need.

CRITICAL RULES:
1. ONLY recommend tools that are genuinely famous, top-rated, and trusted worldwide (e.g. ChatGPT, Midjourney, GitHub Copilot, Runway, ElevenLabs, etc.)
2. ONLY tools that DIRECTLY solve the user's stated need — zero off-topic tools
3. Rank them: best match first
4. Every tool MUST actually exist and be publicly accessible in 2025
5. Use EXACT official website URLs — no placeholders
6. Do NOT invent, hallucinate or approximate tools
7. If the user wants a writing tool, give ONLY writing tools. If video, give ONLY video tools. No mixing.
8. Prefer tools with: large user base, positive reviews, active development, free or freemium tier if budget is free_preferred

Return ONLY this JSON (no markdown):
{
  "tools": [
    {
      "name": "Exact official tool name",
      "website": "https://exact-official-url.com",
      "description": "2-3 sentence description focusing on what makes it best for this user's specific need",
      "category": "Writing|Image|Video|Audio|Coding|Marketing|Productivity|Research|Data|Design|Chat|Other",
      "pricing": "free|freemium|paid|enterprise",
      "key_capabilities": ["specific capability 1", "specific capability 2", "specific capability 3"],
      "best_for": "specific scenario matching the user's stated goal",
      "why_top_rated": "1 sentence on why this is considered a top/famous tool",
      "trust_level": "high|very_high"
    }
  ]
}`;

  try {
    const result = await llmJSON(prompt, 0.2);
    return (result.tools || []).map(t => ({
      name: t.name,
      description: t.description,
      shortDescription: t.description?.slice(0, 200),
      url: t.website,
      website: t.website,
      category: t.category || 'Other',
      capabilities: t.key_capabilities || [],
      tags: t.key_capabilities || [],
      pricing: { model: t.pricing || 'unknown' },
      best_for: t.best_for,
      why_top_rated: t.why_top_rated || '',
      trust: t.trust_level === 'very_high' ? 92 : 80,
      source: 'llm_suggested',
      source_detail: 'expert_knowledge',
    }));
  } catch (e) {
    logger.warn(`LLM tool suggestion failed: ${e.message}`);
    return [];
  }
}

function mapCategoryByTopics(tags) {
  const tagStr = (tags || []).join(' ').toLowerCase();
  if (tagStr.match(/image|vision|stable|midjourney|dalle/)) return 'Image Generation';
  if (tagStr.match(/code|programming|developer|software/)) return 'Coding';
  if (tagStr.match(/chat|llm|language model|gpt|claude/)) return 'Chat AI';
  if (tagStr.match(/video|animation/)) return 'Video AI';
  if (tagStr.match(/audio|speech|tts|voice/)) return 'Audio AI';
  if (tagStr.match(/research|paper/)) return 'Research';
  if (tagStr.match(/automation|workflow|agent/)) return 'Automation';
  if (tagStr.match(/writing|content|copywriting/)) return 'Writing';
  if (tagStr.match(/marketing|seo|ads/)) return 'Marketing';
  return 'General';
}

export default { discoverToolsForIntent };
