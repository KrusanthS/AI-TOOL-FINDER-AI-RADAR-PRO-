// backend/src/controllers/bookmarkController.js
import Bookmark from '../models/Bookmark.js';
import Tool from '../models/Tool.js';
import logger from '../utils/logger.js';

export const getBookmarks = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user._id })
      .populate({ path: 'toolId', select: 'name slug category pricing stats media links tags verified shortDescription' })
      .sort({ createdAt: -1 })
      .lean();

    // Filter out any bookmarks whose referenced tool was deleted
    const bookmarkedTools = bookmarks
      .filter(b => b.toolId)
      .map(b => ({
        ...b.toolId,
        bookmarkId: b._id,
        bookmarkedAt: b.createdAt
      }));

    res.json(bookmarkedTools);
  } catch (error) {
    logger.error(`getBookmarks error: ${error.message}`);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
};

export const addBookmark = async (req, res) => {
  const { toolId } = req.body;
  if (!toolId) {
    return res.status(400).json({ error: 'Tool ID is required' });
  }

  try {
    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    const existingBookmark = await Bookmark.findOne({ 
      userId: req.user._id, 
      toolId 
    });

    if (existingBookmark) {
      return res.status(400).json({ error: 'Tool already bookmarked' });
    }

    const bookmark = await Bookmark.create({
      userId: req.user._id,
      toolId,
      note: req.body.note || ''
    });

    // Increment save count on tool
    await Tool.findByIdAndUpdate(toolId, { $inc: { 'stats.saves': 1 } });

    res.status(201).json(bookmark);
  } catch (error) {
    logger.error(`addBookmark error: ${error.message}`);
    res.status(500).json({ error: 'Failed to add bookmark' });
  }
};

export const removeBookmark = async (req, res) => {
  const { id } = req.params; // bookmark ID or toolId? Let's use toolId for easier toggle
  
  try {
    const bookmark = await Bookmark.findOneAndDelete({ 
      userId: req.user._id, 
      toolId: id 
    });

    if (!bookmark) {
      return res.status(404).json({ error: 'Bookmark not found' });
    }

    // Decrement save count on tool (floor at 0)
    await Tool.findByIdAndUpdate(id, [
      { $set: { 'stats.saves': { $max: [0, { $subtract: ['$stats.saves', 1] }] } } }
    ]);

    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    logger.error(`removeBookmark error: ${error.message}`);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
};

export const checkBookmarkStatus = async (req, res) => {
  const { toolId } = req.params;
  try {
    const bookmark = await Bookmark.findOne({ 
      userId: req.user._id, 
      toolId 
    });
    res.json({ isBookmarked: !!bookmark });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
