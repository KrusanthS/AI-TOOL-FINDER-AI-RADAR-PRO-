// backend/src/routes/admin.js
import express from 'express';
import { getPendingTools, approveTool, rejectTool, getStats, triggerDiscovery, triggerEnrichment, triggerTrending } from '../controllers/adminController.js';
import { createTool, updateTool, deleteTool } from '../controllers/toolController.js';
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

// CRUD for tools
router.post('/tools', createTool);
router.put('/tools/:id', updateTool);
router.delete('/tools/:id', deleteTool);

export default router;
