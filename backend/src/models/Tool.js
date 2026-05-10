// backend/src/models/Tool.js
import mongoose from 'mongoose';
import slugify from 'slugify';

const toolSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tool name is required'],
    trim: true,
    maxLength: [100, 'Name cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  description: {
    type: String,
    maxLength: [2000, 'Description cannot exceed 2000 characters']
  },
  shortDescription: {
    type: String,
    maxLength: [300, 'Short description cannot exceed 300 characters']
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  subCategory: String,
  tags: {
    type: [String],
    validate: [val => val.length <= 10, 'Max 10 tags allowed'],
    lowercase: true
  },
  pricing: {
    model: {
      type: String,
      enum: ['free', 'freemium', 'paid', 'enterprise'],
      default: 'free'
    },
    plans: [{
      name: String,
      price: String,
      billingCycle: String,
      features: [String]
    }]
  },
  media: {
    logo: String,
    screenshots: [String],
    demo: String
  },
  links: {
    website: String,
    docs: String,
    github: String,
    twitter: String
  },
  stats: {
    views: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    weeklyViews: { type: Number, default: 0 }
  },
  aiMeta: {
    pros: [String],
    cons: [String],
    useCases: [String],
    summary: String,
    embedding: [Number]
  },
  source: {
    type: String,
    enum: ['manual', 'producthunt', 'github', 'scraped'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  featured: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true
});

// Auto-generate slug before saving
toolSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Indexes for search and filtering
toolSchema.index({ name: 'text', description: 'text', tags: 'text' });
toolSchema.index({ 'stats.weeklyViews': -1 });
toolSchema.index({ category: 1, 'stats.rating': -1 });

const Tool = mongoose.model('Tool', toolSchema);
export default Tool;
