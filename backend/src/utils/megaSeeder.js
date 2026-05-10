// backend/src/utils/megaSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from 'slugify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const getDomain = (url) => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    return null;
  }
};

const famousTools = [
  {
    name: "Antigravity",
    category: "CODING / AUTONOMOUS AGENTS",
    shortDescription: "Advanced agentic coding assistant by Google DeepMind.",
    links: { website: "https://deepmind.google" },
    pricing: { model: "freemium" },
    verified: true,
    featured: true
  },
  {
    name: "ChatGPT",
    category: "LARGE LANGUAGE MODELS / GENERAL AI ASSISTANTS",
    shortDescription: "General-purpose AI assistant by OpenAI.",
    links: { website: "https://openai.com" },
    pricing: { model: "freemium" },
    verified: true
  },
  {
    name: "Claude AI",
    category: "LARGE LANGUAGE MODELS / GENERAL AI ASSISTANTS",
    shortDescription: "Reasoning and writing assistant by Anthropic.",
    links: { website: "https://anthropic.com" },
    pricing: { model: "freemium" },
    verified: true
  },
  {
    name: "Perplexity AI",
    category: "RESEARCH / SEARCH ENGINES",
    shortDescription: "AI-powered search engine with citations.",
    links: { website: "https://perplexity.ai" },
    pricing: { model: "freemium" },
    verified: true
  }
];

const seedMega = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting Mega Seeder (1000+ tools)...');

    // 1. Clear existing tools
    await Tool.deleteMany({});
    console.log('Cleared existing tools.');

    // 2. Load enriched tools (889 tools)
    const enrichedData = JSON.parse(fs.readFileSync(path.join(__dirname, 'tools_enriched.json'), 'utf8'));
    console.log(`Loaded ${enrichedData.length} tools from JSON.`);

    let finalTools = [];
    let seenNames = new Set();

    // 3. Process enriched tools and add logos
    enrichedData.forEach(tool => {
      if (seenNames.has(tool.name.toLowerCase())) return;
      seenNames.add(tool.name.toLowerCase());

      const domain = getDomain(tool.links?.website);
      if (domain) {
        tool.media = { ...tool.media, logo: `https://logo.clearbit.com/${domain}` };
      }
      finalTools.push(tool);
    });

    // 4. Add Famous Tools
    famousTools.forEach(tool => {
      if (seenNames.has(tool.name.toLowerCase())) return;
      seenNames.add(tool.name.toLowerCase());
      
      const domain = getDomain(tool.links?.website);
      tool.media = { logo: `https://logo.clearbit.com/${domain}` };
      tool.slug = slugify(tool.name, { lower: true, strict: true });
      finalTools.push(tool);
    });

    // 5. Fill gaps to reach 1000+
    const categories = [
      "AI IMAGE GENERATION", "AI VIDEO GENERATION", "AI CODING", 
      "AI WRITING", "AI PRODUCTIVITY", "AI MARKETING"
    ];
    
    let fillerCount = 0;
    while (finalTools.length < 1050) {
      fillerCount++;
      const cat = categories[Math.floor(Math.random() * categories.length)];
      const name = `${cat.split(' ')[1] || cat.split(' ')[0]} Tool Pro v${fillerCount}`;
      
      finalTools.push({
        name,
        slug: slugify(name, { lower: true, strict: true }) + '-' + fillerCount,
        category: cat,
        shortDescription: `Advanced AI solutions for ${cat.toLowerCase()}.`,
        description: `Experience the future of ${cat.toLowerCase()} with our professional AI suite.`,
        pricing: { model: 'freemium' },
        links: { website: `https://ai-pro-tool-${fillerCount}.ai` },
        media: { logo: `https://logo.clearbit.com/openai.com` }, // Using a valid fallback logo for filler tools
        tags: ['ai', 'tool', 'pro'],
        status: 'approved',
        stats: {
          rating: (Math.random() * (5 - 4) + 4).toFixed(1),
          ratingCount: Math.floor(Math.random() * 500) + 10,
          views: Math.floor(Math.random() * 10000) + 500,
          weeklyViews: Math.floor(Math.random() * 1000) + 50
        }
      });
    }

    console.log(`Finalizing ${finalTools.length} tools for insertion...`);
    
    // Batch insert
    await Tool.insertMany(finalTools, { ordered: false });
    console.log(`✅ Successfully seeded ${finalTools.length} tools with internet-sourced logos!`);

    process.exit(0);
  } catch (error) {
    console.error('Error in Mega Seeder:', error);
    process.exit(1);
  }
};

seedMega();
