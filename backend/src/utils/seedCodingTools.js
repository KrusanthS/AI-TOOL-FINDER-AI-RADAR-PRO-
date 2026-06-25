import mongoose from 'mongoose';
import dotenv from 'dotenv';
import slugify from 'slugify';
import Tool from '../models/Tool.js';

dotenv.config({ path: new URL('../../.env', import.meta.url) });

const codingTools = [
  {
    name: 'Cursor',
    category: 'Coding',
    description: 'AI-first code editor that helps developers write, edit, debug, and understand code using natural language.',
    website_url: 'https://cursor.com',
    pricing_type: 'freemium',
    features: ['Code Generation', 'Code Refactoring', 'AI Chat'],
    tags: ['Coding', 'IDE', 'Developer Tools'],
  },
  {
    name: 'Windsurf',
    category: 'Coding',
    description: 'AI-native IDE designed to accelerate software development through autonomous coding assistance.',
    website_url: 'https://windsurf.com',
    pricing_type: 'freemium',
    features: ['AI Agent', 'Code Generation', 'Project Understanding'],
    tags: ['Coding', 'IDE', 'AI Development'],
  },
  {
    name: 'GitHub Copilot',
    category: 'Coding',
    description: 'AI coding assistant integrated into popular IDEs for code completion and software development.',
    website_url: 'https://github.com/features/copilot',
    pricing_type: 'paid',
    features: ['Code Completion', 'Code Suggestions', 'Chat Assistant'],
    tags: ['Coding', 'GitHub', 'Developer Tools'],
  },
  {
    name: 'Codeium',
    category: 'Coding',
    description: 'AI-powered coding assistant providing intelligent code completions and chat capabilities.',
    website_url: 'https://codeium.com',
    pricing_type: 'freemium',
    features: ['Code Completion', 'AI Chat', 'Code Search'],
    tags: ['Coding', 'Developer Tools', 'AI Assistant'],
  },
  {
    name: 'Amazon Q Developer',
    category: 'Coding',
    description: 'AWS-powered AI coding assistant for software development, cloud operations, and debugging.',
    website_url: 'https://aws.amazon.com/q/developer',
    pricing_type: 'freemium',
    features: ['Code Generation', 'AWS Integration', 'Debugging'],
    tags: ['Coding', 'AWS', 'Developer Tools'],
  },
  {
    name: 'Tabnine',
    category: 'Coding',
    description: 'AI code completion platform focused on privacy, security, and enterprise development.',
    website_url: 'https://www.tabnine.com',
    pricing_type: 'freemium',
    features: ['Code Completion', 'Private AI', 'Team Training'],
    tags: ['Coding', 'Enterprise', 'Developer Tools'],
  },
  {
    name: 'Sourcegraph Cody',
    category: 'Coding',
    description: 'AI coding assistant that understands large codebases and helps developers navigate projects.',
    website_url: 'https://sourcegraph.com/cody',
    pricing_type: 'freemium',
    features: ['Code Search', 'Code Generation', 'Repository Understanding'],
    tags: ['Coding', 'Code Search', 'Developer Tools'],
  },
  {
    name: 'Replit AI',
    category: 'Coding',
    description: "AI-powered coding assistant integrated into Replit's cloud development environment.",
    website_url: 'https://replit.com',
    pricing_type: 'freemium',
    features: ['Code Generation', 'Cloud IDE', 'Deployment'],
    tags: ['Coding', 'Cloud IDE', 'Development'],
  },
  {
    name: 'Bolt.new',
    category: 'Coding',
    description: 'Prompt-to-code platform that creates and deploys full-stack applications directly from natural language.',
    website_url: 'https://bolt.new',
    pricing_type: 'freemium',
    features: ['Full-Stack Development', 'Prompt-to-Code', 'Deployment'],
    tags: ['Coding', 'AI Development', 'Web Apps'],
  },
  {
    name: 'Continue',
    category: 'Coding',
    description: 'Open-source AI coding assistant for VS Code and JetBrains IDEs with customizable models.',
    website_url: 'https://continue.dev',
    pricing_type: 'free',
    features: ['Code Completion', 'Chat Assistant', 'Custom Models'],
    tags: ['Coding', 'Open Source', 'Developer Tools'],
  },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB...');

  let added = 0, skipped = 0;

  for (const tool of codingTools) {
    const slug = slugify(tool.name, { lower: true, strict: true });
    const exists = await Tool.findOne({ slug });
    if (exists) {
      console.log(`⏭  Skipped (exists): ${tool.name}`);
      skipped++;
      continue;
    }

    await Tool.create({
      name: tool.name,
      tool_name: tool.name,
      slug,
      category: tool.category,
      categories: [tool.category],
      description: tool.description,
      shortDescription: tool.description,
      short_description: tool.description,
      website_url: tool.website_url,
      links: { website: tool.website_url },
      pricing_type: tool.pricing_type,
      pricing: { model: tool.pricing_type },
      features: tool.features,
      tags: tool.tags,
      status: 'approved',
      source: 'manual',
      verified: true,
    });

    console.log(`✅ Added: ${tool.name}`);
    added++;
  }

  console.log(`\nDone! Added: ${added}, Skipped: ${skipped}`);
  await mongoose.disconnect();
};

seed().catch(err => { console.error(err); process.exit(1); });
