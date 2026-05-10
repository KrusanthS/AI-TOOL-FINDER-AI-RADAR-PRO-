// backend/src/utils/sampleLogos.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const sampleLogos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const tools = await Tool.find({}, { name: 1, 'media.logo': 1, 'links.website': 1 }).limit(10);
    console.log(JSON.stringify(tools, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

sampleLogos();
