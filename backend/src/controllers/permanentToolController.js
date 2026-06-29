// backend/src/controllers/permanentToolController.js
// Admin CRUD controller for the PermanentTool collection.
// All functions delegate to permanentToolService for business logic.
// These routes are protected by requireAuth + requireAdmin middleware in admin.js.

import logger from '../utils/logger.js';
import {
  searchPermanentTools,
  getAllPermanentTools,
  getPermanentToolById,
  upsertPermanentTool,
  deletePermanentTool,
} from '../services/permanentToolService.js';

// ── Initial seed data (40 popular AI tools) ───────────────────────────────────
const SEED_TOOLS = [
  { name: 'ChatGPT', description: 'Conversational AI assistant by OpenAI. Understands and generates human-like text for a vast range of tasks.', short_description: 'OpenAI\'s leading conversational AI assistant.', category: 'Chat AI', website_url: 'https://chat.openai.com', logo_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/ChatGPT_logo.svg/240px-ChatGPT_logo.svg.png', pricing: 'Freemium', features: ['Conversational AI', 'Code generation', 'Summarization', 'Translation'], tags: ['openai', 'gpt', 'chatbot', 'llm'], platform: ['Web', 'iOS', 'Android', 'API'], popularity_score: 100, rating: 4.8 },
  { name: 'Claude', description: 'AI assistant by Anthropic, designed to be safe, helpful, and honest. Excellent for long documents, coding, and analysis.', short_description: 'Anthropic\'s safe and helpful AI assistant.', category: 'Chat AI', website_url: 'https://claude.ai', logo_url: '', pricing: 'Freemium', features: ['Long context window', 'Document analysis', 'Code generation', 'Creative writing'], tags: ['anthropic', 'llm', 'chatbot', 'ai-assistant'], platform: ['Web', 'API'], popularity_score: 95, rating: 4.7 },
  { name: 'Gemini', description: 'Google\'s multimodal AI model capable of text, images, audio, and code. Available as Gemini Flash and Gemini Pro.', short_description: 'Google\'s powerful multimodal AI model.', category: 'Chat AI', website_url: 'https://gemini.google.com', logo_url: '', pricing: 'Freemium', features: ['Multimodal input', 'Code generation', 'Image understanding', 'Real-time search'], tags: ['google', 'gemini', 'llm', 'multimodal'], platform: ['Web', 'iOS', 'Android', 'API'], popularity_score: 90, rating: 4.6 },
  { name: 'Midjourney', description: 'AI image generation tool that creates stunning, photorealistic and artistic images from text prompts via Discord.', short_description: 'Industry-leading AI image generation via Discord.', category: 'Image Generation', website_url: 'https://www.midjourney.com', logo_url: '', pricing: 'Paid', features: ['Text to image', 'High-resolution output', 'Style customization', 'Upscaling'], tags: ['image-generation', 'art', 'design', 'stable-diffusion'], platform: ['Web', 'Discord'], popularity_score: 92, rating: 4.8 },
  { name: 'DALL-E 3', description: 'OpenAI\'s latest image generation model with improved instruction following and photorealistic quality.', short_description: 'OpenAI\'s advanced text-to-image generation model.', category: 'Image Generation', website_url: 'https://openai.com/dall-e-3', logo_url: '', pricing: 'Paid', features: ['Text to image', 'Photorealistic images', 'High instruction fidelity', 'API access'], tags: ['openai', 'image-generation', 'dall-e', 'ai-art'], platform: ['Web', 'API'], popularity_score: 85, rating: 4.6 },
  { name: 'Stable Diffusion', description: 'Open-source AI image generation model by Stability AI. Can be run locally or via APIs.', short_description: 'Open-source AI image generation model.', category: 'Image Generation', website_url: 'https://stability.ai', logo_url: '', pricing: 'Open Source', features: ['Open source', 'Local deployment', 'Image generation', 'Fine-tuning'], tags: ['stable-diffusion', 'open-source', 'image-generation', 'local-ai'], platform: ['Desktop', 'API', 'Web'], popularity_score: 82, rating: 4.4 },
  { name: 'GitHub Copilot', description: 'AI-powered code completion and pair programmer by GitHub and OpenAI. Supports dozens of programming languages.', short_description: 'AI pair programmer integrated into your IDE.', category: 'Coding', website_url: 'https://github.com/features/copilot', logo_url: '', pricing: 'Paid', features: ['Code completion', 'Code generation', 'Multi-language support', 'IDE integration'], tags: ['coding', 'github', 'code-completion', 'developer-tools'], platform: ['Desktop', 'Web', 'VS Code', 'JetBrains'], popularity_score: 93, rating: 4.7 },
  { name: 'Cursor', description: 'AI-native code editor built on VS Code with deep AI integration for code generation, refactoring, and understanding.', short_description: 'The AI-first code editor for productive development.', category: 'Coding', website_url: 'https://cursor.sh', logo_url: '', pricing: 'Freemium', features: ['AI code generation', 'Codebase chat', 'Refactoring', 'Multi-file edits'], tags: ['coding', 'code-editor', 'ai-coding', 'developer-tools'], platform: ['Desktop'], popularity_score: 88, rating: 4.8 },
  { name: 'Copilot (Microsoft)', description: 'Microsoft\'s AI assistant powered by GPT-4, integrated across Microsoft 365 apps, Windows, and Bing.', short_description: 'Microsoft\'s AI assistant across all their products.', category: 'Productivity', website_url: 'https://copilot.microsoft.com', logo_url: '', pricing: 'Freemium', features: ['Document creation', 'Email drafting', 'Spreadsheet analysis', 'Presentation generation'], tags: ['microsoft', 'productivity', 'office', 'llm'], platform: ['Web', 'Desktop', 'Windows'], popularity_score: 87, rating: 4.5 },
  { name: 'Notion AI', description: 'AI writing and productivity assistant built directly into Notion. Helps draft content, summarize notes, and manage tasks.', short_description: 'AI writing assistant built into Notion.', category: 'Productivity', website_url: 'https://notion.so/product/ai', logo_url: '', pricing: 'Paid', features: ['Writing assistance', 'Summarization', 'Action items extraction', 'Q&A on documents'], tags: ['notion', 'productivity', 'writing', 'notes'], platform: ['Web', 'iOS', 'Android', 'Desktop'], popularity_score: 80, rating: 4.5 },
  { name: 'Grammarly', description: 'AI writing assistant that checks grammar, spelling, tone, and style across any web application.', short_description: 'AI-powered grammar and writing assistant.', category: 'Writing', website_url: 'https://www.grammarly.com', logo_url: '', pricing: 'Freemium', features: ['Grammar checking', 'Tone detection', 'Plagiarism check', 'Style suggestions'], tags: ['writing', 'grammar', 'editing', 'productivity'], platform: ['Web', 'Desktop', 'iOS', 'Android', 'Browser Extension'], popularity_score: 88, rating: 4.6 },
  { name: 'Jasper', description: 'AI content creation platform for marketing teams. Generates blog posts, ads, emails, and social media content.', short_description: 'AI writing platform for marketing and content teams.', category: 'Writing', website_url: 'https://www.jasper.ai', logo_url: '', pricing: 'Paid', features: ['Blog writing', 'Ad copy', 'Email marketing', 'Brand voice'], tags: ['writing', 'marketing', 'content-creation', 'copywriting'], platform: ['Web'], popularity_score: 78, rating: 4.4 },
  { name: 'Copy.ai', description: 'AI-powered copywriting tool that generates marketing copy, emails, product descriptions, and blog content.', short_description: 'AI copywriting tool for marketing content.', category: 'Writing', website_url: 'https://www.copy.ai', logo_url: '', pricing: 'Freemium', features: ['Ad copy', 'Email templates', 'Product descriptions', 'Social media posts'], tags: ['writing', 'copywriting', 'marketing', 'ai-content'], platform: ['Web'], popularity_score: 75, rating: 4.3 },
  { name: 'Runway', description: 'AI creative studio for video generation, editing, and visual effects. Used by filmmakers and content creators.', short_description: 'AI-powered video generation and editing platform.', category: 'Video AI', website_url: 'https://runwayml.com', logo_url: '', pricing: 'Freemium', features: ['Video generation', 'Green screen removal', 'Video editing', 'AI visual effects'], tags: ['video', 'video-generation', 'creative', 'filmmaking'], platform: ['Web'], popularity_score: 82, rating: 4.5 },
  { name: 'Pika Labs', description: 'AI video generation platform that creates and edits high-quality videos from text and image prompts.', short_description: 'AI video generation from text and images.', category: 'Video AI', website_url: 'https://pika.art', logo_url: '', pricing: 'Freemium', features: ['Text to video', 'Image to video', 'Video editing', 'Animation'], tags: ['video-generation', 'ai-video', 'text-to-video'], platform: ['Web'], popularity_score: 78, rating: 4.4 },
  { name: 'Sora', description: 'OpenAI\'s text-to-video AI model capable of generating realistic, high-quality videos up to a minute long.', short_description: 'OpenAI\'s advanced text-to-video generation model.', category: 'Video AI', website_url: 'https://sora.com', logo_url: '', pricing: 'Paid', features: ['Text to video', 'High-quality output', 'Long-form video', 'Consistent characters'], tags: ['openai', 'video-generation', 'sora', 'ai-video'], platform: ['Web'], popularity_score: 85, rating: 4.6 },
  { name: 'ElevenLabs', description: 'AI voice synthesis platform that creates ultra-realistic human voices for content creators, developers, and enterprises.', short_description: 'Ultra-realistic AI voice synthesis and cloning.', category: 'Audio AI', website_url: 'https://elevenlabs.io', logo_url: '', pricing: 'Freemium', features: ['Voice cloning', 'Text to speech', 'Multilingual support', 'API access'], tags: ['audio', 'voice', 'tts', 'voice-cloning'], platform: ['Web', 'API'], popularity_score: 85, rating: 4.7 },
  { name: 'Murf AI', description: 'AI voiceover studio for creating professional-quality voiceovers for videos, podcasts, and presentations.', short_description: 'AI voiceover studio for professional content.', category: 'Audio AI', website_url: 'https://murf.ai', logo_url: '', pricing: 'Freemium', features: ['Text to speech', 'Voice customization', 'Video voiceover', '120+ voices'], tags: ['audio', 'voiceover', 'tts', 'voice'], platform: ['Web'], popularity_score: 72, rating: 4.4 },
  { name: 'Udio', description: 'AI music generation platform that creates full songs with lyrics, vocals, and instrumentation from text prompts.', short_description: 'AI music generation from text prompts.', category: 'Audio AI', website_url: 'https://www.udio.com', logo_url: '', pricing: 'Freemium', features: ['Music generation', 'Lyrics generation', 'Custom genres', 'Full song output'], tags: ['music', 'audio', 'music-generation', 'ai-music'], platform: ['Web'], popularity_score: 74, rating: 4.3 },
  { name: 'Perplexity AI', description: 'AI-powered search engine that provides cited answers to questions with real-time web search.', short_description: 'AI search engine with cited, real-time answers.', category: 'Research', website_url: 'https://www.perplexity.ai', logo_url: '', pricing: 'Freemium', features: ['Real-time web search', 'Cited answers', 'Follow-up questions', 'File uploads'], tags: ['search', 'research', 'ai-search', 'citations'], platform: ['Web', 'iOS', 'Android', 'API'], popularity_score: 87, rating: 4.7 },
  { name: 'Elicit', description: 'AI research assistant that finds and summarizes academic papers, extracts data, and synthesizes literature reviews.', short_description: 'AI research assistant for academic literature.', category: 'Research', website_url: 'https://elicit.com', logo_url: '', pricing: 'Freemium', features: ['Paper search', 'Literature review', 'Data extraction', 'Summarization'], tags: ['research', 'academic', 'papers', 'literature-review'], platform: ['Web'], popularity_score: 70, rating: 4.5 },
  { name: 'Consensus', description: 'AI-powered search engine that finds scientific consensus from academic papers and research.', short_description: 'AI search for scientific consensus in research.', category: 'Research', website_url: 'https://consensus.app', logo_url: '', pricing: 'Freemium', features: ['Scientific search', 'Consensus extraction', 'Paper summaries', 'Citation support'], tags: ['research', 'science', 'academic', 'evidence-based'], platform: ['Web'], popularity_score: 65, rating: 4.4 },
  { name: 'Canva AI', description: 'Graphic design platform with integrated AI tools for image generation, background removal, and design suggestions.', short_description: 'AI-enhanced graphic design platform.', category: 'Design', website_url: 'https://www.canva.com', logo_url: '', pricing: 'Freemium', features: ['AI image generation', 'Background removal', 'Design templates', 'Magic resize'], tags: ['design', 'graphic-design', 'image-editing', 'presentation'], platform: ['Web', 'iOS', 'Android', 'Desktop'], popularity_score: 90, rating: 4.7 },
  { name: 'Adobe Firefly', description: 'Adobe\'s AI creative tools including text-to-image generation, generative fill, and vector recoloring.', short_description: 'Adobe\'s family of creative AI generation tools.', category: 'Design', website_url: 'https://firefly.adobe.com', logo_url: '', pricing: 'Freemium', features: ['Text to image', 'Generative fill', 'Vector recoloring', 'Adobe integration'], tags: ['design', 'adobe', 'image-generation', 'creative'], platform: ['Web', 'Desktop'], popularity_score: 82, rating: 4.5 },
  { name: 'Framer AI', description: 'AI-powered website builder that generates complete, responsive websites from text prompts.', short_description: 'AI website builder that generates sites from text.', category: 'Design', website_url: 'https://www.framer.com', logo_url: '', pricing: 'Freemium', features: ['AI website generation', 'Responsive design', 'CMS integration', 'Component library'], tags: ['design', 'website-builder', 'web-design', 'no-code'], platform: ['Web'], popularity_score: 75, rating: 4.5 },
  { name: 'n8n', description: 'Open-source workflow automation platform with AI capabilities for connecting apps and automating workflows.', short_description: 'Open-source workflow automation with AI features.', category: 'Automation', website_url: 'https://n8n.io', logo_url: '', pricing: 'Open Source', features: ['Workflow automation', 'AI integrations', 'Self-hosting', '400+ integrations'], tags: ['automation', 'workflow', 'no-code', 'open-source'], platform: ['Web', 'Desktop', 'Self-hosted'], popularity_score: 78, rating: 4.6 },
  { name: 'Zapier', description: 'Workflow automation platform that connects 6,000+ apps including many AI tools to automate repetitive tasks.', short_description: 'Automation platform connecting thousands of apps.', category: 'Automation', website_url: 'https://zapier.com', logo_url: '', pricing: 'Freemium', features: ['App integration', 'Workflow automation', 'AI actions', '6000+ apps'], tags: ['automation', 'workflow', 'no-code', 'integration'], platform: ['Web'], popularity_score: 85, rating: 4.5 },
  { name: 'Make', description: 'Visual automation platform (formerly Integromat) for building complex automated workflows with AI capabilities.', short_description: 'Visual workflow automation for complex scenarios.', category: 'Automation', website_url: 'https://www.make.com', logo_url: '', pricing: 'Freemium', features: ['Visual workflow builder', 'AI modules', 'Data transformation', '1000+ apps'], tags: ['automation', 'workflow', 'integration', 'visual-builder'], platform: ['Web'], popularity_score: 77, rating: 4.4 },
  { name: 'HubSpot AI', description: 'AI-powered CRM and marketing platform with tools for content creation, email, and customer engagement.', short_description: 'AI features in HubSpot\'s CRM and marketing platform.', category: 'Marketing', website_url: 'https://www.hubspot.com/artificial-intelligence', logo_url: '', pricing: 'Freemium', features: ['AI content generation', 'Email personalization', 'Lead scoring', 'Chatbots'], tags: ['marketing', 'crm', 'automation', 'content'], platform: ['Web', 'iOS', 'Android'], popularity_score: 80, rating: 4.4 },
  { name: 'Surfer SEO', description: 'AI-powered SEO content optimization platform that analyzes top-ranking pages and provides content recommendations.', short_description: 'AI SEO optimization for content creation.', category: 'Marketing', website_url: 'https://surferseo.com', logo_url: '', pricing: 'Paid', features: ['Content optimization', 'Keyword research', 'SERP analysis', 'AI writing'], tags: ['seo', 'marketing', 'content', 'writing'], platform: ['Web', 'Browser Extension'], popularity_score: 75, rating: 4.5 },
  { name: 'Llama 3', description: 'Meta\'s open-source large language model, available for local deployment and commercial use.', short_description: 'Meta\'s powerful open-source LLM.', category: 'LLMs', website_url: 'https://llama.meta.com', logo_url: '', pricing: 'Open Source', features: ['Open source', 'Local deployment', 'Fine-tuning', 'Commercial use'], tags: ['llm', 'open-source', 'meta', 'local-ai'], platform: ['API', 'Self-hosted'], popularity_score: 85, rating: 4.5 },
  { name: 'Mistral', description: 'Efficient open-source language models by Mistral AI, known for strong performance relative to model size.', short_description: 'Efficient open-source LLMs by Mistral AI.', category: 'LLMs', website_url: 'https://mistral.ai', logo_url: '', pricing: 'Open Source', features: ['Open source', 'Efficient inference', 'API access', 'Fine-tuning'], tags: ['llm', 'open-source', 'efficient', 'api'], platform: ['API', 'Self-hosted'], popularity_score: 78, rating: 4.4 },
  { name: 'Cohere', description: 'Enterprise AI platform providing language models, embeddings, and retrieval tools for businesses.', short_description: 'Enterprise NLP and language model platform.', category: 'LLMs', website_url: 'https://cohere.com', logo_url: '', pricing: 'Freemium', features: ['Text generation', 'Embeddings', 'Reranking', 'RAG support'], tags: ['llm', 'enterprise', 'embeddings', 'nlp'], platform: ['API'], popularity_score: 72, rating: 4.3 },
  { name: 'Khanmigo', description: 'Khan Academy\'s AI tutor powered by GPT-4, designed to help students learn through Socratic questioning.', short_description: 'AI tutor by Khan Academy for student learning.', category: 'Education', website_url: 'https://www.khanacademy.org/khan-labs', logo_url: '', pricing: 'Freemium', features: ['Tutoring', 'Homework help', 'Math solving', 'Writing feedback'], tags: ['education', 'tutoring', 'students', 'learning'], platform: ['Web'], popularity_score: 72, rating: 4.5 },
  { name: 'Duolingo Max', description: 'Duolingo\'s AI-powered language learning features using GPT-4 for roleplay conversations and explanation exercises.', short_description: 'AI-powered language learning with GPT-4 integration.', category: 'Education', website_url: 'https://www.duolingo.com', logo_url: '', pricing: 'Paid', features: ['Roleplay conversations', 'Grammar explanations', 'AI feedback', 'Language learning'], tags: ['education', 'language-learning', 'duolingo', 'ai-tutoring'], platform: ['iOS', 'Android', 'Web'], popularity_score: 82, rating: 4.6 },
  { name: 'Synthesia', description: 'AI video generation platform for creating professional training and communication videos with AI avatars.', short_description: 'AI video generation with realistic avatars.', category: 'Video AI', website_url: 'https://www.synthesia.io', logo_url: '', pricing: 'Paid', features: ['AI avatars', 'Text to video', 'Multiple languages', 'Custom avatars'], tags: ['video', 'avatars', 'training', 'corporate'], platform: ['Web'], popularity_score: 78, rating: 4.5 },
  { name: 'Descript', description: 'AI-powered audio and video editing tool with transcription, overdub, and filler word removal capabilities.', short_description: 'AI audio and video editor with transcription.', category: 'Audio AI', website_url: 'https://www.descript.com', logo_url: '', pricing: 'Freemium', features: ['Transcription', 'Audio editing', 'Video editing', 'Overdub'], tags: ['audio', 'video', 'transcription', 'editing', 'podcast'], platform: ['Desktop', 'Web'], popularity_score: 74, rating: 4.4 },
  { name: 'Pinecone', description: 'Vector database for AI applications, enabling fast similarity search at scale for RAG pipelines and embeddings.', short_description: 'Managed vector database for AI and ML applications.', category: 'Data', website_url: 'https://www.pinecone.io', logo_url: '', pricing: 'Freemium', features: ['Vector search', 'RAG support', 'Managed service', 'Scalable indexing'], tags: ['vector-db', 'embeddings', 'rag', 'database', 'ai-infrastructure'], platform: ['API', 'Cloud'], popularity_score: 76, rating: 4.5 },
  { name: 'Replit', description: 'Online IDE with AI coding assistance (Replit AI) for building, running, and deploying code directly in the browser.', short_description: 'Browser-based IDE with integrated AI coding tools.', category: 'Coding', website_url: 'https://replit.com', logo_url: '', pricing: 'Freemium', features: ['Online IDE', 'AI code generation', 'Deployment', 'Collaboration'], tags: ['coding', 'ide', 'web-development', 'collaboration'], platform: ['Web', 'iOS', 'Android'], popularity_score: 80, rating: 4.4 },
  { name: 'Vercel v0', description: 'Generative UI tool by Vercel that creates React components and full UI designs from text prompts.', short_description: 'AI-powered React UI generation by Vercel.', category: 'Coding', website_url: 'https://v0.dev', logo_url: '', pricing: 'Freemium', features: ['UI generation', 'React components', 'Shadcn/ui', 'Copy-paste code'], tags: ['coding', 'ui', 'react', 'frontend', 'design'], platform: ['Web'], popularity_score: 78, rating: 4.5 },
];

// ── GET /api/admin/permanent-tools ────────────────────────────────────────────
// List all permanent tools with optional search, category filter, and pagination.
export const listPermanentTools = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      search,
    } = req.query;

    const result = await getAllPermanentTools({
      page: Number(page),
      limit: Math.min(Number(limit), 200),
      category: category || undefined,
      search: search || undefined,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error(`listPermanentTools error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── GET /api/admin/permanent-tools/:id ────────────────────────────────────────
export const getPermanentTool = async (req, res) => {
  try {
    const tool = await getPermanentToolById(req.params.id);
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });
    res.json({ success: true, tool });
  } catch (error) {
    logger.error(`getPermanentTool error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── POST /api/admin/permanent-tools ───────────────────────────────────────────
// Create or update (upsert) a permanent tool. Safe against duplicates.
export const createPermanentTool = async (req, res) => {
  try {
    const { tool, action } = await upsertPermanentTool(req.body);
    res.status(action === 'inserted' ? 201 : 200).json({
      success: true,
      action,
      tool,
    });
  } catch (error) {
    logger.error(`createPermanentTool error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ── PUT /api/admin/permanent-tools/:id ────────────────────────────────────────
export const updatePermanentTool = async (req, res) => {
  try {
    const { tool, action } = await upsertPermanentTool({ ...req.body, _id: req.params.id });
    if (!tool) return res.status(404).json({ success: false, error: 'Tool not found' });
    res.json({ success: true, action, tool });
  } catch (error) {
    logger.error(`updatePermanentTool error: ${error.message}`);
    res.status(400).json({ success: false, error: error.message });
  }
};

// ── DELETE /api/admin/permanent-tools/:id ─────────────────────────────────────
export const removePermanentTool = async (req, res) => {
  try {
    const deleted = await deletePermanentTool(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, error: 'Tool not found' });
    res.json({ success: true, message: 'Permanent tool deleted' });
  } catch (error) {
    logger.error(`removePermanentTool error: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ── POST /api/admin/permanent-tools/seed ─────────────────────────────────────
// Idempotent seed: inserts only tools not already in the collection.
// Safe to call multiple times — never creates duplicates.
export const seedPermanentToolsHandler = async (req, res) => {
  const results = { inserted: 0, updated: 0, skipped: 0, errors: [] };

  for (const toolData of SEED_TOOLS) {
    try {
      const { action } = await upsertPermanentTool(toolData);
      if (action === 'inserted') results.inserted++;
      else if (action === 'updated') results.updated++;
      else results.skipped++;
    } catch (error) {
      logger.error(`Seed error for ${toolData.name}: ${error.message}`);
      results.errors.push({ name: toolData.name, error: error.message });
    }
  }

  logger.info(`Seed complete — inserted: ${results.inserted}, updated: ${results.updated}, skipped: ${results.skipped}`);
  res.json({
    success: true,
    message: `Seed complete. Inserted: ${results.inserted}, Updated: ${results.updated}, Skipped: ${results.skipped}`,
    ...results,
  });
};
