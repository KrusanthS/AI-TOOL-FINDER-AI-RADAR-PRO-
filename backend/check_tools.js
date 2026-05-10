import mongoose from 'mongoose';
import Tool from './src/models/Tool.js';
import dotenv from 'dotenv';
dotenv.config();

async function checkDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airadar');
  const tools = await Tool.find({}, { name: 1, slug: 1, status: 1 });
  console.log(JSON.stringify(tools, null, 2));
  process.exit(0);
}
checkDB();
