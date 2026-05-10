// backend/src/routes/ai.js
import express from 'express';
import { compare, recommend, chat } from '../controllers/aiController.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(aiLimiter);

router.post('/compare', compare);
router.post('/recommend', recommend);
router.post('/chat', chat);

export default router;
