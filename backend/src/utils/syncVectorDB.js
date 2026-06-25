import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Tool from '../models/Tool.js';
import { syncToolToVectorDB, initEmbedder } from '../services/aiSearchService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const syncAllTools = async () => {
  try {
    if (!process.env.PINECONE_API_KEY) {
      console.error('Error: PINECONE_API_KEY is missing from .env');
      process.exit(1);
    }
    
    if (!process.env.GROQ_API_KEY) {
      console.warn('Warning: GROQ_API_KEY is missing. Search won\'t work but sync will proceed.');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');

    const tools = await Tool.find({ status: 'approved' });
    console.log(`Found ${tools.length} approved tools to sync.`);

    let count = 0;
    for (const tool of tools) {
      await syncToolToVectorDB(tool);
      count++;
      if (count % 50 === 0) {
        console.log(`Synced ${count}/${tools.length} tools...`);
      }
    }

    console.log('Successfully synced all tools to Pinecone Vector DB!');
    process.exit(0);
  } catch (error) {
    console.error('Sync failed:', error);
    process.exit(1);
  }
};

syncAllTools();
