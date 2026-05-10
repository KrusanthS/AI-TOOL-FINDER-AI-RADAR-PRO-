import mongoose from 'mongoose';
import 'dotenv/config';

async function check() {
  console.log('Connecting to:', process.env.MONGODB_URI);
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('SUCCESS: Connected to MongoDB Atlas');
    process.exit(0);
  } catch (err) {
    console.error('FAILED: Could not connect to MongoDB Atlas');
    console.error(err.message);
    process.exit(1);
  }
}

check();
