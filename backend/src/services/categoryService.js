// backend/src/services/categoryService.js
// STEP 17: Category Service
//
// Reads from the persisted `canonical_categories` field on every tool
// to power category browsing — no LLM, no real-time computation.
//
// Functions:
//   - getCanonicalCategoriesWithCounts() → [{ name, count, icon, description }]
//   - getToolsByCategory(canonicalName)   → paginated tool list
//   - getAllCategoriesSummary()           → full DB category distribution
//   - bulkAssignCanonicalCategories()     → migrate existing tools to canonical categories

import Tool from '../models/Tool.js';
import { CANONICAL_CATEGORIES, determineCanonicalCategories, getLegacyMapping } from './categoryRegistry.js';
import logger from '../utils/logger.js';

// Resolved once at module load — used in getToolsByCategory fallback
const LEGACY_TO_CANONICAL = getLegacyMapping();

// Per-category metadata (icon, description) — used by the frontend
const CATEGORY_META = {
  'Writing': { icon: '✍️', description: 'AI tools for content writing, copywriting, and editing.' },
  'Reading': { icon: '📖', description: 'AI tools for summarizing documents, PDFs, and long-form text.' },
  'Coding': { icon: '💻', description: 'AI coding assistants, IDE plugins, and developer tools.' },
  'Image Generation': { icon: '🎨', description: 'AI image generators, art tools, and photo editors.' },
  'Video Generation': { icon: '🎬', description: 'AI video generators, editors, and animation tools.' },
  'Audio': { icon: '🎵', description: 'AI music generators, voice synthesis, and audio editing tools.' },
  'Productivity': { icon: '⚡', description: 'AI tools for task management, notes, and workflow automation.' },
  'Research': { icon: '🔬', description: 'AI tools for academic research, data analysis, and insights.' },
  'Marketing': { icon: '📈', description: 'AI tools for SEO, advertising, social media, and campaigns.' },
  'Design': { icon: '🖌️', description: 'AI tools for UI/UX, graphic design, and prototyping.' },
  'Finance': { icon: '💰', description: 'AI tools for investing, trading, accounting, and fintech.' },
  'Legal': { icon: '⚖️', description: 'AI tools for legal research, contracts, and compliance.' },
  'Cybersecurity': { icon: '🛡️', description: 'AI tools for threat detection, fraud, and security.' },
  'Website Builder': { icon: '🌐', description: 'AI website builders and no-code web design tools.' },
  'Search Engines': { icon: '🔎', description: 'AI-powered search engines and answer engines.' },
  'Chatbots': { icon: '💬', description: 'AI chatbots, conversational AI, and customer support tools.' },
  'LLMs': { icon: '🧠', description: 'Large language models, foundation models, and AI assistants.' },
};

/**
 * Get all canonical categories with their tool counts.
 * Counts from persisted canonical_categories field, with legacy-field fallback.
 */
export async function getCanonicalCategoriesWithCounts() {
  const total_tools = await Tool.countDocuments({ status: 'approved' });

  // Try canonical_categories aggregation first
  const canonicalCounts = await Tool.aggregate([
    { $match: { status: 'approved', canonical_categories: { $exists: true, $ne: [] } } },
    { $unwind: { path: '$canonical_categories', preserveNullAndEmptyArrays: false } },
    { $group: { _id: '$canonical_categories', count: { $sum: 1 } } },
  ]);

  const countMap = new Map(canonicalCounts.map((c) => [c._id, c.count]));

  // If canonical_categories are not yet populated, fall back to legacy category counts
  const migratedCount = canonicalCounts.reduce((sum, c) => sum + c.count, 0);
  if (migratedCount === 0) {
    // Count via legacy category field using the LEGACY_TO_CANONICAL map
    const legacyCounts = await Tool.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: { $toLower: '$category' }, count: { $sum: 1 } } },
    ]);
    const legacyMap = LEGACY_TO_CANONICAL;
    for (const { _id: catLower, count } of legacyCounts) {
      if (!catLower) continue;
      const canonicals = legacyMap[catLower.trim()];
      if (canonicals) {
        for (const c of canonicals) countMap.set(c, (countMap.get(c) || 0) + count);
      }
    }
  }

  const categories = CANONICAL_CATEGORIES.map((name) => ({
    name,
    count: countMap.get(name) || 0,
    icon: CATEGORY_META[name]?.icon || '🔧',
    description: CATEGORY_META[name]?.description || '',
    slug: name.toLowerCase().replace(/\s+/g, '-'),
  }));

  return { categories, total_tools, canonical_count: categories.length };
}

/**
 * Get all tools in a specific canonical category.
 * Uses the persisted canonical_categories field for fast lookup.
 *
 * @param {string} canonicalName - canonical category name (e.g. "Writing", "Coding")
 * @param {object} options - { page, limit, pricing, sort }
 */
export async function getToolsByCategory(canonicalName, options = {}) {
  const {
    page = 1,
    limit = 20,
    pricing,
    sort = 'newest',
  } = options;

  // Find the canonical category (case-insensitive)
  const canonicalCategory = CANONICAL_CATEGORIES.find(
    (c) => c.toLowerCase() === String(canonicalName || '').toLowerCase(),
  );

  if (!canonicalCategory) {
    // Try to find a fuzzy match
    const fuzzyMatch = CANONICAL_CATEGORIES.find(
      (c) => c.toLowerCase().includes(String(canonicalName || '').toLowerCase()) ||
             String(canonicalName || '').toLowerCase().includes(c.toLowerCase()),
    );
    if (!fuzzyMatch) {
      return {
        canonical_category: canonicalName,
        matched_categories: [],
        tools: [],
        total: 0,
        pages: 0,
        currentPage: 1,
      };
    }
    return getToolsByCategory(fuzzyMatch, options);
  }

  // Build the MongoDB query — search canonical_categories first, fall back to legacy category field
  // This ensures tools show up even before the migration script has run.
  const legacyMatches = Object.entries(LEGACY_TO_CANONICAL)
    .filter(([, v]) => v.includes(canonicalCategory))
    .map(([k]) => k);

  const baseFilter = {
    status: 'approved',
    $or: [
      { canonical_categories: canonicalCategory },
      // Regex fallback against the legacy category field (case-insensitive)
      ...legacyMatches.map((k) => ({ category: new RegExp(`^${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })),
    ],
  };

  const query = pricing
    ? { ...baseFilter, $and: [{ $or: baseFilter.$or }, { $or: [{ 'pricing.model': pricing }, { pricing_type: pricing }] }] }
    : baseFilter;

  // When pricing is added we need to restructure to avoid $or conflict
  const finalQuery = pricing
    ? {
        status: 'approved',
        $and: [
          { $or: baseFilter.$or },
          { $or: [{ 'pricing.model': pricing }, { pricing_type: pricing }] },
        ],
      }
    : baseFilter;

  // Build sort
  let sortObj = { created_at: -1 };
  if (sort === 'trending') sortObj = { 'stats.weeklyViews': -1, 'stats.views': -1 };
  else if (sort === 'rating') sortObj = { 'stats.rating': -1, 'stats.ratingCount': -1 };
  else if (sort === 'popular') sortObj = { popularity_score: -1 };
  else if (sort === 'name') sortObj = { name: 1 };

  const skip = (page - 1) * limit;
  const [tools, total] = await Promise.all([
    Tool.find(finalQuery)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
      .select('-vector_embedding -aiMeta.embedding')
      .lean(),
    Tool.countDocuments(finalQuery),
  ]);

  return {
    canonical_category: canonicalCategory,
    matched_categories: [canonicalCategory],
    tools,
    total,
    pages: Math.ceil(total / limit),
    currentPage: page,
  };
}

/**
 * Get a summary of ALL categories (canonical + legacy) in the database.
 * Includes counts of tools per category, plus a "canonical coverage" stat.
 */
export async function getAllCategoriesSummary() {
  const all = await Tool.aggregate([
    { $match: { status: 'approved' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Also count tools with canonical_categories populated
  const withCanonical = await Tool.countDocuments({
    status: 'approved',
    canonical_categories: { $exists: true, $ne: [] },
  });
  const total = await Tool.countDocuments({ status: 'approved' });

  return {
    categories: all,
    canonical_coverage: {
      tools_with_canonical: withCanonical,
      total_tools: total,
      coverage_pct: total ? Math.round((withCanonical / total) * 100) : 0,
    },
  };
}

/**
 * BULK MIGRATION: Assign canonical categories to every tool in the DB.
 * Run this ONCE during the initial migration. Then canonical_categories
 * is updated automatically by the pre-save hook for new/edited tools.
 *
 * This function is idempotent: running it multiple times is safe.
 */
export async function bulkAssignCanonicalCategories(options = {}) {
  const { batchSize = 100, onlyMissing = true, dryRun = false } = options;

  const query = onlyMissing
    ? { $or: [{ canonical_categories: { $exists: false } }, { canonical_categories: { $size: 0 } }] }
    : {};

  const total = await Tool.countDocuments(query);
  logger.info(`[CategoryService] Bulk assigning canonical categories to ${total} tools (dryRun=${dryRun})`);

  let updated = 0;
  let lastId = null;
  let cursor = Tool.find(query)
    .sort({ _id: 1 })
    .cursor({ batchSize });

  const batch = [];
  for await (const tool of cursor) {
    const canonical = determineCanonicalCategories(tool);
    batch.push({ _id: tool._id, canonical_categories: canonical });
    if (batch.length >= batchSize) {
      if (!dryRun) {
        await Promise.all(
          batch.map((b) =>
            Tool.updateOne({ _id: b._id }, { $set: { canonical_categories: b.canonical_categories } }),
          ),
        );
      }
      updated += batch.length;
      batch.length = 0;
      logger.info(`[CategoryService] Updated ${updated}/${total} tools`);
    }
  }

  if (batch.length && !dryRun) {
    await Promise.all(
      batch.map((b) =>
        Tool.updateOne({ _id: b._id }, { $set: { canonical_categories: b.canonical_categories } }),
      ),
    );
    updated += batch.length;
  }

  logger.info(`[CategoryService] Done. Updated ${updated} tools.`);
  return { total, updated, dryRun };
}

/**
 * Get the list of well-known tools from the alias registry, formatted
 * for use as search suggestions on the frontend.
 */
export function getFeaturedTools() {
  // Import lazily to avoid circular deps
  // eslint-disable-next-line global-require
  return [
    'ChatGPT', 'Claude', 'Gemini', 'Perplexity', 'Midjourney',
    'GitHub Copilot', 'Jasper', 'Notion AI', 'CapCut', 'Cursor',
    'Runway', 'ElevenLabs', 'Suno', 'Synthesia', 'HeyGen',
    'Leonardo AI', 'Character.AI', 'Mistral AI', 'Meta Llama',
    'Grok', 'Cohere', 'Hugging Face', 'Replit', 'Codeium',
  ];
}

logger.info(`[CategoryService] Initialized with ${CANONICAL_CATEGORIES.length} canonical categories`);

export default {
  CANONICAL_CATEGORIES,
  getCanonicalCategoriesWithCounts,
  getToolsByCategory,
  getAllCategoriesSummary,
  bulkAssignCanonicalCategories,
  getFeaturedTools,
};
