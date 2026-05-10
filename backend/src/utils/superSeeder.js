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

const CATEGORIES = [
  'Writing', 'Image', 'Video', 'Audio', 'Coding', 'Marketing', 
  'Productivity', 'Research', 'Data', 'Cybersecurity', 
  'Finance', 'Legal', 'Healthcare', 'Design'
];

const categoryKeywords = {
  'Writing': ['write', 'content', 'copy', 'blog', 'essay', 'text', 'grammar', 'novel'],
  'Image': ['image', 'photo', 'art', 'generation', 'stable diffusion', 'midjourney', 'dall-e', 'pix', 'draw'],
  'Video': ['video', 'animation', 'movie', 'clip', 'sora', 'runway'],
  'Audio': ['audio', 'music', 'voice', 'speech', 'sound', 'elevenlabs', 'transcribe'],
  'Coding': ['code', 'developer', 'programming', 'software', 'git', 'debug', 'api'],
  'Marketing': ['marketing', 'ads', 'seo', 'social media', 'campaign', 'brand', 'sales'],
  'Productivity': ['productivity', 'work', 'notion', 'slack', 'task', 'schedule', 'efficiency'],
  'Research': ['research', 'study', 'academic', 'search', 'analyze', 'citation'],
  'Data': ['data', 'analytics', 'sql', 'spreadsheet', 'visualization', 'database'],
  'Cybersecurity': ['security', 'cyber', 'hack', 'protection', 'privacy', 'auth'],
  'Finance': ['finance', 'money', 'stock', 'invest', 'trading', 'budget'],
  'Legal': ['legal', 'law', 'contract', 'compliance'],
  'Healthcare': ['health', 'medical', 'doctor', 'bio', 'fitness'],
  'Design': ['design', 'ui', 'ux', 'figma', 'layout', '3d', 'model', 'interior']
};

const getCategory = (name, description) => {
  const text = `${name} ${description}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      return cat;
    }
  }
  return 'Other';
};

const getDomain = (url) => {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch (e) {
    return null;
  }
};

const seedSuper = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting Super Seeder (1000+ Real Tools)...');

    // Clear existing tools
    await Tool.deleteMany({});
    console.log('Cleared existing tools.');

    const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, 'AIToolsList.json'), 'utf8'));
    console.log(`Loaded ${rawData.length} tools from JSON.`);

    let finalTools = [];
    let seenNames = new Set();

    // Process top 1500 tools to find at least 1050 good ones
    for (let i = 0; i < rawData.length && finalTools.length < 1100; i++) {
      const tool = rawData[i];
      const name = tool.handle.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      
      if (seenNames.has(name.toLowerCase())) continue;
      seenNames.add(name.toLowerCase());

      const domain = getDomain(tool.website);
      if (!domain) continue;

      const category = getCategory(name, tool.description);
      
      finalTools.push({
        name,
        slug: slugify(name, { lower: true, strict: true }) + '-' + tool.id,
        category,
        shortDescription: tool.description,
        description: tool.description + " This professional AI tool offers state-of-the-art capabilities for your workflow.",
        pricing: { 
          model: i % 3 === 0 ? 'free' : (i % 3 === 1 ? 'freemium' : 'paid') 
        },
        links: { website: tool.website },
        media: { logo: `https://logo.clearbit.com/${domain}` },
        tags: [category.toLowerCase(), 'ai', 'tool'],
        status: 'approved',
        verified: i % 10 === 0,
        stats: {
          rating: (Math.random() * (5 - 3.5) + 3.5).toFixed(1),
          ratingCount: Math.floor(Math.random() * 1000) + 10,
          views: Math.floor(Math.random() * 50000) + 1000,
          weeklyViews: Math.floor(Math.random() * 5000) + 100
        },
        aiMeta: {
          useCases: [tool.description],
          summary: `Professional ${category} tool powered by advanced AI.`
        }
      });

      if (finalTools.length % 100 === 0) {
        console.log(`Prepared ${finalTools.length} tools...`);
      }
    }

    console.log(`Finalizing ${finalTools.length} tools for insertion...`);
    
    // Batch insert
    await Tool.insertMany(finalTools, { ordered: false });
    console.log(`✅ Successfully seeded ${finalTools.length} REAL tools with internet-sourced logos!`);

    process.exit(0);
  } catch (error) {
    console.error('Error in Super Seeder:', error);
    process.exit(1);
  }
};

seedSuper();
