// backend/src/utils/seedCodingFromJson.js
// Seed script that reads coding tools from JSON file and pushes to MongoDB
// Usage: node src/utils/seedCodingFromJson.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import slugify from 'slugify';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Tool from '../models/Tool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from backend root
dotenv.config({ path: new URL('../../.env', import.meta.url) });

const jsonPath = path.join(__dirname, '..', 'data', 'coding_tools.json');

// Map UI pricing strings to the schema enum values
const PRICING_MAP = {
  'free': 'free',
  'free/open source': 'free',
  'freemium': 'freemium',
  'paid': 'paid',
  'enterprise': 'enterprise',
  'unknown': 'unknown',
};

const normalizePricing = (raw) => {
  if (!raw) return 'unknown';
  const key = String(raw).toLowerCase().trim();
  return PRICING_MAP[key] || 'unknown';
};

const seed = async () => {
  try {
    // 1. Read JSON
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ JSON file not found: ${jsonPath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const tools = JSON.parse(raw);
    console.log(`📦 Loaded ${tools.length} coding tools from JSON.`);

    // 2. Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let added = 0;
    let updated = 0;
    let skipped = 0;

    // 3. Process each tool
    for (const t of tools) {
      const slug = slugify(t.name, { lower: true, strict: true });
      const pricingModel = normalizePricing(t.pricing);

      const existing = await Tool.findOne({ slug });

      const toolDoc = {
        name: t.name,
        tool_name: t.name,
        slug,
        category: t.category,
        categories: [t.category],
        description: t.description,
        shortDescription: t.description,
        short_description: t.description,
        website_url: t.website,
        links: { website: t.website },
        pricing_type: pricingModel,
        pricing: {
          model: pricingModel,
          details: t.pricing,
        },
        features: t.features || [],
        tags: t.tags || [],
        status: 'approved',
        source: 'manual',
        verified: true,
        free_plan: pricingModel === 'free',
      };

      if (existing) {
        // Update existing tool with latest data
        await Tool.updateOne({ _id: existing._id }, { $set: toolDoc });
        console.log(`🔄 Updated: ${t.name}`);
        updated++;
      } else {
        // Insert new tool
        await Tool.create(toolDoc);
        console.log(`✅ Added: ${t.name}`);
        added++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Added:   ${added}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);

    // 4. Show all coding tools in DB
    const codingCount = await Tool.countDocuments({ category: 'Coding' });
    console.log(`\n🔍 Total "Coding" tools in DB: ${codingCount}`);

    await mongoose.disconnect();
    console.log('👋 Disconnected. Done!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

seed();
