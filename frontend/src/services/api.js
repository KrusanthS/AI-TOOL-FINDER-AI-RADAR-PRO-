// frontend/src/services/api.js
import axios from 'axios';
import { auth } from '../lib/firebase';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (import.meta.env.PROD) return '/api';
  return 'http://localhost:3001/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Search for AI tools with live data fetching
 * First checks database, then fetches from Gemini API if not found
 * @param {string} toolName - Name of the AI tool to search for
 * @param {object} options - Search options
 * @param {boolean} options.forceRefresh - Force refresh from API instead of cache
 * @returns {Promise<{success: boolean, tool?: object, error?: string, source?: string}>}
 */
export const searchLiveAiTool = async (toolName, options = {}) => {
  try {
    const response = await api.post('/ai-tool-search/search', {
      toolName,
      forceRefresh: options.forceRefresh || false,
    });
    return response.data;
  } catch (error) {
    console.error('Live AI tool search failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Failed to fetch tool information',
    };
  }
};

/**
 * Batch search for multiple AI tools
 * @param {string[]} toolNames - Array of tool names to search for
 * @param {object} options - Search options
 * @returns {Promise<{success: boolean, results: Array, total: number, found: number, notFound: number}>}
 */
export const batchSearchAiTools = async (toolNames, options = {}) => {
  try {
    const response = await api.post('/ai-tool-search/batch', {
      toolNames,
      forceRefresh: options.forceRefresh || false,
    });
    return response.data;
  } catch (error) {
    console.error('Batch AI tool search failed:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Batch search failed',
      results: [],
      total: 0,
      found: 0,
      notFound: toolNames.length,
    };
  }
};

export const searchGithubRepos = async (query) => {
  try {
    const response = await api.get('/github-repos', {
      params: { search: query, limit: 20, page: 1 },
    });
    return response.data;
  } catch (error) {
    console.error('GitHub repo search failed:', error);
    return {
      repos: [],
      total: 0,
      error: error.response?.data?.message || 'Failed to search GitHub repositories',
    };
  }
};

/**
 * LLM-FIRST AI CONSULTANT
 * Runs the full pipeline: LLM understands the query → capability mapping →
 * database search → web discovery (if needed) → validated recommendations.
 *
 * @param {string} query - User's natural-language request
 * @param {object} options - { limit, budget, skipCache }
 * @returns {Promise<{ user_intent, recommended_tools, reasoning, confidence, source, ... }>}
 */
export const consultantRecommend = async (query, options = {}) => {
  try {
    const response = await api.post('/consultant/recommend', {
      query,
      limit: options.limit || 8,
      budget: options.budget || null,
      skipCache: options.skipCache || false,
    });
    return response.data;
  } catch (error) {
    console.error('Consultant recommend failed:', error);
    return {
      user_intent: null,
      recommended_tools: [],
      reasoning: error.response?.data?.error || 'The AI consultant is currently unavailable. Please try again.',
      confidence: 0,
      source: 'error',
      error: true,
    };
  }
};

/**
 * LLM-FIRST REQUIREMENT UNDERSTANDING
 * Run only step 1 of the pipeline to preview how the LLM interprets the query.
 */
export const consultantUnderstand = async (query) => {
  try {
    const response = await api.post('/consultant/understand', { query });
    return response.data;
  } catch (error) {
    console.error('Consultant understand failed:', error);
    return { understanding: null, error: true };
  }
};

/**
 * Fetch canonical categories with tool counts.
 * Returns [{ name, count, icon, description, slug }]
 */
export const getCanonicalCategories = async () => {
  try {
    const response = await api.get('/tools/categories');
    return response.data;
  } catch (error) {
    console.error('getCanonicalCategories failed:', error);
    return { categories: [], total_tools: 0 };
  }
};

/**
 * Fetch all tools in a canonical category from the DB (no LLM).
 * @param {string} category - e.g. "Writing", "Coding"
 * @param {object} options - { page, limit, pricing, sort }
 */
export const getToolsByCategory = async (category, options = {}) => {
  try {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page);
    if (options.limit) params.set('limit', options.limit);
    if (options.pricing && options.pricing !== 'All') params.set('pricing', options.pricing.toLowerCase());
    if (options.sort) params.set('sort', options.sort);
    const response = await api.get(`/tools/by-category/${encodeURIComponent(category)}?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('getToolsByCategory failed:', error);
    return { tools: [], total: 0, pages: 0, currentPage: 1 };
  }
};

/**
 * Direct tool name search — exact/fuzzy match, no LLM.
 * @param {string} toolName - e.g. "ChatGPT", "chatgbt", "GPT"
 */
export const directToolSearch = async (toolName) => {
  try {
    const response = await api.get(`/tools/search/direct?q=${encodeURIComponent(toolName)}`);
    return response.data;
  } catch (error) {
    console.error('directToolSearch failed:', error);
    return { type: 'not_found', tool: null, related: [], suggestions: [], message: 'Search failed.' };
  }
};

/**
 * Smart search — auto-detects intent vs direct tool name.
 * Returns { search_mode: 'direct' | 'intent', ...result }
 */
export const smartSearch = async (query) => {
  try {
    const response = await api.get(`/tools/search/smart?q=${encodeURIComponent(query)}`);
    return response.data;
  } catch (error) {
    console.error('smartSearch failed:', error);
    return { search_mode: 'intent', query };
  }
};

/**
 * Fetch related GitHub repos for a tool from GitHub API (live).
 * @param {string} toolName
 * @param {string} category
 */
export const getReposForTool = async (toolName, category) => {
  try {
    const params = new URLSearchParams();
    if (toolName) params.set('toolName', toolName);
    if (category) params.set('category', category);
    const response = await api.get(`/github-repos/for-tool?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('getReposForTool failed:', error);
    return { repos: [], total: 0 };
  }
};

// ── Permanent Tool Admin API Helpers ─────────────────────────────────────────
// These helpers call the new /api/admin/permanent-tools endpoints.
// They require the current user to have admin privileges.

/**
 * Fetch all permanent tools with optional filtering and pagination.
 * @param {object} options - { page, limit, category, search }
 */
export const getPermanentTools = async (options = {}) => {
  try {
    const params = new URLSearchParams();
    if (options.page) params.set('page', options.page);
    if (options.limit) params.set('limit', options.limit);
    if (options.category) params.set('category', options.category);
    if (options.search) params.set('search', options.search);
    const response = await api.get(`/admin/permanent-tools?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('getPermanentTools failed:', error);
    return { success: false, tools: [], total: 0, error: error.response?.data?.error || 'Failed to fetch permanent tools' };
  }
};

/**
 * Create (or upsert) a new permanent tool.
 * @param {object} toolData - Tool fields matching PermanentTool schema
 */
export const createPermanentTool = async (toolData) => {
  try {
    const response = await api.post('/admin/permanent-tools', toolData);
    return response.data;
  } catch (error) {
    console.error('createPermanentTool failed:', error);
    return { success: false, error: error.response?.data?.error || 'Failed to create tool' };
  }
};

/**
 * Update an existing permanent tool by ID.
 * @param {string} id - MongoDB _id of the tool
 * @param {object} toolData - Fields to update
 */
export const updatePermanentTool = async (id, toolData) => {
  try {
    const response = await api.put(`/admin/permanent-tools/${id}`, toolData);
    return response.data;
  } catch (error) {
    console.error('updatePermanentTool failed:', error);
    return { success: false, error: error.response?.data?.error || 'Failed to update tool' };
  }
};

/**
 * Delete a permanent tool by ID.
 * @param {string} id - MongoDB _id of the tool
 */
export const deletePermanentTool = async (id) => {
  try {
    const response = await api.delete(`/admin/permanent-tools/${id}`);
    return response.data;
  } catch (error) {
    console.error('deletePermanentTool failed:', error);
    return { success: false, error: error.response?.data?.error || 'Failed to delete tool' };
  }
};

/**
 * Trigger the idempotent seed of 40 pre-defined popular AI tools.
 * Safe to call multiple times — will not create duplicates.
 */
export const seedPermanentTools = async () => {
  try {
    const response = await api.post('/admin/permanent-tools/seed');
    return response.data;
  } catch (error) {
    console.error('seedPermanentTools failed:', error);
    return { success: false, error: error.response?.data?.error || 'Seed failed' };
  }
};

export default api;
