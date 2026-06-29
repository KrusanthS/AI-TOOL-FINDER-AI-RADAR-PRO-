// backend/src/services/aiService.js
// All AI functions now use Gemini (primary) → Groq (fallback)

import { GoogleGenerativeAI } from '../utils/geminiRotator.js';
import Groq from 'groq-sdk';
import { generateEmbedding } from './embeddingService.js';
import logger from '../utils/logger.js';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL   = 'llama-3.3-70b-versatile';

let genAI = null;
let groq  = null;

const getGenAI = () => { if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); return genAI; };
const getGroq  = () => { if (!groq)  groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });        return groq; };

// ── LLM JSON helper with fallback ─────────────────────────────────────────────
async function llmJSON(prompt, preferGemini = true) {
  if (preferGemini && process.env.GEMINI_API_KEY?.length > 20) {
    try {
      const model = getGenAI().getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (e) {
      if (e.status !== 429) logger.warn(`Gemini error: ${e.message}`);
    }
  }
  if (process.env.GROQ_API_KEY?.length > 10) {
    try {
      const client = getGroq();
      const completion = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: 'system', content: 'Return only valid JSON.' }, { role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      logger.warn(`Groq fallback error: ${e.message}`);
    }
  }
  throw new Error('All LLM providers failed');
}

export const generateToolDescription = async (rawData) => {
  try {
    return await llmJSON(`Extract tool details. Return JSON: description (max 2000), shortDescription (max 300), category (one of: Writing,Image,Video,Audio,Coding,Productivity,Research,Marketing,Data,Design,Chat,Education,Healthcare,Legal,Finance,Cybersecurity,Other), tags (array of 10 lowercase). Data: ${JSON.stringify(rawData).slice(0, 3000)}`);
  } catch (error) {
    logger.error(`generateToolDescription error: ${error.message}`);
    throw error;
  }
};

export const generateProsAndCons = async (toolData) => {
  try {
    return await llmJSON(`List ALL pros and cons for this AI tool. Return JSON: {"pros":[...],"cons":[...]}. Name: ${toolData.name}, Category: ${toolData.category}, Description: ${toolData.description?.slice(0,500)}`);
  } catch (error) {
    logger.error(`generateProsAndCons error: ${error.message}`);
    throw error;
  }
};

export const generateUseCases = async (toolData) => {
  try {
    const result = await llmJSON(`List 5 practical use cases. Return JSON: {"useCases":[...]}. Name: ${toolData.name}, Description: ${toolData.description?.slice(0,500)}`);
    return result.useCases || [];
  } catch (error) {
    logger.error(`generateUseCases error: ${error.message}`);
    throw error;
  }
};

export const compareTools = async (tools, res) => {
  const { runAIComparisonAgent } = await import('./aiComparisonService.js');
  return runAIComparisonAgent(tools, res);
};

export const recommendTools = async (query, candidates) => {
  try {
    const ctx = candidates.map(c => `- ${c.name}: ${c.shortDescription}`).join('\n');
    const result = await llmJSON(`You are an AI tool recommendation engine. User query: "${query}". Candidates: ${ctx}. Return JSON: {"recommendations":[{"toolName":"name","explanation":"why it matches"}]}`);
    return (result.recommendations || []).map(rec => {
      const tool = candidates.find(c => c.name === rec.toolName);
      return tool ? { ...tool.toObject(), explanation: rec.explanation } : null;
    }).filter(Boolean);
  } catch (error) {
    logger.error(`recommendTools error: ${error.message}`);
    throw error;
  }
};

export { generateEmbedding };

export const enrichTool = async (toolData) => {
  try {
    logger.info(`Enriching: ${toolData.name}`);
    const coreInfo  = await generateToolDescription(toolData);
    const proscons  = await generateProsAndCons({ ...toolData, ...coreInfo });
    const useCases  = await generateUseCases({ ...toolData, ...coreInfo });
    const text      = `${coreInfo.description} ${coreInfo.category} ${(coreInfo.tags||[]).join(' ')}`;
    const embedding = await generateEmbedding(text);
    return {
      description: coreInfo.description,
      shortDescription: coreInfo.shortDescription,
      category: coreInfo.category || 'Other',
      tags: coreInfo.tags || [],
      aiMeta: { pros: proscons.pros||[], cons: proscons.cons||[], useCases, embedding },
    };
  } catch (error) {
    logger.error(`enrichTool failed: ${error.message}`);
    throw error;
  }
};