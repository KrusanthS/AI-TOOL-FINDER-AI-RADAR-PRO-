// backend/src/routes/tools.js
import express from 'express';
import { getTools, getToolBySlug, getCategories } from '../controllers/toolController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';

const router = express.Router();

router.get('/', cacheMiddleware(300), getTools); // 5 min cache
router.get('/categories', cacheMiddleware(3600), getCategories); // 1 hour cache
router.get('/:slug', getToolBySlug); // No full page cache since view count needs to update, but could cache partially

export default router;
