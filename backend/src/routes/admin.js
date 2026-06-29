// backend/src/routes/admin.js
import express from 'express';
import { getPendingTools, approveTool, rejectTool, getStats, triggerDiscovery, triggerEnrichment, triggerTrending } from '../controllers/adminController.js';
import { createTool, updateTool, deleteTool } from '../controllers/toolController.js';
import {
  listPermanentTools,
  getPermanentTool,
  createPermanentTool,
  updatePermanentTool,
  removePermanentTool,
  seedPermanentToolsHandler,
} from '../controllers/permanentToolController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth, requireAdmin);

router.get('/pending', getPendingTools);
router.post('/approve/:id', approveTool);
router.post('/reject/:id', rejectTool);
router.get('/stats', getStats);
router.post('/jobs/discovery', triggerDiscovery);
router.post('/jobs/enrichment', triggerEnrichment);
router.post('/jobs/trending', triggerTrending);

// CRUD for tools (existing Tool collection)
router.post('/tools', createTool);
router.put('/tools/:id', updateTool);
router.delete('/tools/:id', deleteTool);

// ── Permanent Tools CRUD ────────────────────────────────────────────────────
// Note: /seed must be registered BEFORE /:id to avoid Express treating "seed" as an ID.
router.post('/permanent-tools/seed', seedPermanentToolsHandler);
router.get('/permanent-tools', listPermanentTools);
router.post('/permanent-tools', createPermanentTool);
router.get('/permanent-tools/:id', getPermanentTool);
router.put('/permanent-tools/:id', updatePermanentTool);
router.delete('/permanent-tools/:id', removePermanentTool);

export default router;

