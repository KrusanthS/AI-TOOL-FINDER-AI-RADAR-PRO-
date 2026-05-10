// backend/src/models/Review.js
import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  toolId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tool',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxLength: 1000
  }
}, {
  timestamps: true
});

// A user can only review a tool once
reviewSchema.index({ toolId: 1, userId: 1 }, { unique: true });

// Middleware to update average rating on Tool document
reviewSchema.statics.calcAverageRatings = async function(toolId) {
  const stats = await this.aggregate([
    { $match: { toolId } },
    { $group: {
        _id: '$toolId',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
    } }
  ]);
  
  if (stats.length > 0) {
    await mongoose.model('Tool').findByIdAndUpdate(toolId, {
      'stats.ratingCount': stats[0].nRating,
      'stats.rating': Math.round(stats[0].avgRating * 10) / 10
    });
  } else {
    await mongoose.model('Tool').findByIdAndUpdate(toolId, {
      'stats.ratingCount': 0,
      'stats.rating': 0
    });
  }
};

reviewSchema.post('save', function() {
  this.constructor.calcAverageRatings(this.toolId);
});

reviewSchema.post(/^findOneAnd/, async function(doc) {
  if (doc) {
    await doc.constructor.calcAverageRatings(doc.toolId);
  }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
