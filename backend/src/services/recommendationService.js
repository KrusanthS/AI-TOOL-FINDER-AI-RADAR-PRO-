// backend/src/services/recommendationService.js
// RECOMMENDATION GENERATION
// Generates personalized, transparent recommendations for the user.

import { GoogleGenerativeAI } from '../utils/geminiRotator.js';
import Groq from 'groq-sdk';
import logger from '../utils/logger.js';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

let genAI = null;
let groq = null;
const getGenAI = () => { if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); return genAI; };
const getGroq  = () => { if (!groq)  groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });        return groq; };

async function llmJSON(prompt, temperature = 0.3) {
  if (process.env.GEMINI_API_KEY?.length > 20) {
    try {
      const model = getGenAI().getGenerativeModel({
        model: GEMINI_MODEL,
        generationConfig: { responseMimeType: 'application/json', temperature },
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
        messages: [
          { role: 'system', content: 'You are an expert AI tool consultant. Return only valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      logger.warn(`Groq error: ${e.message}`);
    }
  }
  throw new Error('All LLM providers failed');
}

/**
 * Generate personalized, expert recommendations for the top candidate tools.
 * The LLM explains WHY each tool matches the user's specific context.
 */
export async function generateRecommendations(candidates, understanding, capabilityMap, options = {}) {
  const { limit = 5 } = options;

  if (!candidates.length) return [];

  const topCandidates = candidates.slice(0, Math.min(limit * 2, candidates.length));

  const context = topCandidates.map((c, i) => {
    const t = c.tool;
    return [
      `TOOL ${i + 1}: ${t.name}`,
      `Category: ${t.category || 'AI'}`,
      `Pricing: ${t.pricing?.model || 'unknown'}`,
      `Rating: ${t.stats?.rating || 0}/5`,
      `Description: ${t.shortDescription || (t.description || '').slice(0, 200) || 'N/A'}`,
      `Capabilities: ${(t.capabilities || []).slice(0, 5).join(', ') || 'N/A'}`,
      `Use cases: ${(t.use_cases || t.primary_use_cases || []).slice(0, 5).join(', ') || 'N/A'}`,
      `Features: ${(t.features || []).slice(0, 5).join(', ') || 'N/A'}`,
      `Target users: ${(t.target_users || []).slice(0, 3).join(', ') || 'N/A'}`,
      `Match score: ${c.score}/100`,
    ].join('\n');
  }).join('\n\n');

  const userContext = [
    `Intent: ${understanding.intent}`,
    `Use case: ${understanding.use_case || 'general'}`,
    `Goal: ${understanding.goal}`,
    `Skill level: ${understanding.skill_level}`,
    `Budget preference: ${understanding.budget_preference}`,
    `Content type: ${understanding.content_type}`,
    `Required capabilities: ${(understanding.required_capabilities || []).join(', ') || 'none specified'}`,
    `Deal breakers: ${(understanding.deal_breakers || []).join(', ') || 'none'}`,
  ].join('\n');

  const prompt = `You are an elite AI tool consultant. You ONLY recommend the most famous, trusted, and top-rated AI tools that EXACTLY match a user's need.

USER CONTEXT:
${userContext}

CANDIDATE TOOLS (pre-ranked by capability match score):
${context}

Your task: Select and rank the TOP ${limit} tools from the candidates that BEST match this user's specific goal.

CRITICAL RULES:
1. ONLY include tools that DIRECTLY solve the user's stated intent and goal
2. REJECT any tool that is off-topic or only loosely related — it is BETTER to return fewer tools than wrong ones
3. Rank by: (a) direct relevance to the goal, (b) real-world fame/trust/ratings, (c) match score
4. Personalize every explanation to THIS user's specific context — no generic descriptions
5. Be HONEST about limitations — do not oversell
6. confidence_score must reflect true match quality (0=no match, 100=perfect match)
7. If a tool's match score is below 30 and it's not clearly relevant, do NOT include it

Return ONLY this JSON:
{
  "recommendations": [
    {
      "tool_name": "exact tool name from the candidate list",
      "why_recommended": "2-3 sentences explaining WHY this tool is perfect for this specific user's goal — be specific, not generic",
      "best_for": "specific use case scenario matching this user's stated goal",
      "pros": ["concrete strength 1", "concrete strength 2", "concrete strength 3"],
      "limitations": ["honest limitation 1", "honest limitation 2"],
      "confidence_score": 0
    }
  ]
}`;

  try {
    const result = await llmJSON(prompt, 0.3);
    const recs = (result.recommendations || []).map(rec => {
      const candidate = topCandidates.find(c => c.tool.name === rec.tool_name);
      if (!candidate) return null;
      return {
        ...candidate,
        why_recommended: rec.why_recommended || candidate.why_recommended,
        best_for: rec.best_for || candidate.best_for,
        pros: rec.pros || [],
        limitations: rec.limitations || [],
        confidence_score: typeof rec.confidence_score === 'number'
          ? Math.min(100, Math.max(0, rec.confidence_score))
          : Math.round((candidate.confidence || 0) * 100),
        confidence: (rec.confidence_score || (candidate.confidence * 100)) / 100,
      };
    }).filter(Boolean);

    return recs;
  } catch (e) {
    logger.warn(`Recommendation generation failed: ${e.message}, using candidate-derived explanations`);
    return topCandidates.slice(0, limit).map(c => ({
      ...c,
      pros: c.tool.strengths || c.tool.aiMeta?.pros || [],
      limitations: c.tool.weaknesses || c.tool.aiMeta?.cons || [],
      confidence_score: Math.round((c.confidence || 0) * 100),
      confidence: c.confidence || 0,
    }));
  }
}

export default { generateRecommendations };
