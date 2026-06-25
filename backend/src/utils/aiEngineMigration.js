import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Tool from '../models/Tool.js';
import { runBatchEnrichment } from '../services/enrichmentService.js';
import { syncToolToVectorDB } from '../services/aiSearchService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const migrateDB = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Run Enrichment Phase
    console.log('\n--- STARTING PHASE 1 & 2: TOOL AUDIT AND ENRICHMENT ---');
    // We run the enrichment batch for all tools (or pass a large limit). 
    // For demonstration, let's process 50 at a time.
    const toolsCount = await Tool.countDocuments({ automation_level: 'unknown' });
    console.log(`${toolsCount} tools need enrichment.`);
    
    let processed = 0;
    while (processed < toolsCount) {
       const batchResults = await runBatchEnrichment(10);
       processed += batchResults.length;
       console.log(`Processed ${processed}/${toolsCount} tools for enrichment.`);
       if (batchResults.length === 0) break; // done
    }

    // 2. Run Vector DB Sync Phase (Phase 5)
    console.log('\n--- STARTING PHASE 5: VECTOR DB SYNC ---');
    const allTools = await Tool.find({});
    console.log(`Syncing ${allTools.length} tools to Pinecone using all-MiniLM-L6-v2...`);
    
    for (let i = 0; i < allTools.length; i++) {
        const tool = allTools[i];
        try {
            await syncToolToVectorDB(tool);
            console.log(`[${i+1}/${allTools.length}] Synced ${tool.tool_name} to Vector DB`);
        } catch (err) {
            console.error(`Failed to sync ${tool.tool_name}: ${err.message}`);
        }
    }

    console.log('\nMigration and optimization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateDB();
