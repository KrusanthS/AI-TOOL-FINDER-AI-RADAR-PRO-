import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function auditLogos() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('--- Logo Audit Report ---');

    const totalTools = await Tool.countDocuments();
    const missingLogos = await Tool.find({
      $or: [
        { 'media.logo': null },
        { 'media.logo': '' },
        { 'links.website': '#' }
      ]
    }).select('name category links.website');

    console.log(`Total Tools: ${totalTools}`);
    console.log(`Tools Missing Logos or URLs: ${missingLogos.length}`);
    
    if (missingLogos.length > 0) {
      console.log('\nSample Missing Tools:');
      missingLogos.slice(0, 10).forEach(t => {
        console.log(`- ${t.name} (${t.category}) | Website: ${t.links.website}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Audit failed:', error);
    process.exit(1);
  }
}

auditLogos();
