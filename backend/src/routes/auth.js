// backend/src/routes/auth.js
import express from 'express';
import { getMe, updatePreferences, getBookmarks, toggleBookmark } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/me', getMe);
router.put('/preferences', updatePreferences);
router.get('/bookmarks', getBookmarks);
router.post('/bookmarks', toggleBookmark);

export default router;
