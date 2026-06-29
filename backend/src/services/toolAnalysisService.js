// backend/src/services/toolAnalysisService.js
// Deep AI tool analysis system

import { GoogleGenerativeAI } from '../utils/geminiRotator.js';
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
    logger.warn(`LLM analysis error: ${error.message}`);
    return null;
  }
}

// ── Main Tool Analysis ─────────────────────────────────────────────────────────
export async function analyzeTool(toolNameOrId, userContext = {}) {
  logger.info(`Analyzing tool: "${toolNameOrId}"`);
  
  // Step 1: Fetch tool from database or internet
  const tool = await fetchTool(toolNameOrId);
  
  if (!tool) {
    return { error: 'Tool not found', name: toolNameOrId };
  }
  
  // Step 2: Generate comprehensive analysis
  const analysis = await generateAnalysis(tool, userContext);
  
  return analysis;
}

// ── Fetch Tool (DB + Internet) ─────────────────────────────────────────────────
async function fetchTool(identifier) {
  // Build query — only match _id if identifier looks like a valid ObjectId
  const isObjectId = /^[a-f\d]{24}$/i.test(identifier);
  const query = isObjectId
    ? { $or: [{ _id: identifier }, { name: { $regex: identifier, $options: 'i' } }, { slug: identifier }] }
    : { $or: [{ name: { $regex: identifier, $options: 'i' } }, { slug: identifier }] };

  let tool = await Tool.findOne(query).lean();
  
  if (tool) {
    return {
      ...tool,
      source: 'database',
      source_detail: 'stored'
    };
  }
  
  // Search internet
  const results = await hybridSearch(identifier, { limit: 1 });
  if (results.results?.length > 0) {
    return {
      name: results.results[0].name,
      description: results.results[0].description,
      shortDescription: results.results[0].description,
      url: results.results[0].url,
      category: results.results[0].category,
      logo: results.results[0].logo,
      pricing: results.results[0].pricing,
      tags: results.results[0].tags,
      source: 'internet',
      source_detail: results.results[0].source
    };
  }
  
  return null;
}

// ── Generate Comprehensive Analysis ────────────────────────────────────────────
async function generateAnalysis(tool, userContext) {
  const prompt = `Perform a deep analysis of this AI tool.

TOOL INFORMATION:
${JSON.stringify({
  name: tool.name,
  description: tool.shortDescription || tool.description || '',
  category: tool.category,
  pricing: tool.pricing?.model || tool.pricing || 'unknown',
  features: tool.features || [],
  strengths: tool.strengths || [],
  weaknesses: tool.weaknesses || [],
  aiMeta: tool.aiMeta || {},
  stats: tool.stats || {},
  tags: tool.tags || []
}, null, 2)}

USER CONTEXT:
${JSON.stringify(userContext, null, 2)}

IMPORTANT: Analysis must be personalized to the user's context and needs.

Return JSON:
{
  "overview": {
    "what_it_does": "2-3 sentence human-readable text description (never just output a URL)",
    "primary_category": "main category",
    "best_for": "what this tool excels at (text only, no URLs)"
  },
  "detailed_analysis": {
    "core_functionality": "how the tool works",
    "key_features": ["feature1", "feature2", ...],
    "technology_used": "AI models/technologies used",
    "unique_value_proposition": "what makes it different"
  },
  "use_case_analysis": {
    "ideal_use_cases": ["case1", "case2", ...],
    "not_suitable_for": ["case1", "case2", ...],
    "best_user_profiles": ["beginner", "developer", "designer", etc.]
  },
  "pros": [
    {
      "point": "positive point",
      "impact": "high|medium|low",
      "explanation": "why this matters"
    }
  ],
  "cons": [
    {
      "point": "negative point",
      "impact": "high|medium|low", 
      "explanation": "why this matters",
      "workaround": "possible solution if any"
    }
  ],
  "pricing_analysis": {
    "free_tier": "what's included free",
    "paid_tier": "what's in paid",
    "value_for_money": "good|moderate|expensive",
    "target_budget": "who can afford it"
  },
  "learning_curve": {
    "difficulty": "beginner|intermediate|advanced",
    "time_to_productivity": "estimate",
    "resources_available": ["resource1", "resource2", ...],
    "tips_for_starting": ["tip1", "tip2", ...]
  },
  "alternatives": [
    {
      "name": "alternative name",
      "why_consider": "reason to consider",
      "price_comparison": "cheaper|similar|more_expensive",
      "key_difference": "main difference"
    }
  ],
  "final_recommendation": {
    "verdict": "recommended|conditionally_recommended|not_recommended",
    "score": 1-100,
    "summary": "2-3 sentence summary",
    "who_should_use": "ideal user profile",
    "who_should_avoid": "who should avoid this tool",
    "best_alternative": "alternative if not recommended"
  },
  "quick_facts": {
    "launch_year": "year or unknown",
    "company": "company name or unknown",
    "active_users": "estimate or unknown",
    "rating": "rating or N/A",
    "last_updated": "date or unknown"
  }
}`;

  const result = await llmJSON(prompt);
  
  if (result) {
    return {
      tool: {
        name: tool.name,
        description: tool.shortDescription || tool.description,
        url: tool.url || tool.links?.website || '',
        category: tool.category,
        source: tool.source,
        logo: tool.logo || tool.media?.logo || ''
      },
      analysis: result,
      analyzed_at: new Date().toISOString()
    };
  }
  
  // Fallback basic analysis
  return generateBasicAnalysis(tool);
}

// ── Basic Fallback Analysis ───────────────────────────────────────────────────
function generateBasicAnalysis(tool) {
  return {
    tool: {
      name: tool.name,
      description: tool.shortDescription || tool.description,
      url: tool.url || tool.links?.website || '',
      category: tool.category,
      source: tool.source,
      logo: tool.logo || tool.media?.logo || ''
    },
    analysis: {
      overview: {
        what_it_does: (tool.shortDescription || tool.description)?.startsWith('http') ? 'An online resource or tool at the provided link.' : (tool.shortDescription || tool.description || 'AI tool'),
        primary_category: tool.category || 'General',
        best_for: 'General AI tasks'
      },
      detailed_analysis: {
        core_functionality: 'AI-powered tool',
        key_features: tool.features || [],
        technology_used: 'AI/ML models',
        unique_value_proposition: 'Available in our database'
      },
      use_case_analysis: {
        ideal_use_cases: [`${tool.category} tasks`],
        not_suitable_for: 'Highly specialized tasks',
        best_user_profiles: ['General users', 'Beginners']
      },
      pros: [
        { point: 'Verified in database', impact: 'high', explanation: 'Quality assured' },
        { point: 'Has user ratings', impact: 'medium', explanation: 'Community feedback available' }
      ],
      cons: [
        { point: 'Limited analysis data', impact: 'low', explanation: 'More research needed' }
      ],
      pricing_analysis: {
        free_tier: tool.pricing?.model === 'free' ? 'Available' : 'Check website',
        value_for_money: 'moderate',
        target_budget: 'All budgets'
      },
      learning_curve: {
        difficulty: 'beginner',
        time_to_productivity: '1-2 hours',
        resources_available: ['Official website', 'Documentation']
      },
      alternatives: [],
      final_recommendation: {
        verdict: 'recommended',
        score: 70,
        summary: `${tool.name} is a verified AI tool available in our database.`,
        who_should_use: 'General users looking for ${tool.category} tools',
        who_should_avoid: 'Users needing advanced features'
      },
      quick_facts: {
        rating: tool.stats?.rating || 'N/A',
        last_updated: tool.updated_at || 'Unknown'
      }
    },
    analyzed_at: new Date().toISOString()
  };
}

// ── Analyze Multiple Tools for Decision ───────────────────────────────────────
export async function analyzeForDecision(toolNames, decisionContext) {
  const analyses = await Promise.all(
    toolNames.map(name => analyzeTool(name, decisionContext))
  );
  
  const prompt = `Help user make a decision between these tools.

DECISION CONTEXT: ${JSON.stringify(decisionContext, null, 2)}

TOOLS ANALYSIS:
${JSON.stringify(analyses.map(a => ({
  name: a.tool?.name,
  verdict: a.analysis?.final_recommendation?.verdict,
  score: a.analysis?.final_recommendation?.score,
  pros: a.analysis?.pros?.slice(0, 3),
  cons: a.analysis?.cons?.slice(0, 3)
})), null, 2)}

Return JSON:
{
  "decision_summary": "brief summary",
  "winner": "which tool wins for this context",
  "runner_up": "second best option",
  "key_differences": [
    {
      "aspect": "aspect name",
      "winner": "tool name",
      "explanation": "why"
    }
  ],
  "final_recommendation": "complete recommendation",
  "considerations": ["point1", "point2", ...]
}`;

  const result = await llmJSON(prompt);
  
  if (result) {
    return {
      context: decisionContext,
      analyses,
      decision: result,
      compared_at: new Date().toISOString()
    };
  }
  
  return {
    context: decisionContext,
    analyses,
    decision: {
      winner: analyses[0]?.tool?.name || 'N/A',
      recommendation: 'Based on available data, the first tool is recommended.'
    }
  };
}

export default { analyzeTool, analyzeForDecision };