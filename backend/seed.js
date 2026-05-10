import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from './src/models/Tool.js';
import logger from './src/utils/logger.js';

dotenv.config();

const toolsToSeed = [
  {
    name: 'ChatGPT',
    shortDescription: 'Conversational AI for virtually any task.',
    description: 'ChatGPT is a large language model-based chatbot developed by OpenAI. It is capable of generating human-like text based on context and past conversations.',
    category: 'Chat',
    pricing: { model: 'freemium', plans: [{ name: 'Free', price: '0', features: ['GPT-3.5'] }, { name: 'Plus', price: '20', features: ['GPT-4'] }] },
    links: { website: 'https://chat.openai.com' },
    status: 'approved',
    stats: { rating: 4.8, ratingCount: 2341, views: 45000, saves: 8900 },
    tags: ['chat', 'gpt', 'writing', 'coding'],
    verified: true,
  },
  {
    name: 'Midjourney',
    shortDescription: 'Generate stunning AI art from text prompts.',
    description: 'Midjourney is a generative artificial intelligence program and service created and hosted by San Francisco-based independent research lab Midjourney, Inc. Midjourney generates images from natural language descriptions, called "prompts".',
    category: 'Image',
    pricing: { model: 'paid', plans: [{ name: 'Basic', price: '10', features: ['Fast GPU Time'] }] },
    links: { website: 'https://www.midjourney.com' },
    status: 'approved',
    stats: { rating: 4.9, ratingCount: 1820, views: 30000, saves: 7200 },
    tags: ['image', 'art', 'diffusion'],
    verified: true,
  },
  {
    name: 'GitHub Copilot',
    shortDescription: 'Your AI pair programmer.',
    description: 'GitHub Copilot is an artificial intelligence tool developed by GitHub and OpenAI to assist users of Visual Studio Code, Visual Studio, Neovim, and JetBrains integrated development environments by autocompleting code.',
    category: 'Coding',
    pricing: { model: 'paid', plans: [{ name: 'Individual', price: '10', features: ['Autocomplete'] }] },
    links: { website: 'https://github.com/features/copilot' },
    status: 'approved',
    stats: { rating: 4.7, ratingCount: 3100, views: 50000, saves: 5600 },
    tags: ['coding', 'autocomplete', 'ide'],
    verified: true,
  },
  {
    name: 'Notion AI',
    shortDescription: 'AI writing and thinking assistant built directly into Notion.',
    description: 'Notion AI is a connected assistant that helps you think bigger, work faster, and augment your creativity right where you already work.',
    category: 'Productivity',
    pricing: { model: 'freemium' },
    links: { website: 'https://www.notion.so/product/ai' },
    status: 'approved',
    stats: { rating: 4.5, ratingCount: 890, views: 12000, saves: 3200 },
    tags: ['notes', 'writing', 'productivity'],
    verified: true,
  },
  {
    name: 'Runway',
    shortDescription: 'AI-powered video generation and editing.',
    description: 'Runway is an applied AI research company shaping the next era of art, entertainment and human creativity. They build AI tools that empower anyone to create video and image content.',
    category: 'Video',
    pricing: { model: 'freemium' },
    links: { website: 'https://runwayml.com' },
    status: 'approved',
    stats: { rating: 4.6, ratingCount: 670, views: 15000, saves: 2800 },
    tags: ['video', 'generation', 'editing'],
    verified: false,
  },
  {
    name: 'ElevenLabs',
    shortDescription: 'Ultra-realistic AI voice generation.',
    description: 'ElevenLabs is an artificial intelligence audio research company that develops AI voice synthesis software. It is known for its highly realistic text-to-speech tools.',
    category: 'Audio',
    pricing: { model: 'freemium' },
    links: { website: 'https://elevenlabs.io' },
    status: 'approved',
    stats: { rating: 4.8, ratingCount: 1230, views: 25000, saves: 4100 },
    tags: ['voice', 'tts', 'cloning'],
    verified: true,
  },
  {
    name: 'Claude',
    shortDescription: 'Anthropic\'s powerful AI assistant.',
    description: 'Claude is a next-generation AI assistant based on Anthropic’s research into training helpful, honest, and harmless AI systems. Accessible through chat interface and API.',
    category: 'Chat',
    pricing: { model: 'freemium' },
    links: { website: 'https://claude.ai' },
    status: 'approved',
    stats: { rating: 4.7, ratingCount: 1560, views: 35000, saves: 4700 },
    tags: ['chat', 'analysis', 'writing'],
    verified: true,
  },
  {
    name: 'Jasper',
    shortDescription: 'AI marketing copy and content creation.',
    description: 'Jasper is the AI Content Platform that helps you and your team break through creative blocks to create amazing, original content 10X faster.',
    category: 'Writing',
    pricing: { model: 'paid' },
    links: { website: 'https://www.jasper.ai' },
    status: 'approved',
    stats: { rating: 4.4, ratingCount: 720, views: 10000, saves: 2100 },
    tags: ['marketing', 'copy', 'content'],
    verified: false,
  },
  {
    name: 'Perplexity AI',
    shortDescription: 'AI-powered search engine that cites sources.',
    description: 'Perplexity AI is an AI-powered search engine and conversational answer engine that provides accurate answers to complex questions, backed by web sources.',
    category: 'Research',
    pricing: { model: 'freemium' },
    links: { website: 'https://www.perplexity.ai' },
    status: 'approved',
    stats: { rating: 4.6, ratingCount: 980, views: 22000, saves: 3400 },
    tags: ['search', 'research', 'citations'],
    verified: true,
  },
  {
    name: 'Stable Diffusion',
    shortDescription: 'Open-source image generation model.',
    description: 'Stable Diffusion is a deep learning, text-to-image model released in 2022. It is primarily used to generate detailed images conditioned on text descriptions.',
    category: 'Image',
    pricing: { model: 'free' },
    links: { website: 'https://stability.ai' },
    status: 'approved',
    stats: { rating: 4.5, ratingCount: 2800, views: 60000, saves: 9100 },
    tags: ['image', 'open-source', 'local'],
    verified: true,
  },
  {
    name: 'Grammarly',
    shortDescription: 'AI writing assistant for grammar and style.',
    description: 'Grammarly is a cloud-based typing assistant that reviews spelling, grammar, punctuation, clarity, engagement, and delivery mistakes in English texts.',
    category: 'Writing',
    pricing: { model: 'freemium' },
    links: { website: 'https://www.grammarly.com' },
    status: 'approved',
    stats: { rating: 4.6, ratingCount: 5100, views: 80000, saves: 11200 },
    tags: ['grammar', 'writing', 'editing'],
    verified: true,
  },
  {
    name: 'Synthesia',
    shortDescription: 'Create professional AI videos with virtual presenters.',
    description: 'Synthesia is an AI video generation platform that allows you to create videos with AI avatars and voices in over 120 languages without cameras, microphones or studios.',
    category: 'Video',
    pricing: { model: 'paid' },
    links: { website: 'https://www.synthesia.io' },
    status: 'approved',
    stats: { rating: 4.5, ratingCount: 540, views: 8000, saves: 1800 },
    tags: ['video', 'avatar', 'presentation'],
    verified: false,
  }
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/airadar');
    logger.info('MongoDB connected for seeding...');
    
    await Tool.deleteMany({});
    logger.info('Cleared existing tools.');

    // Add slugs
    const seededTools = toolsToSeed.map(t => ({
      ...t,
      slug: t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
    }));

    await Tool.insertMany(seededTools);
    logger.info('Successfully seeded tools into DB.');
    process.exit(0);
  } catch (error) {
    logger.error(`Seed error: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
