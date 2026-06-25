// backend/src/services/scrapingService.js
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

// ── Allowed external hosts for SSRF protection ─────────────────────────────────
const ALLOWED_HOSTS = new Set([
  'api.producthunt.com',
  'api.github.com',
  'huggingface.co',
  'hacker-news.firebaseio.com',
  'techcrunch.com',
  'venturebeat.com',
  'www.producthunt.com',
]);

export const isAllowedUrl = (urlStr) => {
  try {
    const u = new URL(urlStr);
    if (!['https:', 'http:'].includes(u.protocol)) return false;
    // Block private/loopback ranges
    const host = u.hostname;
    if (/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.)/.test(host)) return false;
    return ALLOWED_HOSTS.has(host);
  } catch {
    return false;
  }
};

// ── ProductHunt ────────────────────────────────────────────────────────────────
export const fetchProductHuntAITools = async (cursor = null) => {
  const phKey = process.env.PRODUCT_HUNT_API_KEY;
  // Simple, safe check for missing or placeholder Product Hunt key
  if (!phKey || typeof phKey !== 'string' || phKey.trim() === '' || phKey === 'your-ph-token') {
    logger.warn('ProductHunt API key missing. Skipping.');
    return null;
  }
  try {
    const query = `query {
      posts(first: 20, topic: "artificial-intelligence"${cursor ? `, after: "${cursor}"` : ''}) {
        edges { node { id name tagline description website thumbnail { url } } }
        pageInfo { hasNextPage endCursor }
      }
    }`;
    const { data } = await axios.post('https://api.producthunt.com/v2/api/graphql', { query }, {
      headers: { Authorization: `Bearer ${process.env.PRODUCT_HUNT_API_KEY}`, Accept: 'application/json' },
      timeout: 8000,
    });
    return data?.data?.posts || null;
  } catch (error) {
    if (error?.response?.status === 401) {
      logger.warn('ProductHunt API unauthorized. Skipping ProductHunt discovery.');
    } else {
      logger.error(`ProductHunt error: ${error.message}`);
    }
    return null;
  }
};

// ── GitHub AI repos ────────────────────────────────────────────────────────────
export const fetchGitHubAITools = async (page = 1) => {
  try {
    const headers = process.env.GITHUB_TOKEN
      ? { Authorization: `token ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' }
      : { Accept: 'application/vnd.github.v3+json' };
    const { data } = await axios.get('https://api.github.com/search/repositories', {
      params: { q: 'topic:ai topic:machine-learning sort:stars', per_page: 20, page },
      headers, timeout: 8000,
    });
    return data.items || [];
  } catch (error) {
    logger.error(`GitHub error: ${error.message}`);
    return [];
  }
};

// ── Gemini autonomous discovery ────────────────────────────────────────────────
export const autonomousAISearch = async (category = 'General') => {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.length < 20) {
    logger.warn('Gemini key not configured. Skipping autonomous search.');
    return [];
  }
  try {
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    });
    const result = await model.generateContent(
      `List 10 real, existing AI tools in the "${category}" category that are actively used in 2024-2025.
Focus on tools that may not be widely known yet.
Return JSON: {"tools":[{"name":"","tagline":"","description":"","website":"https://...","category":"${category}"}]}`
    );
    const parsed = JSON.parse(result.response.text());
    return parsed.tools || [];
  } catch (error) {
    if (error?.status === 429 || (error.message && error.message.toLowerCase().includes('quota'))) {
      logger.warn(`Autonomous AI search skipped due to quota/rate limit: ${String(error.message).split('\n')[0]}`);
    } else {
      logger.error(`Autonomous AI search error: ${error.message}`);
    }
    return [];
  }
};
