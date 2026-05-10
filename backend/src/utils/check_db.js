
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';

dotenv.config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const count = await Tool.countDocuments();
    console.log(`Total tools in DB: ${count}`);
    
    const categories = await Tool.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log('Categories:', JSON.stringify(categories, null, 2));
    
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

checkDB();
