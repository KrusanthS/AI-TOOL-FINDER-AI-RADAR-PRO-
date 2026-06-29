// backend/inspect_db.mjs
// Inspect existing categories and tool distribution
import mongoose from 'mongoose';
import Tool from './src/models/Tool.js';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const total = await Tool.countDocuments({ status: 'approved' });
    console.log('Total approved tools:', total);

    // Get category distribution
    const cats = await Tool.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    console.log('\n=== CATEGORIES ===');
    console.log(`Total categories: ${cats.length}`);
    cats.forEach(c => console.log(`  ${c._id || '(empty)'}: ${c.count}`));

    // Check tools with no category
    const noCat = await Tool.countDocuments({ status: 'approved', $or: [{ category: { $exists: false } }, { category: null }, { category: '' }] });
    console.log(`\nTools with no category: ${noCat}`);

    // Get tools with categories
    const sample = await Tool.find({ status: 'approved' }).limit(3).select('name category categories tags').lean();
    console.log('\n=== SAMPLE TOOLS ===');
    sample.forEach(t => console.log(`  ${t.name}: category=${t.category}, categories=${JSON.stringify(t.categories)}`));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
