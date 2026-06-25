// backend/src/utils/seedDirectoryTools.js
// Imports all 61 tools from ai_tools_directory.json into MongoDB
// Does NOT delete existing tools — only skips duplicates by name

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from 'slugify';
import Tool from '../models/Tool.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the JSON file in project root
const JSON_PATH = path.resolve(__dirname, '../../..', 'ai_tools_directory (1).json');

// Map JSON category → Tool schema category enum
function mapCategory(cat) {
  const map = {
    'Large Language Models (LLMs)': 'Chat',
    'Vector Databases': 'Data',
    'RAG / AI Frameworks': 'Coding',
    'AI Observability / Monitoring': 'Data',
    'Coding & Developer AI': 'Coding',
    'Audio & Music AI': 'Audio',
    'Image & Design AI': 'Image',
    'Video AI': 'Video',
    'AI Chatbots': 'Chat',
    'AI Search / Knowledge Engines': 'Research',
    'AI Marketplace / Directory': 'Productivity',
    'AI Agent Frameworks': 'Coding',
    'AI Agents & Automation': 'Productivity',
    'AI Models & APIs': 'Coding',
    'AI DevOps & Cloud AI': 'Data',
    'Writing & Content AI': 'Writing',
    'AI Inference / Deployment': 'Coding',
    'Website Builder AI': 'Design',
    'Mobile App Builder AI': 'Coding',
    'AI API Gateway / Backend Infra': 'Coding',
    'AI Data Science & ML Tools': 'Data',
    'AI Assistants': 'Chat',
  };
  return map[cat] || 'Other';
}

// Map pricing string → pricing_type enum
function mapPricing(free, pricingModel = '') {
  if (free === true) return 'freemium';
  const p = pricingModel.toLowerCase();
  if (p.includes('free') && p.includes('paid')) return 'freemium';
  if (p.includes('free')) return 'free';
  if (p.includes('enterprise')) return 'enterprise';
  if (p.includes('pay-per') || p.includes('paid') || p.includes('$')) return 'paid';
  return 'unknown';
}

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const raw = fs.readFileSync(JSON_PATH, 'utf8');
    const tools = JSON.parse(raw);
    console.log(`📦 Loaded ${tools.length} tools from JSON`);

    let inserted = 0;
    let skipped = 0;

    for (const t of tools) {
      const name = (t.tool_name || '').trim();
      if (!name) { skipped++; continue; }

      const category = mapCategory(t.category);
      const pricingType = mapPricing(t.free_version_available, t.pricing_model || '');
      const baseSlug = slugify(name, { lower: true, strict: true });

      // Make slug unique by appending a suffix if needed
      let slug = baseSlug;
      let slugExists = await Tool.findOne({ slug });
      if (slugExists) slug = `${baseSlug}-2`;

      // Skip if name already exists
      const exists = await Tool.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
      if (exists) {
        console.log(`⏭️  Skipped (exists): ${name}`);
        skipped++;
        continue;
      }

      const doc = {
        name,
        tool_name: name,
        slug,
        category,
        categories: [category],
        subcategories: t.sub_category ? [t.sub_category] : [],

        short_description: t.what_is_it?.slice(0, 300) || '',
        shortDescription: t.what_is_it?.slice(0, 300) || '',
        long_description: t.importance || t.what_is_it || '',
        description: t.importance || t.what_is_it || '',

        website_url: t.official_website || '',
        links: { website: t.official_website || '' },

        pricing_type: pricingType,
        pricing: { model: pricingType, details: t.pricing_model || '' },
        free_plan: t.free_version_available === true,

        tags: [
          ...(t.category ? [t.category] : []),
          ...(t.sub_category ? [t.sub_category] : []),
        ].map(s => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()).filter(Boolean),

        features: Array.isArray(t.key_benefits) ? t.key_benefits : [],
        strengths: Array.isArray(t.advantages) ? t.advantages : [],
        weaknesses: Array.isArray(t.disadvantages) ? t.disadvantages : [],
        alternatives: Array.isArray(t.alternatives) ? t.alternatives : [],
        integrations: Array.isArray(t.integrations) ? t.integrations : [],

        primary_use_cases: Array.isArray(t.best_use_cases) ? t.best_use_cases : [],
        industries: Array.isArray(t.who_should_use_it) ? t.who_should_use_it : [],

        platforms_supported: Array.isArray(t.platforms_supported) ? t.platforms_supported : [],

        aiMeta: {
          pros: Array.isArray(t.advantages) ? t.advantages.slice(0, 10) : [],
          cons: Array.isArray(t.disadvantages) ? t.disadvantages.slice(0, 10) : [],
          useCases: Array.isArray(t.best_use_cases) ? t.best_use_cases : [],
          summary: t.key_reason_to_use_over_others || '',
        },

        stats: { rating: 0, ratingCount: 0, views: 0, weeklyViews: 0, saves: 0 },
        popularity_score: 0,
        verified: false,
        status: 'approved',
        source: 'directory_import',
      };

      await Tool.create(doc);
      console.log(`✅ Inserted: ${name}`);
      inserted++;
    }

    console.log('\n🎉 Done!');
    console.log(`   Inserted : ${inserted}`);
    console.log(`   Skipped  : ${skipped}`);
    console.log(`   Total DB : ${await Tool.countDocuments()}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
}

seed();
