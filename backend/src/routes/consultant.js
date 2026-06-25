// backend/src/routes/consultant.js
// AI CONSULTANT ROUTES (LLM-FIRST + direct tool search)
//
// Endpoints:
//   POST /api/consultant/recommend   → Auto-detect mode (intent vs direct) & respond
//   POST /api/consultant/understand  → Just understand the query (preview)
//   POST /api/consultant/direct      → Force direct tool search
//   POST /api/consultant/detect-mode → Debug: detect search mode for a query

import express from 'express';
import { recommend, understand, direct, detectMode } from '../controllers/consultantController.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(aiLimiter);

router.post('/recommend', recommend);
router.post('/understand', understand);
router.post('/direct', direct);
router.post('/detect-mode', detectMode);

export default router;
