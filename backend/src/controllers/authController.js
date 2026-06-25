// backend/src/controllers/authController.js
import User from '../models/User.js';
import Bookmark from '../models/Bookmark.js';
import logger from '../utils/logger.js';

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({ path: 'savedTools', select: 'name slug category pricing stats media' })
      .lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    logger.error(`getMe error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const { categories, emailAlerts } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { 'preferences.categories': categories, 'preferences.emailAlerts': emailAlerts } },
      { new: true }
    );
    res.json(user);
  } catch (error) {
    logger.error(`updatePreferences error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

// Legacy route — delegates to bookmarkController
export const getBookmarks = async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.user._id })
      .populate({ path: 'toolId', select: 'name slug category pricing stats media links verified' })
      .sort({ createdAt: -1 })
      .lean();
    res.json(bookmarks);
  } catch (error) {
    logger.error(`getBookmarks error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

export const toggleBookmark = async (req, res) => {
  const { toolId } = req.body;
  try {
    const existing = await Bookmark.findOne({ userId: req.user._id, toolId });
    if (existing) {
      await Bookmark.findByIdAndDelete(existing._id);
      await User.findByIdAndUpdate(req.user._id, { $pull: { savedTools: toolId } });
      return res.json({ bookmarked: false });
    } else {
      await Bookmark.create({ userId: req.user._id, toolId });
      await User.findByIdAndUpdate(req.user._id, { $push: { savedTools: toolId } });
      return res.json({ bookmarked: true });
    }
  } catch (error) {
    logger.error(`toggleBookmark error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};
