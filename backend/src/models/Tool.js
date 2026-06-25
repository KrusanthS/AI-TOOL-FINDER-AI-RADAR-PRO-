import mongoose from 'mongoose';
import slugify from 'slugify';

const toolSchema = new mongoose.Schema({
  // ── Primary identity ──────────────────────────────────────────────────────
  tool_name: { type: String, trim: true },
  name: { type: String, required: [true, 'Tool name is required'], trim: true },
  slug: { type: String, unique: true, index: true },

  // ── URLs & media ──────────────────────────────────────────────────────────
  website_url: String,
  logo_url: String,
  links: {
    website: String,
    github: String,
    docs: String,
  },
  media: {
    logo: String,
    screenshot: String,
  },

  // ── Descriptions ─────────────────────────────────────────────────────────
  short_description: String,
  shortDescription: String,
  long_description: String,
  description: String,

  // ── Taxonomy ──────────────────────────────────────────────────────────────
  category: { type: String, index: true },
  categories: { type: [String], index: true },
  // Permanent canonical categories (Step 17: derived once, persisted)
  canonical_categories: { type: [String], index: true, default: [] },
  subcategories: [String],
  primary_use_cases: { type: [String], index: true },
  secondary_use_cases: [String],
  workflows: [String],
  tags: [String],
  industries: [String],
  semantic_keywords: [String],

  // Step 17: aliases for direct tool search
  aliases: { type: [String], default: [] },
  search_normalized: { type: String, index: true, default: '' },

  // ── NEW: Capability-based fields (LLM-first architecture) ────────────────
  capabilities: { type: [String], index: true },        // e.g. "video_creation", "auto_caption"
  use_cases: { type: [String], index: true },           // e.g. "youtube_shorts", "tiktok_reels"
  features: { type: [String], index: true },            // granular features
  supported_tasks: [String],                            // specific tasks the tool performs
  target_users: [String],                               // "beginner", "developer", "designer"
  integrations: [String],                               // third-party integrations
  pricing_model: { type: String, index: true },         // normalized pricing model

  // ── Scoring fields for LLM-first ranking ────────────────────────────────
  trust_score: { type: Number, default: 0, index: true },
  popularity_score_v2: { type: Number, default: 0, index: true },

  // ── Pricing ───────────────────────────────────────────────────────────────
  pricing: {
    model: {
      type: String,
      enum: ['free', 'freemium', 'paid', 'enterprise', 'unknown'],
      default: 'unknown',
    },
    details: String,
    plans: [
      {
        name: String,
        price: String,
        features: [String],
      },
    ],
  },
  pricing_type: {
    type: String,
    enum: ['free', 'freemium', 'paid', 'enterprise', 'unknown'],
    default: 'unknown',
    index: true,
  },
  pricing_details: String,
  free_plan: { type: Boolean, default: false },
  enterprise_support: { type: Boolean, default: false },

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats: {
    rating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    weeklyViews: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
  },
  popularity_score: { type: Number, default: 0, index: -1 },

  // ── Features & quality ────────────────────────────────────────────────────
  strengths: [String],
  weaknesses: [String],
  alternatives: [String],
  competitors: [String],
  ai_models_supported: [String],

  // ── AI-generated metadata ─────────────────────────────────────────────────
  aiMeta: {
    pros: [String],
    cons: [String],
    useCases: [String],
    summary: String,
    embedding: { type: [Number], select: false },
  },

  // ── Flags ─────────────────────────────────────────────────────────────────
  api_available: { type: Boolean, default: false },
  open_source: { type: Boolean, default: false },
  automation_level: {
    type: String,
    enum: ['none', 'partial', 'full', 'agentic', 'unknown'],
    default: 'unknown',
  },
  agent_capabilities: { type: Boolean, default: false },
  verified: { type: Boolean, default: false },

  // ── Vector search ─────────────────────────────────────────────────────────
  embedding_text: String,
  vector_embedding: { type: [Number], select: false },

  // ── Workflow ──────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
    index: true,
  },
  source: String,
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

// ── Pre-save hook ─────────────────────────────────────────────────────────────
toolSchema.pre('save', function (next) {
  // Sync name ↔ tool_name
  if (!this.tool_name && this.name) this.tool_name = this.name;
  if (!this.name && this.tool_name) this.name = this.tool_name;

  // Sync description fields
  if (!this.shortDescription && this.short_description) this.shortDescription = this.short_description;
  if (!this.short_description && this.shortDescription) this.short_description = this.shortDescription;
  if (!this.description && this.long_description) this.description = this.long_description;

  // Sync category
  if (!this.category && this.categories?.length) this.category = this.categories[0];
  if (this.category && !this.categories?.length) this.categories = [this.category];

  // Sync pricing_type ↔ pricing.model
  if (this.pricing?.model && !this.pricing_type) this.pricing_type = this.pricing.model;
  if (this.pricing_type && !this.pricing?.model) {
    if (!this.pricing) this.pricing = {};
    this.pricing.model = this.pricing_type;
  }

  // Sync pricing_model
  if (!this.pricing_model && this.pricing?.model) this.pricing_model = this.pricing.model;
  if (this.pricing_model && !this.pricing?.model) {
    if (!this.pricing) this.pricing = {};
    this.pricing.model = this.pricing_model;
  }

  // Sync use_cases ↔ primary_use_cases
  if (this.primary_use_cases?.length && !this.use_cases?.length) {
    this.use_cases = [...this.primary_use_cases];
  }
  if (this.use_cases?.length && !this.primary_use_cases?.length) {
    this.primary_use_cases = [...this.use_cases];
  }

  // Generate slug
  const nameForSlug = this.name || this.tool_name;
  if (nameForSlug && (!this.slug || this.isModified('name') || this.isModified('tool_name'))) {
    this.slug = slugify(nameForSlug, { lower: true, strict: true });
  }

  // Compute search_normalized for direct tool name fuzzy matching
  // Concatenate name + tool_name + aliases, lowercased, with spaces/hyphens removed.
  if (this.isModified('name') || this.isModified('tool_name') || this.isModified('aliases') || !this.search_normalized) {
    const parts = [this.name, this.tool_name, ...(this.aliases || [])]
      .filter(Boolean)
      .map((s) => String(s).toLowerCase().replace(/[\s\-_]+/g, '').trim());
    this.search_normalized = parts.join('|');
  }

  next();
});

// ── Text search index ─────────────────────────────────────────────────────────
toolSchema.index({
  name: 'text',
  shortDescription: 'text',
  description: 'text',
  tags: 'text',
  semantic_keywords: 'text',
  categories: 'text',
  capabilities: 'text',
  use_cases: 'text',
  features: 'text',
  aliases: 'text',
  tool_name: 'text',
});

// ── NEW: Compound indexes for capability-based queries ─────────────────────
toolSchema.index({ status: 1, capabilities: 1, trust_score: -1 });
toolSchema.index({ status: 1, use_cases: 1, popularity_score_v2: -1 });
toolSchema.index({ status: 1, category: 1, trust_score: -1, popularity_score_v2: -1 });
toolSchema.index({ status: 1, canonical_categories: 1, 'stats.rating': -1 });
toolSchema.index({ status: 1, name: 1 });
toolSchema.index({ status: 1, aliases: 1 });

const Tool = mongoose.model('Tool', toolSchema);
export default Tool;
