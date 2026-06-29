// backend/src/services/aiComparisonService.js
// Fast AI comparison using Gemini (primary) → Groq (fallback)

import { GoogleGenerativeAI } from '../utils/geminiRotator.js';
import Groq from 'groq-sdk';
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
      return result.response.text();
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
      return completion.choices[0].message.content;
    } catch (e) {
      logger.warn(`Groq fallback error: ${e.message}`);
    }
  }
  throw new Error('All LLM providers failed');
}

// ── Build tool context from DB data ───────────────────────────────────────────
function buildToolContext(tools) {
  return tools.map((t, i) => {
    const pros  = (t.aiMeta?.pros  || []).slice(0, 5).join('; ') || 'none stored';
    const cons  = (t.aiMeta?.cons  || []).slice(0, 4).join('; ') || 'none stored';
    const cases = (t.aiMeta?.useCases || []).slice(0, 4).join('; ') || 'none stored';
    return `TOOL ${i + 1}: ${t.name}
  Website   : ${t.links?.website || t.website_url || 'N/A'}
  Category  : ${t.category || 'AI'}
  Pricing   : ${t.pricing?.model || 'unknown'}
  Rating    : ${t.stats?.rating || 0}/5 (${t.stats?.ratingCount || 0} reviews)
  Weekly Views: ${t.stats?.weeklyViews || 0}
  Description : ${t.shortDescription || t.description?.slice(0, 300) || 'N/A'}
  Tags      : ${(t.tags || []).join(', ') || 'N/A'}
  Known Pros: ${pros}
  Known Cons: ${cons}
  Use Cases : ${cases}`;
  }).join('\n\n');
}

// ── Prompt builder ─────────────────────────────────────────────────────────────
function buildPrompt(tools) {
  const names = tools.map(t => t.name);
  const ctx   = buildToolContext(tools);
  const valuesObj = names.map(n => `"${n}": "value"`).join(', ');
  const perfObj   = names.map(n => `"${n}": "1-sentence assessment"`).join(', ');

  return `You are an elite AI research analyst. Compare these AI tools using your expert knowledge AND the data below.
Use your training knowledge about these tools to fill gaps — be specific, accurate, and insightful.

TOOL DATA:
${ctx}

Return ONLY a valid JSON object (no markdown, no explanation outside JSON):
{
  "summary": "2-3 sentence executive summary highlighting key differences",
  "bestOverall": "${names[0]}",
  "bestForBeginners": "${names[0]}",
  "bestForDevelopers": "${names[0]}",
  "bestBudgetOption": "${names[0]}",
  "bestEnterpriseOption": "${names[0]}",
  "featureComparison": [
    {"feature": "Core Capability", "values": {${valuesObj}}, "winner": "tool name or Tie"},
    {"feature": "Pricing", "values": {${valuesObj}}, "winner": "tool name or Tie"},
    {"feature": "Ease of Use", "values": {${valuesObj}}, "winner": "tool name or Tie"},
    {"feature": "API Access", "values": {${valuesObj}}, "winner": "tool name or Tie"},
    {"feature": "Free Tier", "values": {${valuesObj}}, "winner": "tool name or Tie"},
    {"feature": "Output Quality", "values": {${valuesObj}}, "winner": "tool name or Tie"},
    {"feature": "Speed", "values": {${valuesObj}}, "winner": "tool name or Tie"},
    {"feature": "Integrations", "values": {${valuesObj}}, "winner": "tool name or Tie"}
  ],
  "pricingComparison": [
    {"tier": "Free Plan", "values": {${valuesObj}}},
    {"tier": "Starter/Pro", "values": {${valuesObj}}},
    {"tier": "Enterprise", "values": {${valuesObj}}},
    {"tier": "API Cost", "values": {${valuesObj}}}
  ],
  "strengths": [${names.map(n => `{"tool": "${n}", "points": ["point1", "point2", "point3", "point4", "point5"]}`).join(', ')}],
  "weaknesses": [${names.map(n => `{"tool": "${n}", "points": ["point1", "point2", "point3"]}`).join(', ')}],
  "aiInsights": [
    {"title": "Key Differentiator", "body": "paragraph"},
    {"title": "Performance Analysis", "body": "paragraph"},
    {"title": "Best Use Case Fit", "body": "paragraph"},
    {"title": "Value for Money", "body": "paragraph"}
  ],
  "useCases": [
    {"scenario": "scenario 1", "bestTool": "tool name", "reason": "why"},
    {"scenario": "scenario 2", "bestTool": "tool name", "reason": "why"},
    {"scenario": "scenario 3", "bestTool": "tool name", "reason": "why"},
    {"scenario": "scenario 4", "bestTool": "tool name", "reason": "why"},
    {"scenario": "scenario 5", "bestTool": "tool name", "reason": "why"}
  ],
  "performanceAnalysis": {
    "speed":         {${perfObj}},
    "accuracy":      {${perfObj}},
    "outputQuality": {${perfObj}},
    "apiQuality":    {${perfObj}}
  },
  "communityTrust": {
    "popularity":        {${perfObj}},
    "developerAdoption": {${perfObj}}
  },
  "finalVerdict": "3-4 sentence final recommendation with clear winner and specific reasoning"
}`;
}

// ── Main export ────────────────────────────────────────────────────────────────
export async function runAIComparisonAgent(tools, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const prompt = buildPrompt(tools);
    let rawJson = '';

    try {
      rawJson = await llmJSON(prompt);
      logger.info('Comparison generated via LLM');
    } catch (llmErr) {
      logger.warn(`LLM failed (${llmErr.message}), using fallback`);
      rawJson = null;
    }

    let result;
    if (rawJson) {
      const match = rawJson.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : buildFallbackComparison(tools);
    } else {
      result = buildFallbackComparison(tools);
    }

    res.write(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return result;

  } catch (error) {
    logger.error(`AI Comparison Agent error: ${error.message}`);
    const fallback = buildFallbackComparison(tools);
    res.write(`data: ${JSON.stringify({ type: 'result', data: fallback })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return fallback;
  }
}

// ── Fallback ───────────────────────────────────────────────────────────────────
function buildFallbackComparison(tools) {
  const sorted = [...tools].sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0));
  const best   = sorted[0];
  const names  = tools.map(t => t.name);

  return {
    summary: `Comparing ${names.join(' vs ')}. ${best.name} leads with the highest community rating of ${best.stats?.rating || 'N/A'}/5.`,
    bestOverall:        best.name,
    bestForBeginners:   sorted.find(t => ['free','freemium'].includes(t.pricing?.model))?.name || best.name,
    bestForDevelopers:  best.name,
    bestBudgetOption:   sorted.find(t => t.pricing?.model === 'free')?.name || sorted.find(t => t.pricing?.model === 'freemium')?.name || best.name,
    bestEnterpriseOption: sorted.find(t => ['enterprise','paid'].includes(t.pricing?.model))?.name || best.name,
    featureComparison: [
      { feature: 'Pricing Model',     values: Object.fromEntries(tools.map(t => [t.name, (t.pricing?.model || 'unknown').toUpperCase()])), winner: 'Tie' },
      { feature: 'Community Rating',  values: Object.fromEntries(tools.map(t => [t.name, `${t.stats?.rating || 0}/5`])),                  winner: best.name },
      { feature: 'Category',          values: Object.fromEntries(tools.map(t => [t.name, t.category || 'AI'])),                           winner: 'Tie' },
    ],
    pricingComparison: [
      { tier: 'Model', values: Object.fromEntries(tools.map(t => [t.name, (t.pricing?.model || 'unknown').toUpperCase()])) },
    ],
    strengths:  tools.map(t => ({ tool: t.name, points: t.aiMeta?.pros?.slice(0,5) || [`Specialized in ${t.category}`, 'Active development', 'Growing community', 'Regular updates', 'Good documentation'] })),
    weaknesses: tools.map(t => ({ tool: t.name, points: t.aiMeta?.cons?.slice(0,3) || ['Limited free tier', 'Learning curve', 'Requires internet connection'] })),
    aiInsights: [
      { title: 'Category Fit',       body: `All tools operate in the ${[...new Set(tools.map(t => t.category))].join(' and ')} space with distinct approaches.` },
      { title: 'Pricing Landscape',  body: `Tools span ${[...new Set(tools.map(t => t.pricing?.model))].join(', ')} pricing models.` },
    ],
    useCases: tools.map(t => ({ scenario: `Best for ${t.category} workflows`, bestTool: t.name, reason: t.shortDescription || `Specialized ${t.category} capabilities` })),
    performanceAnalysis: {
      speed:         Object.fromEntries(tools.map(t => [t.name, 'Fast response times'])),
      accuracy:      Object.fromEntries(tools.map(t => [t.name, `${t.stats?.rating || 0}/5 community rating`])),
      outputQuality: Object.fromEntries(tools.map(t => [t.name, 'High quality outputs'])),
      apiQuality:    Object.fromEntries(tools.map(t => [t.name, 'Available on paid plans'])),
    },
    communityTrust: {
      popularity:        Object.fromEntries(tools.map(t => [t.name, `${t.stats?.ratingCount || 0} reviews`])),
      developerAdoption: Object.fromEntries(tools.map(t => [t.name, t.stats?.weeklyViews ? `${t.stats.weeklyViews} weekly views` : 'Growing'])),
    },
    finalVerdict: `${best.name} is the top recommendation based on community ratings and feature depth. Evaluate based on your specific use case, budget, and workflow.`,
  };
}