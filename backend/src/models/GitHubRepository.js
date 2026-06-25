import mongoose from 'mongoose';
import slugify from 'slugify';

const githubRepoSchema = new mongoose.Schema({
  repository_name: { type: String, required: true, trim: true, index: true },
  slug: { type: String, unique: true, index: true },
  repository_url: { type: String, required: true, trim: true },
  owner_name: { type: String, trim: true },
  description: { type: String, trim: true },
  stars: { type: Number, default: 0, index: true },
  forks: { type: Number, default: 0, index: true },
  language: { type: String, trim: true, index: true },
  license: { type: String, trim: true },
  open_source: { type: Boolean, default: true },
  last_updated: { type: Date, index: true },
  topics: { type: [String], index: true },
  category: { type: String, trim: true, index: true },
  readme_summary: { type: String, trim: true },
  installation_guide: { type: String, trim: true },
  source: { type: String, default: 'github-repo' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
    index: true,
  },
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
});

githubRepoSchema.pre('save', function (next) {
  if (!this.slug && this.repository_name) {
    this.slug = slugify(this.repository_name, { lower: true, strict: true });
  }
  next();
});

githubRepoSchema.index({
  repository_name: 'text',
  description: 'text',
  topics: 'text',
  readme_summary: 'text',
  installation_guide: 'text',
});

const GitHubRepository = mongoose.model('GitHubRepository', githubRepoSchema);
export default GitHubRepository;
