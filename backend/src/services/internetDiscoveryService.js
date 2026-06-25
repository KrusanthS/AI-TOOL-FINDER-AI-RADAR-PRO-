// backend/src/services/internetDiscoveryService.js
// Fetches real-time AI tool data from Reddit, GitHub, HuggingFace, OpenRouter

import axios from 'axios';
import logger from '../utils/logger.js';

const TIMEOUT = 6000;
const get = (url, params = {}, headers = {}) =>
  axios.get(url, { params, headers, timeout: TIMEOUT }).then(r => r.data).catch(e => {
    logger.warn(`Discovery fetch failed [${url}]: ${e.message}`);
    return null;
  });

// ── Reddit ─────────────────────────────────────────────────────────────────────
export async function searchReddit(query) {
  const data = await get('https://www.reddit.com/search.json', {
    q: `${query} AI tool`,
    sort: 'relevance',
    limit: 10,
    t: 'month',
  }, { 'User-Agent': 'AIRadarBot/2.0' });

  if (!data?.data?.children) return [];
  return data.data.children.map(c => ({
    source: 'reddit',
    title: c.data.title,
    url: `https://reddit.com${c.data.permalink}`,
    score: c.data.score,
    subreddit: c.data.subreddit,
    snippet: c.data.selftext?.slice(0, 300) || c.data.title,
  }));
}

// ── GitHub ─────────────────────────────────────────────────────────────────────
export async function searchGitHub(query) {
  const headers = process.env.GITHUB_TOKEN
    ? { Authorization: `token ${process.env.GITHUB_TOKEN}` }
    : {};
  const data = await get('https://api.github.com/search/repositories', {
    q: `${query} ai tool`,
    sort: 'stars',
    order: 'desc',
    per_page: 8,
  }, { ...headers, Accept: 'application/vnd.github.v3+json' });

  if (!data?.items) return [];
  return data.items.map(r => ({
    source: 'github',
    name: r.name,
    fullName: r.full_name,
    description: r.description || '',
    stars: r.stargazers_count,
    url: r.html_url,
    homepage: r.homepage || '',
    language: r.language || '',
    topics: r.topics || [],
  }));
}

// ── HuggingFace ────────────────────────────────────────────────────────────────
export async function searchHuggingFace(query) {
  const data = await get('https://huggingface.co/api/models', {
    search: query,
    limit: 8,
    sort: 'downloads',
    direction: -1,
  });

  if (!Array.isArray(data)) return [];
  return data.map(m => ({
    source: 'huggingface',
    name: m.modelId || m.id,
    downloads: m.downloads || 0,
    likes: m.likes || 0,
    tags: m.tags || [],
    url: `https://huggingface.co/${m.modelId || m.id}`,
    pipeline: m.pipeline_tag || '',
  }));
}

// ── OpenRouter models ──────────────────────────────────────────────────────────
export async function getOpenRouterModels() {
  const data = await get('https://openrouter.ai/api/v1/models');
  if (!data?.data) return [];
  return data.data.slice(0, 20).map(m => ({
    source: 'openrouter',
    name: m.name || m.id,
    id: m.id,
    description: m.description || '',
    contextLength: m.context_length || 0,
    pricing: m.pricing || {},
  }));
}

// ── Parallel fetch all sources ─────────────────────────────────────────────────
export async function discoverFromInternet(query) {
  const [reddit, github, hf] = await Promise.all([
    searchReddit(query),
    searchGitHub(query),
    searchHuggingFace(query),
  ]);
  return { reddit: reddit || [], github: github || [], huggingface: hf || [] };
}
