// backend/src/routes/trending.js
import express from 'express';
import { getTrendingTools } from '../controllers/toolController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

// Cache trending tools for 5 minutes
router.get('/', cacheMiddleware(300), getTrendingTools);

export default router;
