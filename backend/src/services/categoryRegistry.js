// backend/src/services/categoryRegistry.js
// STEP 17: Permanent Tool Categorization — Canonical Category Registry
//
// The 17 canonical browsing categories the platform must always support.
// These are also the URLs the user can browse in the Discover page.
//
// Every tool in the database will be assigned to one or more of these
// canonical categories. The mapping is derived from the tool's existing
// `category` / `categories` / `tags` / `description` fields, then PERSISTED
// to the database in `canonical_categories` so we never recompute on read.

import logger from '../utils/logger.js';

// ── Canonical category list (17 categories from Step 17 spec) ────────────────
export const CANONICAL_CATEGORIES = [
  'Writing',
  'Reading',
  'Coding',
  'Image Generation',
  'Video Generation',
  'Audio',
  'Productivity',
  'Research',
  'Marketing',
  'Design',
  'Finance',
  'Legal',
  'Cybersecurity',
  'Website Builder',
  'Search Engines',
  'Chatbots',
  'LLMs',
];

// ── Aliases & synonym mapping (legacy category → canonical) ──────────────────
// Keys are the EXACT lowercased values found in the `category` field of the DB.
// The normalizeCategoryKey function lowercases + strips leading "ai " prefix,
// so we store BOTH the raw lowercase AND the stripped form where needed.
const LEGACY_TO_CANONICAL = {
  // ── Actual DB category values (UPPERCASE in DB, lowercased here) ──────────

  // Writing
  'writing': ['Writing'],
  'writing & content creation': ['Writing'],
  'ai writing & content creation': ['Writing'],
  'content creation': ['Writing'],
  'blog': ['Writing'],
  'copywriting': ['Writing'],
  'content writing': ['Writing'],
  'translation ai': ['Writing'],

  // Reading
  'reading': ['Reading'],
  'summarizer': ['Reading'],
  'summary': ['Reading'],
  'document ai': ['Reading'],
  'pdf': ['Reading'],

  // Coding
  'coding': ['Coding'],
  'coding & development': ['Coding'],
  'ai coding & development': ['Coding'],
  'programming': ['Coding'],
  'developer tools': ['Coding'],
  'code assistant': ['Coding'],
  'software development': ['Coding'],
  'repository': ['Coding'],

  // Image Generation
  'image': ['Image Generation'],
  'image generation': ['Image Generation'],
  'ai image generation': ['Image Generation'],
  'art': ['Image Generation'],
  'image generator': ['Image Generation'],
  'picture': ['Image Generation'],
  'painting': ['Image Generation'],
  'photo': ['Image Generation'],
  'photography': ['Image Generation'],
  'avatar': ['Image Generation'],

  // Video Generation
  'video': ['Video Generation'],
  'video generation': ['Video Generation'],
  'video generation & editing': ['Video Generation'],
  'ai video generation & editing': ['Video Generation'],
  'video editing': ['Video Generation'],
  'video editor': ['Video Generation'],
  'video creator ai': ['Video Generation'],
  'movie': ['Video Generation'],
  'clip': ['Video Generation'],
  'animation': ['Video Generation'],

  // Audio
  'audio': ['Audio'],
  'music & audio generation': ['Audio'],
  'ai music & audio generation': ['Audio'],
  'music': ['Audio'],
  'sound': ['Audio'],
  'song': ['Audio'],
  'voice': ['Audio'],
  'speech': ['Audio'],
  'podcast': ['Audio'],
  'podcast ai': ['Audio'],
  'transcription': ['Audio'],

  // Productivity
  'productivity': ['Productivity'],
  'productivity & workplace tools': ['Productivity'],
  'ai productivity & workplace tools': ['Productivity'],
  'business & productivity ai': ['Productivity'],
  'workflow': ['Productivity'],
  'automation': ['Productivity'],
  'task management': ['Productivity'],
  'notes': ['Productivity'],
  'meeting': ['Productivity'],
  'presentation': ['Productivity'],
  'presentation ai': ['Productivity'],
  'scheduling': ['Productivity'],
  'for food & restaurant industry': ['Productivity'],
  'food & restaurant industry': ['Productivity'],
  'for fashion & beauty': ['Productivity'],
  'fashion & beauty': ['Productivity'],
  'automotive & transportation': ['Productivity'],
  'for automotive & transportation': ['Productivity'],
  'for sustainability & climate': ['Research'],
  'sustainability & climate': ['Research'],
  'for real estate': ['Productivity'],
  'real estate': ['Productivity'],
  'for gaming': ['Productivity'],
  'gaming': ['Productivity'],
  'ecommerce & retail': ['Marketing'],
  'for ecommerce & retail': ['Marketing'],
  'healthcare & medical': ['Research'],
  'for healthcare & medical': ['Research'],

  // Research
  'research': ['Research'],
  'research & advanced tools': ['Research'],
  'ai research & advanced tools': ['Research'],
  'education & learning': ['Research'],
  'ai education & learning': ['Research'],
  'education': ['Research'],
  'education ai': ['Research'],
  'learning': ['Research'],
  'school': ['Research'],
  'analytics': ['Research'],
  'data': ['Research'],
  'data analytics & business intelligence': ['Research'],
  'ai data analytics & business intelligence': ['Research'],

  // Marketing
  'marketing': ['Marketing'],
  'marketing & seo': ['Marketing'],
  'ai marketing & seo': ['Marketing'],
  'seo': ['Marketing'],
  'ads': ['Marketing'],
  'social media': ['Marketing'],
  'for social media & content creators': ['Marketing'],
  'ai for social media & content creators': ['Marketing'],
  'social': ['Marketing'],
  'advertising': ['Marketing'],
  'email marketing': ['Marketing'],

  // Design
  'design': ['Design'],
  'design & ui/ux': ['Design'],
  'ai design & ui/ux': ['Design'],
  'ux': ['Design'],
  'ui': ['Design'],
  'graphic design': ['Design'],
  'logo': ['Design'],
  'branding': ['Design'],
  'prototype': ['Design'],

  // Finance
  'finance': ['Finance'],
  'finance & fintech': ['Finance'],
  'ai finance & fintech': ['Finance'],
  'money': ['Finance'],
  'stock': ['Finance'],
  'trading': ['Finance'],
  'accounting': ['Finance'],
  'fintech': ['Finance'],
  'crypto': ['Finance'],

  // Legal
  'legal': ['Legal'],
  'legal & compliance': ['Legal'],
  'ai legal & compliance': ['Legal'],
  'law': ['Legal'],
  'attorney': ['Legal'],
  'compliance': ['Legal'],
  'contract': ['Legal'],

  // Cybersecurity
  'cybersecurity': ['Cybersecurity'],
  'ai cybersecurity': ['Cybersecurity'],
  'security': ['Cybersecurity'],
  'hack': ['Cybersecurity'],
  'fraud': ['Cybersecurity'],
  'threat': ['Cybersecurity'],

  // Website Builder
  'website builder': ['Website Builder'],
  'web builder': ['Website Builder'],
  'website': ['Website Builder'],
  'web design': ['Website Builder'],
  'web development': ['Website Builder'],
  'landing page': ['Website Builder'],
  'wix': ['Website Builder'],
  'wordpress': ['Website Builder'],

  // Search Engines
  'search engines': ['Search Engines'],
  'ai search engines': ['Search Engines'],
  'search engine': ['Search Engines'],
  'search': ['Search Engines'],
  'perplexity': ['Search Engines'],
  'you.com': ['Search Engines'],
  'brave search': ['Search Engines'],
  'bing ai': ['Search Engines'],

  // Chatbots
  'chatbots': ['Chatbots'],
  'customer service & chatbots': ['Chatbots'],
  'ai customer service & chatbots': ['Chatbots'],
  'chatbot': ['Chatbots'],
  'customer service': ['Chatbots'],
  'customer support': ['Chatbots'],
  'conversational ai': ['Chatbots'],
  'chat': ['Chatbots'],

  // LLMs
  'llm': ['LLMs'],
  'llms': ['LLMs'],
  'large language models / general ai assistants': ['LLMs'],
  'large language models': ['LLMs'],
  'language model': ['LLMs'],
  'foundation model': ['LLMs'],
  'gpt': ['LLMs'],
  'claude': ['LLMs'],
  'gemini': ['LLMs'],
  'llama': ['LLMs'],
  'mistral': ['LLMs'],
};

// ── Keyword-based fallback (used when legacy mapping fails) ─────────────────
// Each entry: keyword(s) in the tool's name/description/tags → canonical
const KEYWORD_TO_CANONICAL = [
  { keywords: ['code', 'programming', 'developer', 'ide', 'compiler', 'debug', 'refactor', 'syntax'], canonical: 'Coding' },
  { keywords: ['image', 'art', 'drawing', 'painting', 'illustration', 'photo', 'picture', 'avatar', 'logo generator', 'diffusion', 'dall-e', 'midjourney', 'stable diffusion'], canonical: 'Image Generation' },
  { keywords: ['video', 'movie', 'animation', 'clip', 'reel', 'shorts', 'youtube video', 'tiktok'], canonical: 'Video Generation' },
  { keywords: ['audio', 'music', 'song', 'sound', 'voice', 'speech', 'podcast', 'transcrib'], canonical: 'Audio' },
  { keywords: ['write', 'writing', 'blog', 'article', 'essay', 'copywriting', 'grammar', 'paraphrase', 'rewrite'], canonical: 'Writing' },
  { keywords: ['read', 'summariz', 'document', 'pdf', 'book', 'reader', 'extract text'], canonical: 'Reading' },
  { keywords: ['marketing', 'seo', 'ads', 'advertis', 'campaign', 'social media', 'content marketing'], canonical: 'Marketing' },
  { keywords: ['design', 'ui', 'ux', 'wireframe', 'prototype', 'figma', 'sketch', 'branding', 'graphic'], canonical: 'Design' },
  { keywords: ['finance', 'money', 'stock', 'trading', 'invest', 'budget', 'accounting', 'tax', 'crypto', 'fintech'], canonical: 'Finance' },
  { keywords: ['legal', 'law', 'attorney', 'contract', 'compliance', 'regulation', 'patent'], canonical: 'Legal' },
  { keywords: ['security', 'cyber', 'threat', 'vulnerab', 'phishing', 'malware', 'fraud detection', 'penetration'], canonical: 'Cybersecurity' },
  { keywords: ['website', 'web builder', 'landing page', 'wordpress', 'wix', 'squarespace', 'webflow', 'no-code'], canonical: 'Website Builder' },
  { keywords: ['search engine', 'perplexity', 'you.com', 'brave', 'bing ai', 'kagi'], canonical: 'Search Engines' },
  { keywords: ['chatbot', 'chat bot', 'conversational', 'customer service', 'customer support', 'helpdesk'], canonical: 'Chatbots' },
  { keywords: ['productivity', 'workflow', 'task', 'notes', 'todo', 'project management', 'meeting', 'calendar', 'scheduling', 'presentation', 'slide'], canonical: 'Productivity' },
  { keywords: ['research', 'analy', 'data', 'insight', 'study', 'investigate', 'academic', 'paper', 'scholar'], canonical: 'Research' },
  { keywords: ['gpt', 'llm', 'language model', 'claude', 'gemini', 'llama', 'mistral', 'foundation model', 'transformer', 'large language'], canonical: 'LLMs' },
];

/**
 * Build a "haystack" string from a tool for keyword matching.
 * Combines name, description, categories, tags, and primary_use_cases.
 */
function buildHaystack(tool) {
  const parts = [
    tool.name,
    tool.tool_name,
    tool.category,
    tool.shortDescription || tool.short_description,
    tool.description,
    (tool.categories || []).join(' '),
    (tool.tags || []).join(' '),
    (tool.semantic_keywords || []).join(' '),
    (tool.primary_use_cases || []).join(' '),
    (tool.use_cases || []).join(' '),
    (tool.capabilities || []).join(' '),
    (tool.features || []).join(' '),
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
}

/**
 * Normalize a category string for matching against the legacy map.
 * - lowercases
 * - trims whitespace
 * (We do NOT strip 'ai ' prefix here — we store BOTH forms in the map)
 */
function normalizeCategoryKey(cat) {
  if (!cat) return '';
  return String(cat).toLowerCase().trim();
}

/**
 * Determine the canonical categories for a tool.
 * Returns a deduplicated, ordered array of canonical category strings.
 */
export function determineCanonicalCategories(tool) {
  const found = new Set();

  // 1) Map from existing category field (highest priority)
  const catKey = normalizeCategoryKey(tool.category);
  if (catKey && LEGACY_TO_CANONICAL[catKey]) {
    for (const c of LEGACY_TO_CANONICAL[catKey]) found.add(c);
  }

  // 2) Map from categories array
  if (Array.isArray(tool.categories)) {
    for (const c of tool.categories) {
      const key = normalizeCategoryKey(c);
      if (key && LEGACY_TO_CANONICAL[key]) {
        for (const cc of LEGACY_TO_CANONICAL[key]) found.add(cc);
      }
    }
  }

  // 3) Keyword-based fallback
  const haystack = buildHaystack(tool);
  for (const { keywords, canonical } of KEYWORD_TO_CANONICAL) {
    for (const kw of keywords) {
      if (haystack.includes(kw.toLowerCase())) {
        found.add(canonical);
        break;
      }
    }
  }

  // 4) If still nothing, assign a sensible default
  if (found.size === 0) {
    found.add('Productivity');
  }

  // Return in the canonical order for consistency
  return CANONICAL_CATEGORIES.filter((c) => found.has(c));
}

/**
 * Get the legacy → canonical mapping (exported for testing / inspection).
 */
export function getLegacyMapping() {
  return LEGACY_TO_CANONICAL;
}

logger.info(`[CategoryRegistry] Loaded ${CANONICAL_CATEGORIES.length} canonical categories`);

export default {
  CANONICAL_CATEGORIES,
  determineCanonicalCategories,
  getLegacyMapping,
};
