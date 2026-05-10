// backend/src/routes/bookmarks.js
import express from 'express';
import { getBookmarks, addBookmark, removeBookmark, checkBookmarkStatus } from '../controllers/bookmarkController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getBookmarks);
router.post('/', addBookmark);
router.delete('/:id', removeBookmark);
router.get('/status/:toolId', checkBookmarkStatus);

export default router;
