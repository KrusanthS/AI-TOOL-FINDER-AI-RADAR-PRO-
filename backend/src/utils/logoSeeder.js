// backend/src/utils/logoSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import path from 'path';
import { fileURLToPath } from 'url';

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

const seedLogos = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env');
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Fetching tools to update logos...');
    
    // Find tools that don't have a logo or have a default placeholder
    const tools = await Tool.find({ 
      $or: [
        { 'media.logo': { $exists: false } },
        { 'media.logo': '' },
        { 'media.logo': null },
        { 'media.logo': { $regex: /placeholder/i } }
      ]
    });

    console.log(`Found ${tools.length} tools potentially needing logos.`);

    let updatedCount = 0;
    let skipCount = 0;

    for (const tool of tools) {
      let website = tool.links?.website;

      // If no website, try to find it using the tool name (simplified search logic)
      if (!website) {
        // In a real scenario, we might use a search API here.
        // For now, we'll mark it to be checked manually or skip.
        skipCount++;
        continue;
      }

      const domain = getDomain(website);
      if (domain) {
        // Clearbit is excellent for high-quality logos
        const logoUrl = `https://logo.clearbit.com/${domain}`;
        
        // Update the tool
        await Tool.updateOne(
          { _id: tool._id },
          { $set: { 'media.logo': logoUrl } }
        );
        
        updatedCount++;
        if (updatedCount % 50 === 0) {
          console.log(`Progress: ${updatedCount} tools updated...`);
        }
      } else {
        skipCount++;
      }
    }

    console.log(`\n🎉 Logo enrichment complete!`);
    console.log(`✅ Successfully updated: ${updatedCount} tools`);
    console.log(`⏩ Skipped (no valid domain): ${skipCount} tools`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in logo seeder:', error.message);
    process.exit(1);
  }
};

seedLogos();
