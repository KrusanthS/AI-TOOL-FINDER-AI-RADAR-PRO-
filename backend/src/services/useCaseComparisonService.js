// backend/src/services/useCaseComparisonService.js
// Use-case based AI tool comparison system

import { GoogleGenerativeAI } from '@google/generative-ai';
import Tool from '../models/Tool.js';
import { hybridSearch } from './hybridSearchService.js';
import { analyzeUseCase } from './intentAnalysisService.js';
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
      generationConfig: { responseMimeType: 'application/json', temperature: 0.3 },
    });
    const result = await model.generateContent(prompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    logger.warn(`LLM comparison error: ${error.message}`);
    return null;
  }
}

// ── Main Use-Case Based Comparison ─────────────────────────────────────────────
export async function compareForUseCase(toolIds, useCase, userContext = {}) {
  logger.info(`Comparing tools for use case: "${useCase}"`);
  
  // Step 1: Analyze use case requirements
  const useCaseAnalysis = await analyzeUseCase(useCase);
  logger.info(`Use case analyzed: ${JSON.stringify(useCaseAnalysis)}`);
  
  // Step 2: Fetch tool details
  const tools = await fetchToolDetails(toolIds);
  
  // Step 3: Generate use-case focused comparison
  const comparison = await generateUseCaseComparison(tools, useCase, useCaseAnalysis, userContext);
  
  return comparison;
}

// ── Fetch Tool Details (DB + Internet) ─────────────────────────────────────────
async function fetchToolDetails(toolIds) {
  const tools = [];
  
  for (const id of toolIds) {
    // Try database first
    let tool = await Tool.findById(id).lean();
    
    if (tool) {
      tools.push({
        ...tool,
        source: 'database',
        source_detail: 'stored'
      });
    } else {
      // Search internet for the tool
      const internetResults = await hybridSearch(id, { limit: 1 });
      if (internetResults.results?.length > 0) {
        tools.push({
          name: internetResults.results[0].name,
          description: internetResults.results[0].description,
          url: internetResults.results[0].url,
          category: internetResults.results[0].category,
          source: 'internet',
          source_detail: internetResults.results[0].source
        });
      }
    }
  }
  
  return tools;
}

// ── Generate Use-Case Focused Comparison ───────────────────────────────────────
async function generateUseCaseComparison(tools, useCase, useCaseAnalysis, userContext) {
  const toolContext = tools.map(t => ({
    name: t.name,
    description: t.shortDescription || t.description || '',
    category: t.category,
    pricing: t.pricing?.model || t.pricing_type || 'unknown',
    rating: t.stats?.rating || 0,
    features: t.features || [],
    strengths: t.strengths || [],
    aiMeta: t.aiMeta || {}
  }));
  
  const prompt = `Compare these AI tools for a specific use case.

USE CASE: "${useCase}"
USER CONTEXT: ${JSON.stringify(userContext)}
USE CASE REQUIREMENTS: ${JSON.stringify(useCaseAnalysis)}

TOOLS TO COMPARE:
${JSON.stringify(toolContext, null, 2)}

IMPORTANT: Focus comparison on the USE CASE, not generic features.

Return JSON:
{
  "summary": "Brief comparison summary focused on the use case",
  "use_case_analysis": {
    "what_user_needs": "what the user is trying to accomplish",
    "key_requirements": ["req1", "req2", ...],
    "success_criteria": "how to measure success"
  },
  "tool_analysis": [
    {
      "name": "tool name",
      "use_case_fit_score": 1-100,
      "strengths_for_use_case": ["strength1", "strength2", ...],
      "weaknesses_for_use_case": ["weakness1", "weakness2", ...],
      "best_for": "specific scenario within the use case",
      "not_recommended_for": "when NOT to use this tool",
      "learning_curve": "beginner|intermediate|advanced",
      "price_value": "good|moderate|expensive"
    }
  ],
  "winners": {
    "best_overall": "tool name",
    "best_for_beginners": "tool name",
    "best_for_advanced": "tool name",
    "best_value": "tool name",
    "best_speed": "tool name",
    "best_accuracy": "tool name"
  },
  "recommendation": "Final recommendation based on user context",
  "feature_comparison": [
    {
      "feature": "feature name",
      "relevance_to_use_case": "high|medium|low",
      "winner": "which tool wins for this feature",
      "notes": "brief explanation"
    }
  ]
}`;

  const result = await llmJSON(prompt);
  
  if (result) {
    return {
      use_case: useCase,
      use_case_analysis: result.use_case_analysis,
      tools: result.tool_analysis,
      winners: result.winners,
      recommendation: result.recommendation,
      feature_comparison: result.feature_comparison,
      summary: result.summary,
      compared_tools: tools.map(t => ({
        name: t.name,
        source: t.source,
        url: t.url
      }))
    };
  }
  
  // Fallback basic comparison
  return generateBasicComparison(tools, useCase, useCaseAnalysis);
}

// ── Basic Fallback Comparison ──────────────────────────────────────────────────
function generateBasicComparison(tools, useCase, useCaseAnalysis) {
  const sorted = [...tools].sort((a, b) => (b.stats?.rating || 0) - (a.stats?.rating || 0));
  
  return {
    use_case: useCase,
    use_case_analysis: {
      what_user_needs: useCaseAnalysis?.summary || useCase,
      key_requirements: useCaseAnalysis?.requirements || [],
      success_criteria: 'Find the best tool for ' + useCase
    },
    tools: tools.map(t => ({
      name: t.name,
      use_case_fit_score: Math.round((t.stats?.rating || 3) * 20),
      strengths_for_use_case: ['Rated ' + (t.stats?.rating || 'N/A') + ' stars', 'Available in database'],
      weaknesses_for_use_case: ['Limited internet data'],
      best_for: 'General ' + useCase + ' tasks',
      learning_curve: 'moderate'
    })),
    winners: {
      best_overall: sorted[0]?.name || 'N/A',
      best_for_beginners: sorted[0]?.name || 'N/A',
      best_value: sorted.find(t => t.pricing?.model === 'free')?.name || sorted[0]?.name
    },
    recommendation: `${sorted[0]?.name || 'First tool'} is recommended for ${useCase} based on ratings and database verification.`,
    feature_comparison: [],
    summary: `Comparison of ${tools.length} tools for ${useCase}`,
    compared_tools: tools.map(t => ({ name: t.name, source: t.source, url: t.url }))
  };
}

// ── Quick Compare (Simple) ─────────────────────────────────────────────────────
export async function quickCompare(toolNames, useCase) {
  const tools = await Promise.all(
    toolNames.map(async name => {
      const results = await hybridSearch(name, { limit: 1 });
      return results.results?.[0] || { name, description: 'Not found', source: 'unknown' };
    })
  );
  
  return {
    use_case: useCase,
    tools: tools.map(t => ({
      name: t.name,
      description: t.description,
      url: t.url,
      source: t.source,
      category: t.category,
      relevance_score: t.scores?.final || 0
    })),
    recommendation: `For ${useCase}, consider ${tools[0]?.name || 'the first tool'} based on available data.`
  };
}

export default { compareForUseCase, quickCompare };