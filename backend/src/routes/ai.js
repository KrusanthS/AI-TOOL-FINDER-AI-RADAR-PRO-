// backend/src/routes/ai.js
// INTELLIGENT AI TOOL SEARCH + COMPARISON + ANALYSIS ROUTES

import express from 'express';
import { 
  compare, 
  recommend, 
  chat, 
  discoverInternet,
  intelligentSearch,
  smartRecommend,
  compareUseCase,
  quickCompareTools,
  analyzeTool,
  helpDecision
} from '../controllers/aiController.js';
import { aiLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(aiLimiter);

// ── 🎯 INTELLIGENT SEARCH ROUTES ───────────────────────────────────────────────
router.post('/search/intelligent', intelligentSearch);      // LLM-powered search with intent analysis
router.post('/recommend/smart', smartRecommend);            // Use-case based recommendations

// ── ⚖️ COMPARISON ROUTES ───────────────────────────────────────────────────────
router.post('/compare', compare);                           // Legacy comparison
router.post('/compare/usecase', compareUseCase);            // Use-case based comparison
router.post('/compare/quick', quickCompareTools);           // Quick compare by names

// ── 📊 TOOL ANALYSIS ROUTES ─────────────────────────────────────────────────────
router.post('/analyze', analyzeTool);                       // Deep tool analysis
router.post('/analyze/decision', helpDecision);             // Help decide between tools

// ── 🌐 DISCOVERY ROUTES ─────────────────────────────────────────────────────────
router.post('/discover', discoverInternet);                 // Discover new tools from internet

// ── 💬 LEGACY ROUTES ───────────────────────────────────────────────────────────
router.post('/recommend', recommend);                       // Hybrid search (legacy)
router.post('/chat', chat);                                 // Chat (not implemented)

export default router;