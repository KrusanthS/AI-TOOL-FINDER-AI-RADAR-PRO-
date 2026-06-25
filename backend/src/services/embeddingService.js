// backend/src/services/embeddingService.js
// Uses Gemini text-embedding-004 (768-dim) — fast API call, no local model loading

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

let genAI = null;
const getGenAI = () => {
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI;
};

const EMBED_MODEL = 'text-embedding-004'; // 768-dim, Gemini's best embedding model

export const generateEmbedding = async (text) => {
  try {
    const model = getGenAI().getGenerativeModel({ model: EMBED_MODEL });
    const result = await model.embedContent(text.slice(0, 2048)); // cap at 2048 chars
    return result.embedding.values; // float32 array, 768-dim
  } catch (error) {
    logger.error(`Gemini embedding error: ${error.message}`);
    throw error;
  }
};

export const generateBatchEmbeddings = async (texts) => {
  // Gemini supports batch embedding
  try {
    const model = getGenAI().getGenerativeModel({ model: EMBED_MODEL });
    const requests = texts.map(t => ({ content: { parts: [{ text: t.slice(0, 2048) }] } }));
    const result = await model.batchEmbedContents({ requests });
    return result.embeddings.map(e => e.values);
  } catch (error) {
    logger.warn(`Batch embedding failed, falling back to sequential: ${error.message}`);
    return Promise.all(texts.map(t => generateEmbedding(t)));
  }
};

export const createToolTextForEmbedding = (tool) => {
  const parts = [
    `Tool: ${tool.tool_name || tool.name}`,
    tool.long_description || tool.description || tool.shortDescription || '',
    `Category: ${(tool.categories || [tool.category]).filter(Boolean).join(', ')}`,
    `Use Cases: ${(tool.primary_use_cases || tool.aiMeta?.useCases || []).join(', ')}`,
    `Features: ${(tool.features || []).join(', ')}`,
    `Tags: ${(tool.tags || []).join(', ')}`,
    `Keywords: ${(tool.semantic_keywords || []).join(', ')}`,
    `Pricing: ${tool.pricing_type || tool.pricing?.model || ''}`,
  ];
  return parts.filter(p => p.trim()).join('. ');
};
