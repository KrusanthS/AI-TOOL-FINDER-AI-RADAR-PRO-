// backend/src/services/searchModeDetector.js
// STEP 17: Search Mode Detector
//
// Distinguishes between two search modes automatically:
//
//   Mode 1: INTENT SEARCH
//     "I need an AI for writing blog posts"
//     "best AI for coding"
//     "what AI tool can help me with video editing"
//     → LLM-first workflow
//
//   Mode 2: DIRECT TOOL SEARCH
//     "ChatGPT"
//     "Claude AI"
//     "midjourney"
//     → Database lookup only
//
// Heuristics used (in order):
//   1. If query matches the static alias registry, it's a direct tool search.
//   2. If query is very short (≤ 25 chars) AND has no intent keywords,
//      AND looks like a proper noun / product name, treat as direct.
//   3. If query contains intent keywords (need, best, ai for, help me, etc.),
//      it's clearly an intent search.
//   4. Otherwise, look up the tool database. If we find an EXACT (or very
//      high-confidence) match, treat as direct. Otherwise, treat as intent.

import { getCanonicalFromAlias } from './toolAliasRegistry.js';
import Tool from '../models/Tool.js';
import logger from '../utils/logger.js';

// Words that strongly signal an intent / use-case search
const INTENT_KEYWORDS = [
  'i need', 'i want', 'i\'m looking', 'im looking',
  'best', 'top', 'recommend', 'suggestion', 'suggest',
  'help me', 'help with', 'assist', 'find me', 'looking for',
  'ai for', 'tool for', 'tools for', 'apps for', 'app for',
  'what is', 'what are', 'which', 'how to', 'how can',
  'compare', 'vs', 'versus', 'alternative', 'alternatives',
  'free', 'cheap', 'affordable', 'premium', 'paid',
  'beginner', 'professional', 'enterprise', 'startup', 'business',
  'that can', 'that will', 'that helps', 'able to',
  'generate', 'create', 'make', 'build', 'design',
  'write', 'edit', 'translate', 'summarize', 'summarise', 'analyze', 'analyse',
  'automate', 'automation',
  'for my', 'for the', 'for a',
  'youtube', 'tiktok', 'instagram', 'blog', 'website', 'app',
  'email', 'social media', 'seo', 'ads', 'marketing', 'sales',
  'productivity', 'workflow', 'team', 'project',
];

// Words that strongly signal a direct tool name (proper-noun style)
const DIRECT_NAME_HINTS = ['ai', 'gpt', 'llm', 'app', 'tool', 'studio', 'labs', 'bot', 'cloud', 'pro', 'plus', 'beta'];

/**
 * Detect whether a query is an intent search or a direct tool search.
 * Returns: { mode: 'intent' | 'direct', reason: string, confidence: 0..1 }
 */
export function detectSearchMode(query) {
  if (!query || typeof query !== 'string' || !query.trim()) {
    return { mode: 'intent', reason: 'empty_query', confidence: 0 };
  }
  const q = query.trim();
  const qLower = q.toLowerCase();
  const qCompact = qLower.replace(/[\s\-_]+/g, '');

  // 1. Static alias registry → direct
  if (getCanonicalFromAlias(q)) {
    return { mode: 'direct', reason: 'alias_registry_match', confidence: 1.0 };
  }

  // 2. Intent keyword detection
  for (const kw of INTENT_KEYWORDS) {
    if (qLower.includes(kw)) {
      return { mode: 'intent', reason: `intent_keyword:${kw}`, confidence: 0.9 };
    }
  }

  // 3. Length / shape heuristics
  const wordCount = q.split(/\s+/).length;
  const isShort = q.length <= 25;
  const isMultiWordShort = wordCount <= 3 && q.length <= 30;

  if (isShort && wordCount <= 2) {
    // 1-2 words, very short → likely a direct tool name
    return { mode: 'direct', reason: 'short_query', confidence: 0.7 };
  }

  if (isMultiWordShort) {
    // 3 words, short → could be either; lean toward direct if any "name hint"
    const hasNameHint = DIRECT_NAME_HINTS.some((h) => qLower.includes(h));
    if (hasNameHint) {
      return { mode: 'direct', reason: 'multiword_with_name_hint', confidence: 0.6 };
    }
  }

  // 4. If the query has a question mark or is long, it's an intent
  if (qLower.includes('?') || q.length > 60) {
    return { mode: 'intent', reason: 'long_or_question', confidence: 0.85 };
  }

  // 5. Ambiguous: default to direct for short queries, intent for longer
  if (q.length <= 20) {
    return { mode: 'direct', reason: 'default_short', confidence: 0.5 };
  }
  return { mode: 'intent', reason: 'default_long', confidence: 0.5 };
}

/**
 * Async version: detect mode AND verify against the database.
 * If we find a high-confidence DB match, upgrade to 'direct' with high confidence.
 */
export async function detectSearchModeAsync(query) {
  const initial = detectSearchMode(query);
  if (initial.mode === 'intent') {
    return initial;
  }

  // For 'direct' candidates, try to verify with a DB lookup
  try {
    const q = query.trim();
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = await Tool.findOne({
      status: 'approved',
      $or: [
        { name: new RegExp(`^${escapeRegex(q)}$`, 'i') },
        { tool_name: new RegExp(`^${escapeRegex(q)}$`, 'i') },
        { aliases: new RegExp(`^${escapeRegex(q)}$`, 'i') },
        { slug: new RegExp(`^${escapeRegex(q)}$`, 'i') },
      ],
    }).lean();
    if (match) {
      return { mode: 'direct', reason: 'db_exact_match', confidence: 0.99, matchedTool: match.name };
    }
  } catch (e) {
    logger.warn(`[SearchModeDetector] DB check failed: ${e.message}`);
  }

  return initial;
}

logger.info('[SearchModeDetector] Search mode detector initialized');

export default { detectSearchMode, detectSearchModeAsync };
