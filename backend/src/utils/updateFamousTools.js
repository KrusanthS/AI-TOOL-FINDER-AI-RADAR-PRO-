import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const famousTools = [
  {
    name: "Antigravity",
    slug: "antigravity-deepmind",
    category: "CODING / AUTONOMOUS AGENTS",
    shortDescription: "Advanced agentic coding assistant by Google DeepMind.",
    description: "Antigravity is a powerful agentic AI coding assistant designed by the Google DeepMind team working on Advanced Agentic Coding. It excels at autonomous programming, creating web applications, debugging codebases, and executing complex software engineering tasks with multi-step reasoning.",
    pricing: { model: "freemium" },
    links: { website: "https://deepmind.google" },
    tags: ["coding", "agent", "deepmind", "programming", "software", "developer", "autonomous"],
    features: ["Autonomous coding", "Pair programming", "Debugging", "Web development", "Multi-step reasoning"],
    source: "manual",
    status: "approved",
    stats: { rating: "5.0", ratingCount: 1500, views: 95000, weeklyViews: 12000 },
    aiMeta: {
      useCases: ["Autonomous code generation", "Debugging large codebases", "Building full-stack web applications", "Pair programming assistance"],
      summary: "The ultimate autonomous coding agent for developers."
    }
  },
  {
    name: "ChatGPT (OpenAI)",
    slug: "chatgpt-openai",
    category: "LARGE LANGUAGE MODELS / GENERAL AI ASSISTANTS",
    shortDescription: "General-purpose AI assistant for writing, coding, and analysis.",
    description: "ChatGPT is OpenAI's flagship language model. It is a highly versatile general-purpose assistant that excels at drafting emails, writing essays, summarizing documents, coding, logical reasoning, and creative writing.",
    pricing: { model: "freemium" },
    tags: ["writing", "coding", "analysis", "chat", "general", "assistant", "text"],
    source: "manual",
    status: "approved",
    stats: { rating: "4.9", ratingCount: 50000, views: 999999, weeklyViews: 50000 },
    aiMeta: {
      useCases: ["Content creation and writing", "Code generation and debugging", "Brainstorming and ideation", "Summarizing long documents"]
    }
  },
  {
    name: "Perplexity AI",
    slug: "perplexity-ai",
    category: "RESEARCH / SEARCH ENGINES",
    shortDescription: "AI-powered search engine providing accurate answers with citations.",
    description: "Perplexity AI is an advanced conversational search engine that browses the live web to provide accurate, up-to-date answers complete with verified citations and source links. Ideal for academic research, fact-checking, and news gathering.",
    pricing: { model: "freemium" },
    tags: ["search", "research", "citations", "web", "live", "fact-checking", "news"],
    source: "manual",
    status: "approved",
    stats: { rating: "4.8", ratingCount: 12000, views: 500000, weeklyViews: 45000 },
    aiMeta: {
      useCases: ["Academic and professional research", "Fact-checking real-time information", "Gathering news and live data", "Exploring complex topics with cited sources"]
    }
  },
  {
    name: "Gemini (Google)",
    slug: "gemini-google",
    category: "MULTIMODAL / GENERAL AI",
    shortDescription: "Google's most capable multimodal AI model.",
    description: "Gemini is Google's natively multimodal AI, capable of reasoning seamlessly across text, images, video, audio, and code. It integrates deeply with Google Workspace tools and provides real-time data access.",
    pricing: { model: "freemium" },
    tags: ["multimodal", "google", "vision", "video", "audio", "workspace", "reasoning"],
    source: "manual",
    status: "approved",
    stats: { rating: "4.7", ratingCount: 25000, views: 800000, weeklyViews: 40000 },
    aiMeta: {
      useCases: ["Analyzing videos and images", "Multimodal reasoning (audio+text+video)", "Google Workspace integration", "Advanced logical problem solving"]
    }
  }
];

const updateTools = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Updating famous tools...');
    
    for (const toolData of famousTools) {
      await Tool.findOneAndUpdate(
        { name: toolData.name },
        { $set: toolData },
        { upsert: true, new: true }
      );
      console.log(`Updated/Inserted: ${toolData.name}`);
    }

    console.log('Successfully updated famous tools!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating tools:', error);
    process.exit(1);
  }
};

updateTools();
