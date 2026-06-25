// backend/src/routes/tools.js
// Mounts the existing tools routes AND the new Step 17 direct tool search /
// category browsing routes (no LLM).
//
// IMPORTANT: Order matters here — the more specific routes (/categories, /by-category, /search/direct)
// must be registered BEFORE the catch-all /:slug route, otherwise Express
// will treat "categories" or "by-category" as a slug.

import express from 'express';
import { getTools, getToolBySlug, getCategories } from '../controllers/toolController.js';
import { cacheMiddleware } from '../middleware/cacheMiddleware.js';
import directToolSearchRoutes from './directToolSearch.js';

const router = express.Router();

// ── New Step 17: Direct tool search + category browsing ──────────────────────
router.use('/', directToolSearchRoutes);

// ── Existing tools routes (preserved for backward compatibility) ────────────
router.get('/', cacheMiddleware(300), getTools); // 5 min cache
router.get('/categories-legacy', cacheMiddleware(3600), getCategories); // 1 hour cache (legacy)
router.get('/:slug', getToolBySlug); // No full page cache since view count needs to update

export default router;
