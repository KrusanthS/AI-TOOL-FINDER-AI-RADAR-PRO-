// backend/src/services/intentAnalysisService.js
// LLM-powered intent understanding and query expansion

import { GoogleGenerativeAI } from '@google/generative-ai';
import logger from '../utils/logger.js';

const GEMINI_MODEL = 'gemini-2.0-flash';
let genAI = null;
const getGenAI = () => { 
  if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); 
  return genAI; 
};

async function llmJSON(prompt) {
  try {
    const model = getGenAI().getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
    });
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    logger.warn(`LLM JSON error: ${error.message}`);
    return null;
  }
}

// ── Intent Analysis ───────────────────────────────────────────────────────────
export async function analyzeIntent(query) {
  const prompt = `Analyze this AI tool query and extract user intent.

Query: "${query}"

Return JSON:
{
  "user_intent": "what user really wants to do",
  "use_case": "coding|design|writing|research|business|marketing|education|productivity|automation|general",
  "user_context": "beginner|intermediate|advanced|student|developer|designer|business|researcher",
  "goal": "specific goal user wants to achieve",
  "keywords": ["expanded", "semantic", "keywords"],
  "category_hint": "suggested category",
  "complexity": "simple|moderate|complex"
}`;

  const result = await llmJSON(prompt);
  if (result) return result;
  
  // Fallback basic analysis
  return {
    user_intent: query,
    use_case: detectUseCase(query),
    user_context: 'general',
    goal: query,
    keywords: query.toLowerCase().split(' ').filter(w => w.length > 2),
    category_hint: detectCategory(query),
    complexity: 'moderate'
  };
}

// ── Query Expansion ───────────────────────────────────────────────────────────
export async function expandQuery(query, intent) {
  const prompt = `Expand this AI tool query into semantic search terms.

Original Query: "${query}"
User Intent: ${intent?.user_intent || 'general AI tool search'}
Use Case: ${intent?.use_case || 'general'}

Return JSON:
{
  "expanded_keywords": ["keyword1", "keyword2", ...],
  "semantic_terms": ["term1", "term2", ...],
  "related_concepts": ["concept1", "concept2", ...],
  "search_queries": ["query1", "query2", "query3"]
}`;

  const result = await llmJSON(prompt);
  if (result) return result;
  
  // Fallback basic expansion
  const baseKeywords = query.toLowerCase().split(' ').filter(w => w.length > 2);
  return {
    expanded_keywords: baseKeywords,
    semantic_terms: [...baseKeywords, 'AI', 'tool', 'assistant'],
    related_concepts: [detectCategory(query)],
    search_queries: [query, `${query} AI tool`, `${query} AI assistant`, `${query} software`]
  };
}

// ── Use Case Deep Analysis ─────────────────────────────────────────────────────
export async function analyzeUseCase(useCase) {
  const prompt = `Analyze this use case and provide detailed requirements.

Use Case: "${useCase}"

Return JSON:
{
  "summary": "1-2 sentence summary",
  "requirements": ["req1", "req2", ...],
  "priorities": {
    "ease_of_use": 1-10,
    "features": 1-10,
    "price": 1-10,
    "speed": 1-10,
    "accuracy": 1-10,
    "learning_curve": 1-10
  },
  "best_category": "coding|design|writing|etc",
  "suggested_approach": "what user should look for"
}`;

  return await llmJSON(prompt);
}

// ── Helper Functions ──────────────────────────────────────────────────────────
function detectUseCase(query) {
  const q = query.toLowerCase();
  if (q.match(/code|program|debug|develop|software/)) return 'coding';
  if (q.match(/design|image|photo|art|visual/)) return 'design';
  if (q.match(/write|content|blog|article/)) return 'writing';
  if (q.match(/research|paper|study|learn/)) return 'research';
  if (q.match(/business|marketing|sales|seo/)) return 'business';
  if (q.match(/video|audio|voice|transcribe/)) return 'multimedia';
  if (q.match(/automation|workflow|agent/)) return 'automation';
  return 'general';
}

function detectCategory(query) {
  const q = query.toLowerCase();
  if (q.match(/chat|gpt|llm|conversation/)) return 'Chat AI';
  if (q.match(/code|program|develop/)) return 'Coding';
  if (q.match(/image|photo|art|visual/)) return 'Image Generation';
  if (q.match(/video|animation/)) return 'Video AI';
  if (q.match(/audio|speech|voice/)) return 'Audio AI';
  if (q.match(/write|content/)) return 'Writing';
  if (q.match(/research|data/)) return 'Research';
  if (q.match(/automation|agent/)) return 'Automation';
  return 'General';
}

export default { analyzeIntent, expandQuery, analyzeUseCase };