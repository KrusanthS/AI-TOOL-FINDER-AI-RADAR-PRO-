// backend/src/models/PermanentTool.js
// Dedicated model for permanently stored, curated AI tools.
// Completely separate from the existing Tool collection.

import mongoose from 'mongoose';

const permanentToolSchema = new mongoose.Schema({
  // ── Identity ───────────────────────────────────────────────────────────────
  name: { type: String, required: [true, 'Tool name is required'], trim: true },
  name_lower: { type: String, index: true }, // auto-computed for duplicate detection

  // ── Description ────────────────────────────────────────────────────────────
  description: { type: String, default: '' },
  short_description: { type: String, default: '' },

  // ── Taxonomy ───────────────────────────────────────────────────────────────
  category: { type: String, index: true, default: 'Other' },
  tags: { type: [String], default: [] },
  platform: { type: [String], default: [] }, // e.g. ['Web', 'iOS', 'Android', 'Desktop']

  // ── URLs & Media ───────────────────────────────────────────────────────────
  website_url: { type: String, default: '' },
  website_url_lower: { type: String, index: true }, // auto-computed for duplicate detection
  logo_url: { type: String, default: '' },

  // ── Pricing ────────────────────────────────────────────────────────────────
  pricing: {
    type: String,
    enum: ['Free', 'Freemium', 'Paid', 'Enterprise', 'Open Source', 'Unknown'],
    default: 'Unknown',
  },
  pricing_details: { type: String, default: '' },

  // ── Features ───────────────────────────────────────────────────────────────
  features: { type: [String], default: [] },
  use_cases: { type: [String], default: [] },
  alternatives: { type: [String], default: [] },

  // ── Scores ─────────────────────────────────────────────────────────────────
  popularity_score: { type: Number, default: 0 },
  rating: { type: Number, default: 0, min: 0, max: 5 },

  // ── Dates ──────────────────────────────────────────────────────────────────
  date_added: { type: Date, default: Date.now },
  last_updated: { type: Date, default: Date.now },

  // ── Extensibility ──────────────────────────────────────────────────────────
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, {
  timestamps: true,
});

// ── Pre-save: compute lowercase fields for duplicate detection ────────────────
permanentToolSchema.pre('save', function (next) {
  if (this.name) {
    this.name_lower = this.name.toLowerCase().trim();
  }
  if (this.website_url) {
    this.website_url_lower = this.website_url.toLowerCase().replace(/\/+$/, '').trim();
  }
  this.last_updated = new Date();
  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
// Unique compound index for duplicate prevention (name + website)
permanentToolSchema.index({ name_lower: 1, website_url_lower: 1 }, { unique: true });

// Text index for search
permanentToolSchema.index({
  name: 'text',
  description: 'text',
  short_description: 'text',
  tags: 'text',
  features: 'text',
  category: 'text',
});

// Performance indexes
permanentToolSchema.index({ category: 1, popularity_score: -1 });
permanentToolSchema.index({ popularity_score: -1 });

const PermanentTool = mongoose.model('PermanentTool', permanentToolSchema);
export default PermanentTool;
