// backend/seed.js
// Seeds the database with the full AI tools directory from ai_tools_directory (1).json
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import Tool from './src/models/Tool.js';
import logger from './src/utils/logger.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Category normalizer ────────────────────────────────────────────────────
const CATEGORY_MAP = {
  'large language models (llms)': 'Chat',
  'vector databases': 'Data',
  'rag / ai frameworks': 'Coding',
  'ai observability / monitoring': 'Productivity',
  'coding & developer ai': 'Coding',
  'audio & music ai': 'Audio',
  'image & design ai': 'Image',
  'video ai': 'Video',
  'ai chatbots': 'Chat',
  'ai search / knowledge engines': 'Research',
  'ai marketplace / directory': 'Productivity',
  'ai agent frameworks': 'Coding',
  'ai agents & automation': 'Productivity',
  'ai models & apis': 'Coding',
  'ai devops & cloud ai': 'Coding',
  'writing & content ai': 'Writing',
  'ai inference / deployment': 'Coding',
  'website builder ai': 'Design',
  'mobile app builder ai': 'Coding',
  'ai api gateway / backend infra': 'Coding',
  'ai data science & ml tools': 'Data',
};

function normalizeCategory(raw) {
  if (!raw) return 'Other';
  const key = raw.toLowerCase().trim();
  return CATEGORY_MAP[key] || raw.split('/')[0].trim() || 'Other';
}

// ─── Pricing normalizer ─────────────────────────────────────────────────────
function normalizePricing(tool) {
  const raw = (tool.pricing_model || '').toLowerCase();
  const isFree = tool.free_version_available === true;

  let model = 'unknown';
  if (raw.includes('open-source') || raw.includes('free and open') || raw.includes('completely free')) {
    model = 'free';
  } else if (isFree && (raw.includes('paid') || raw.includes('pro') || raw.includes('enterprise'))) {
    model = 'freemium';
  } else if (isFree) {
    model = 'freemium';
  } else if (raw.includes('enterprise')) {
    model = 'enterprise';
  } else if (raw.includes('pay-per') || raw.includes('usage-based') || raw.includes('$')) {
    model = 'paid';
  }

  return {
    model,
    details: tool.pricing_model || '',
  };
}

// ─── Tags extractor ─────────────────────────────────────────────────────────
function extractTags(tool) {
  const tags = new Set();
  const category = (tool.category || '').toLowerCase();
  const subCategory = (tool.sub_category || '').toLowerCase();

  // From category/sub_category
  category.split(/[\s/&,]+/).filter(w => w.length > 2).forEach(w => tags.add(w));
  subCategory.split(/[\s/&,]+/).filter(w => w.length > 2).forEach(w => tags.add(w));

  // From integrations
  (tool.integrations || []).slice(0, 5).forEach(i => {
    const t = i.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (t.length > 2) tags.add(t);
  });

  // From alternatives
  (tool.alternatives || []).slice(0, 3).forEach(a => {
    const t = a.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (t.length > 2) tags.add(t);
  });

  return [...tags].slice(0, 10);
}

// ─── Slug generator ──────────────────────────────────────────────────────────
function makeSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ─── Rating generator (deterministic from name) ──────────────────────────────
function generateRating(name) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  // Range: 3.8 – 4.9
  return Math.round((3.8 + (hash % 11) * 0.1) * 10) / 10;
}

function generateRatingCount(name) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 200 + (hash % 4800);
}

function generateViews(name) {
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return 5000 + (hash % 95000);
}

// ─── Main mapper ─────────────────────────────────────────────────────────────
function mapToolToSchema(raw) {
  const name = raw.tool_name || 'Unknown Tool';
  const category = normalizeCategory(raw.category);
  const pricing = normalizePricing(raw);
  const rating = generateRating(name);
  const ratingCount = generateRatingCount(name);
  const views = generateViews(name);

  return {
    // Core identity
    name,
    tool_name: name,
    slug: makeSlug(name),

    // Descriptions
    shortDescription: raw.why_it_matters || raw.what_is_it?.substring(0, 280) || '',
    description: raw.what_is_it || '',
    long_description: raw.importance || raw.what_is_it || '',

    // Category
    category,
    categories: [category],
    subcategories: raw.sub_category ? [raw.sub_category] : [],

    // Links & media
    links: {
      website: raw.official_website || '',
    },
    website_url: raw.official_website || '',

    // Pricing
    pricing: {
      model: pricing.model,
      details: pricing.details,
      plans: [],
    },
    pricing_type: pricing.model,
    pricing_details: pricing.details,
    free_plan: raw.free_version_available === true,

    // Stats
    stats: {
      rating,
      ratingCount,
      views,
      weeklyViews: Math.floor(views * 0.15),
      saves: Math.floor(ratingCount * 0.3),
    },

    // Tags & keywords
    tags: extractTags(raw),
    semantic_keywords: [
      ...(raw.best_use_cases || []).slice(0, 3),
      ...(raw.who_should_use_it || []).slice(0, 2),
    ].map(s => s.toLowerCase().substring(0, 50)),

    // Use cases
    primary_use_cases: (raw.best_use_cases || []).slice(0, 5),
    secondary_use_cases: (raw.who_should_use_it || []).slice(0, 3),

    // Features & strengths
    features: (raw.key_benefits || []),
    strengths: (raw.advantages || []),
    weaknesses: (raw.disadvantages || []),

    // Integrations & alternatives
    integrations: (raw.integrations || []).slice(0, 10),
    alternatives: (raw.alternatives || []).slice(0, 5),
    competitors: (raw.alternatives || []).slice(0, 5),

    // AI meta (pros/cons/use cases)
    aiMeta: {
      pros: (raw.advantages || []),
      cons: (raw.disadvantages || []),
      useCases: (raw.best_use_cases || []),
      summary: raw.key_reason_to_use_over_others || '',
    },

    // Flags
    api_available: (raw.platforms_supported || []).some(p =>
      p.toLowerCase().includes('api')
    ),
    open_source: (raw.pricing_model || '').toLowerCase().includes('open-source') ||
      (raw.pricing_model || '').toLowerCase().includes('open source'),
    enterprise_support: (raw.pricing_model || '').toLowerCase().includes('enterprise'),
    agent_capabilities: (raw.category || '').toLowerCase().includes('agent'),
    automation_level: (raw.category || '').toLowerCase().includes('agent') ? 'agentic' : 'partial',

    // Status
    status: 'approved',
    verified: true,

    // Embedding text for search
    embedding_text: [
      name,
      raw.what_is_it || '',
      raw.importance || '',
      (raw.best_use_cases || []).join('. '),
      (raw.key_benefits || []).join('. '),
    ].join(' ').substring(0, 2000),
  };
}

// ─── Seed function ────────────────────────────────────────────────────────────
const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airadar');
    logger.info('MongoDB connected for seeding...');

    // Load JSON data
    const jsonPath = join(__dirname, '..', 'ai_tools_directory (1).json');
    const rawData = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    logger.info(`Loaded ${rawData.length} tools from JSON file`);

    // Clear existing tools
    await Tool.deleteMany({});
    logger.info('Cleared existing tools collection');

    // Map and deduplicate by slug
    const slugsSeen = new Set();
    const toolDocs = [];

    for (const raw of rawData) {
      const doc = mapToolToSchema(raw);
      if (slugsSeen.has(doc.slug)) {
        // Append a suffix to make slug unique
        doc.slug = `${doc.slug}-${slugsSeen.size}`;
      }
      slugsSeen.add(doc.slug);
      toolDocs.push(doc);
    }

    // Insert in batches of 20
    const BATCH = 20;
    let inserted = 0;
    for (let i = 0; i < toolDocs.length; i += BATCH) {
      const batch = toolDocs.slice(i, i + BATCH);
      await Tool.insertMany(batch, { ordered: false });
      inserted += batch.length;
      logger.info(`Inserted ${inserted}/${toolDocs.length} tools...`);
    }

    logger.info(`✅ Successfully seeded ${inserted} AI tools into the database!`);
    process.exit(0);
  } catch (error) {
    logger.error(`Seed error: ${error.message}`);
    if (error.writeErrors) {
      logger.error(`Write errors: ${error.writeErrors.length} duplicates skipped`);
    }
    process.exit(1);
  }
};

seedDB();
