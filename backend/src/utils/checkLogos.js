// backend/src/utils/checkLogos.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkLogos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const total = await Tool.countDocuments();
    const withLogo = await Tool.countDocuments({ 
      'media.logo': { $exists: true, $ne: '', $not: /placeholder/i } 
    });
    const withoutLogo = total - withLogo;
    const withoutWebsite = await Tool.countDocuments({ 
      $or: [{ 'links.website': { $exists: false } }, { 'links.website': '' }] 
    });

    console.log(`Total tools: ${total}`);
    console.log(`Tools with logos: ${withLogo}`);
    console.log(`Tools without logos: ${withoutLogo}`);
    console.log(`Tools without website URL: ${withoutWebsite}`);

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkLogos();
