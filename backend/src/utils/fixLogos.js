import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const UPDATES = {
  'Munch AI': 'getmunch.is',
  'Findmine AI': 'findmine.com',
  'Haut.AI': 'haut.ai',
  'Castmagic': 'castmagic.io',
  'Riverside.fm AI': 'riverside.fm',
  'Autopod.fm': 'autopod.fm',
  'Submagic': 'submagic.co',
  'Promethean AI': 'prometheanai.com',
  'Charisma': 'charisma.ai',
  'Scenario.gg': 'scenario.com',
  'ClearStem AI': 'clearstem.com',
  'Captions.ai': 'captions.ai',
  'Descript': 'descript.com',
  'Square for Restaurants AI': 'squareup.com',
  'Latitude': 'latitude.io',
  'NVIDIA DLSS': 'nvidia.com',
  'YouCam Makeup AI': 'perfectcorp.com',
  'Trendalytics': 'trendalytics.co',
  'Choco AI': 'choco.com',
  'BlueCart AI': 'bluecart.com',
  'GameBench AI': 'gamebench.net'
};

async function fixLogos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting logo recovery...');

    for (const [name, domain] of Object.entries(UPDATES)) {
      const logoUrl = `https://logo.clearbit.com/${domain}`;
      const result = await Tool.updateMany(
        { name: new RegExp(name, 'i') },
        { 
          $set: { 
            'media.logo': logoUrl,
            'links.website': `https://${domain}`
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ Updated ${name} -> ${domain}`);
      } else {
        console.log(`⚠️ No match found for ${name}`);
      }
    }

    // Special fix for v0
    await Tool.updateOne(
      { name: /v0/i },
      { $set: { 'media.logo': 'https://logo.clearbit.com/v0.dev', 'links.website': 'https://v0.dev' } }
    );
    console.log('✅ Updated v0 -> v0.dev');

    process.exit(0);
  } catch (error) {
    console.error('Update failed:', error);
    process.exit(1);
  }
}

fixLogos();
