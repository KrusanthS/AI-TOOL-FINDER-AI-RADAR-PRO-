// backend/src/models/Bookmark.js
import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  toolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool',
    required: true,
    index: true
  },
  note: {
    type: String,
    maxLength: 500
  }
}, {
  timestamps: true
});

// Ensure a user can only bookmark a tool once
bookmarkSchema.index({ userId: 1, toolId: 1 }, { unique: true });

const Bookmark = mongoose.model('Bookmark', bookmarkSchema);
export default Bookmark;
