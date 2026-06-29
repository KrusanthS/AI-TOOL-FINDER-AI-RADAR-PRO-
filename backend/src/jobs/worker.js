// backend/src/jobs/worker.js
import '../env.js';
import connectDB from '../config/db.js';
import logger from '../utils/logger.js';
import { scheduleDiscovery } from './toolDiscovery.js';
import { scheduleTrendingDecay } from './trendingJob.js';

// Import processors
import './toolDiscovery.js';
import './aiEnrichment.js';
import './trendingJob.js';

const startWorker = async () => {
  try {
    await connectDB();
    logger.info('Worker connected to MongoDB');

    // Schedule repeatable jobs
    scheduleDiscovery();
    scheduleTrendingDecay();

    logger.info('Bull Queue workers started successfully');
  } catch (error) {
    logger.error(`Worker startup failed: ${error.message}`);
    process.exit(1);
  }
};

startWorker();
