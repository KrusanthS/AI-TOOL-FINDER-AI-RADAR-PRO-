// backend/src/services/aiSearchService.js
// Semantic search: Gemini (primary) → Groq (fallback) → Pinecone vector search

import { Pinecone } from '@pinecone-database/pinecone';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import { generateEmbedding, createToolTextForEmbedding } from './embeddingService.js';
import logger from '../utils/logger.js';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';
const INDEX_NAME   = 'ai-tools';

let pc     = null;
let genAI  = null;
let groq   = null;

const getPc    = () => { if (!pc)    pc    = new Pinecone({ apiKey: process.env.PINECONE_API_KEY }); return pc; };
const getGenAI = () => { if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);    return genAI; };
const getGroq  = () => { if (!groq)  groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });        return groq; };

// ── LLM JSON helper with fallback ─────────────────────────────────────────────
async function llmJSON(prompt, preferGemini = true) {
  // Try Gemini first
  if (preferGemini && process.env.GEMINI_API_KEY?.length > 20) {
    try {
      const model = getGenAI().getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      });
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (e) {
      if (e.status === 429 || e.message?.includes('Too Many Requests')) {
        logger.warn('Gemini rate-limited, falling back to Groq');
      } else {
        logger.warn(`Gemini error: ${e.message}`);
      }
    }
  }
  // Fallback to Groq
  if (process.env.GROQ_API_KEY?.length > 10) {
    try {
      const client = getGroq();
      const completion = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: 'Return only valid JSON.' }, { role: 'user', content: prompt }],
        temperature: 0,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      logger.warn(`Groq fallback error: ${e.message}`);
    }
  }
  throw new Error('All LLM providers failed');
}

// ── Sync tool to Pinecone ──────────────────────────────────────────────────────
export const syncToolToVectorDB = async (tool) => {
  try {
    if (!process.env.PINECONE_API_KEY || !process.env.GEMINI_API_KEY) return;
    const index = getPc().index(INDEX_NAME);
    const text  = tool.embedding_text || createToolTextForEmbedding(tool);
    const embedding = await generateEmbedding(text);

    await index.upsert([{
      id: tool._id.toString(),
      values: embedding,
      metadata: {
        tool_name:        tool.tool_name || tool.name,
        categories:       (tool.categories || []).join(','),
        primary_use_cases:(tool.primary_use_cases || []).join(','),
        automation_level: tool.automation_level || 'unknown',
        pricing_type:     tool.pricing_type || tool.pricing?.model || 'unknown',
      },
    }]);
    return embedding;
  } catch (error) {
    logger.error(`Pinecone sync error: ${error.message}`);
    throw error;
  }
};

export const deleteToolFromVectorDB = async (toolId) => {
  try {
    if (!process.env.PINECONE_API_KEY) return;
    await getPc().index(INDEX_NAME).deleteOne(toolId.toString());
  } catch (error) {
    logger.error(`Pinecone delete error: ${error.message}`);
  }
};

// ── Main semantic search ───────────────────────────────────────────────────────
export const searchAITools = async (query, dbToolsQueryFn) => {
  if (!process.env.PINECONE_API_KEY) {
    throw new Error('Missing PINECONE_API_KEY');
  }

  // STEP 1: Intent analysis (with fallback)
  const intentData = await llmJSON(`Analyze this AI tool search query and return JSON:
{
  "intent": "what user wants",
  "workflow": "expected workflow",
  "required_capabilities": ["cap1","cap2"],
  "pricing_preference": "free|freemium|paid|any",
  "automation_need": "none|partial|full|agentic",
  "rejected_categories": ["unrelated categories"]
}
Query: "${query}"`);

  logger.info(`Intent: ${JSON.stringify(intentData)}`);

  // STEP 2: Embed query
  const hybridQuery = `${query}. Intent: ${intentData.intent}. Workflow: ${intentData.workflow}. Capabilities: ${(intentData.required_capabilities || []).join(', ')}`;
  const queryEmbedding = await generateEmbedding(hybridQuery);

  // STEP 3: Pinecone vector search
  const queryResponse = await getPc().index(INDEX_NAME).query({
    vector: queryEmbedding,
    topK: 20,
    includeMetadata: true,
  });

  const toolIds = queryResponse.matches.map(m => m.id);
  if (!toolIds.length) return [];

  // STEP 4: Fetch from DB + pre-filter
  let dbTools = (await dbToolsQueryFn(toolIds)).map(t => t.toObject ? t.toObject() : t);
  if (intentData.rejected_categories?.length) {
    dbTools = dbTools.filter(t => {
      const cats = (t.categories || [t.category] || []).join(' ').toLowerCase();
      return !intentData.rejected_categories.some(r => cats.includes(r.toLowerCase()));
    });
  }
  if (!dbTools.length) return [];

  // STEP 5: Rerank (with fallback)
  const toolsCtx = dbTools.map(t =>
    `ID:${t._id} | ${t.tool_name||t.name} | ${(t.categories||[]).join(',')} | ${(t.primary_use_cases||t.aiMeta?.useCases||[]).join(',')} | ${t.pricing_type||t.pricing?.model||''}`
  ).join('\n');

  let ranked = [];
  try {
    const rankData = await llmJSON(`You are an AI tool recommendation engine.
User query: "${query}"
Intent: ${JSON.stringify(intentData)}

Rank ONLY the best matching tools (max 6). Discard unrelated ones.
${toolsCtx}

Return JSON array: [{"toolId":"id","explanation":"why it matches","relevance_score":85}]`);
    ranked = Array.isArray(rankData) ? rankData : Object.values(rankData).find(Array.isArray) || [];
    ranked.sort((a, b) => b.relevance_score - a.relevance_score);
  } catch (e) {
    logger.warn(`Reranking failed, using vector order: ${e.message}`);
    ranked = dbTools.map((t, i) => ({ toolId: t._id.toString(), explanation: 'Semantic match', relevance_score: 100 - i * 5 }));
  }

  const final = ranked.map(r => {
    const tool = dbTools.find(t => t._id.toString() === r.toolId);
    if (!tool) return null;
    return { ...tool, explanation: r.explanation, relevance_score: r.relevance_score };
  }).filter(Boolean);

  return final.length ? final : dbTools.slice(0, 6);
};