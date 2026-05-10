// backend/src/utils/seed.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import slugify from 'slugify';
import Tool from '../models/Tool.js';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const toolsEnrichedPath = path.join(__dirname, 'tools_enriched.json');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for seeding...');
    
    let toolsToSeed = [];
    if (fs.existsSync(toolsEnrichedPath)) {
        const rawData = fs.readFileSync(toolsEnrichedPath, 'utf8');
        toolsToSeed = JSON.parse(rawData);
        console.log(`Loading ${toolsToSeed.length} tools from JSON...`);
    } else {
        console.warn('tools_enriched.json not found, using default tools.');
        return;
    }

    // Cleanup existing tools
    await Tool.deleteMany({});
    
    // Ensure all tools have slugs and default values
    const processedTools = toolsToSeed.map(t => ({
      ...t,
      slug: t.slug || slugify(t.name, { lower: true, strict: true }),
      source: t.source || 'manual',
      status: t.status || 'approved'
    }));

    await Tool.insertMany(processedTools);
    
    console.log('Database Seeded Successfully! 🌱');
    process.exit();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
