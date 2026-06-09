// backend/src/utils/verifyCodingTools.js
// Verify the coding tools have been seeded properly
// Usage: node src/utils/verifyCodingTools.js

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const verify = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const tools = await Tool.find({ category: 'Coding' })
      .select('name slug category pricing_type website_url features tags status verified')
      .sort({ name: 1 });

    console.log(`🔍 Found ${tools.length} tools under "Coding" category:\n`);
    console.log('─'.repeat(80));

    tools.forEach((t, i) => {
      console.log(`\n${i + 1}. ${t.name}`);
      console.log(`   Slug:         ${t.slug}`);
      console.log(`   Category:     ${t.category}`);
      console.log(`   Pricing:      ${t.pricing_type}`);
      console.log(`   Website:      ${t.website_url || 'N/A'}`);
      console.log(`   Features:     ${(t.features || []).join(', ') || 'N/A'}`);
      console.log(`   Tags:         ${(t.tags || []).join(', ') || 'N/A'}`);
      console.log(`   Status:       ${t.status}`);
      console.log(`   Verified:     ${t.verified ? '✅' : '❌'}`);
    });

    console.log('\n' + '─'.repeat(80));
    console.log(`\n📊 Total: ${tools.length} tools in "Coding" category`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  }
};

verify();
