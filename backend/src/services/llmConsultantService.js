// backend/src/services/llmConsultantService.js
// LLM-FIRST AI CONSULTANT - The primary decision engine
// Behaves like a human expert consultant, not a keyword search engine

import { GoogleGenerativeAI } from '../utils/geminiRotator.js';
import Groq from 'groq-sdk';
import logger from '../utils/logger.js';

const GEMINI_MODEL = 'gemini-2.0-flash';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

let genAI = null;
let groq = null;
const getGenAI = () => { if (!genAI) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY); return genAI; };
const getGroq  = () => { if (!groq)  groq  = new Groq({ apiKey: process.env.GROQ_API_KEY });        return groq; };

// ── LLM JSON helper with Gemini primary → Groq fallback ──────────────────────
async function llmJSON(prompt, temperature = 0.2) {
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
        messages: [{ role: 'system', content: 'You are an expert AI tool consultant. Return only valid JSON, no markdown.' },
                   { role: 'user', content: prompt }],
        temperature,
        response_format: { type: 'json_object' },
      });
      return JSON.parse(completion.choices[0].message.content);
    } catch (e) {
      logger.warn(`Groq fallback error: ${e.message}`);
    }
  }
  throw new Error('All LLM providers failed');
}

// ── STEP 1: LLM Requirement Understanding ────────────────────────────────────
// The LLM acts as a human expert consultant and extracts the real intent.
export async function understandRequirement(userQuery) {
  const prompt = `You are a world-class AI tool consultant. A user is asking for help finding the right AI tool.

User query: "${userQuery}"

Analyze this query deeply and extract:
1. Their PRIMARY goal (what problem are they really solving?)
2. The EXACT type of AI tool they need (be very specific)
3. Their constraints (skill level, budget, workflow)
4. The specific capabilities the ideal tool MUST have
5. What would make a tool WRONG for this user (deal breakers)

IMPORTANT: Be precise about the intent. If the user asks for a video tool, the intent is video_creation, NOT writing or image. Map intent to the most specific category possible.

Return ONLY this JSON (no markdown, no explanation):
{
  "intent": "most specific intent label (e.g. video_creation, ai_code_assistant, image_generation, blog_writing, research_summarization, voice_cloning, data_analysis, presentation_creation, email_writing, seo_optimization, chatbot_building, logo_design, music_generation, pdf_chat, social_media_content)",
  "use_case": "specific use case (e.g. youtube_shorts, react_development, blog_writing, academic_paper_summary, instagram_reels, podcast_transcription)",
  "goal": "1-sentence description of what the user wants to achieve",
  "desired_outcome": "what success looks like for the user",
  "skill_level": "beginner | intermediate | advanced | expert",
  "budget_preference": "free_only | free_preferred | paid_ok | enterprise",
  "content_type": "text | image | video | audio | code | data | mixed",
  "constraints": ["specific constraints like no_watermark, offline_use, api_access, team_collaboration"],
  "industry": "specific industry if mentioned, else general",
  "required_capabilities": ["mandatory capabilities the tool MUST have — be very specific, e.g. auto_subtitle_generation, code_autocomplete, text_to_image, voice_synthesis"],
  "preferred_capabilities": ["nice-to-have capabilities"],
  "deal_breakers": ["things that would make a tool wrong — e.g. requires_credit_card, gpu_required, no_free_tier"],
  "workflow_needs": ["workflow requirements like batch_processing, real_time, browser_extension, figma_plugin"],
  "keywords": ["5-10 specific keywords to search the tool database — focus on the exact domain"]
}`;

  try {
    const result = await llmJSON(prompt, 0.1);
    return {
      ...result,
      original_query: userQuery,
      understood_at: new Date().toISOString(),
    };
  } catch (e) {
    logger.warn(`Requirement understanding failed: ${e.message}, using fallback`);
    return fallbackRequirementUnderstanding(userQuery);
  }
}

// ── STEP 2: Capability Mapping ───────────────────────────────────────────────
// Map the user's required capabilities to capability identifiers used in our DB
export async function mapCapabilitiesToSearch(understanding) {
  const prompt = `You are an AI tool database search strategist.

User Understanding:
Intent: ${understanding.intent}
Use case: ${understanding.use_case}
Goal: ${understanding.goal}
Required capabilities: ${(understanding.required_capabilities || []).join(', ')}
Content type: ${understanding.content_type}
Keywords: ${(understanding.keywords || []).join(', ')}

Convert this into PRECISE search terms for a tool database. The database fields are:
- capabilities: specific tool abilities (e.g. video_creation, code_completion, text_to_image, voice_synthesis, summarization, translation, data_analysis)
- use_cases: specific use cases (e.g. youtube_shorts, blog_writing, code_review, podcast_transcription, logo_design)
- features: tool features (e.g. real_time, batch_processing, api_access, browser_extension, custom_templates)
- target_users: (beginner, developer, designer, marketer, student, researcher, business_owner)
- category: (Writing, Image, Video, Audio, Coding, Marketing, Productivity, Research, Data, Design, Chat, Education, Legal, Finance, Cybersecurity, Other)

IMPORTANT: Be VERY specific. If intent is video_creation, capability_filters must include video-related terms only. Do NOT mix unrelated capabilities.

Return JSON:
{
  "capability_filters": ["specific capability identifiers that DIRECTLY match the intent"],
  "use_case_filters": ["specific use case identifiers"],
  "feature_filters": ["specific feature identifiers"],
  "target_user_filters": ["target user types"],
  "category_filters": ["1-2 most relevant category names only"],
  "exclude_terms": ["terms that indicate this is NOT the right type of tool"],
  "minimum_relevance_threshold": 25,
  "weight_overrides": {
    "capability_match": 45,
    "use_case_match": 25,
    "feature_match": 15,
    "popularity": 10,
    "trust": 5
  }
}`;

  try {
    return await llmJSON(prompt, 0.1);
  } catch (e) {
    logger.warn(`Capability mapping failed: ${e.message}`);
    return {
      capability_filters: understanding.required_capabilities || [],
      use_case_filters: [understanding.use_case].filter(Boolean),
      feature_filters: [],
      target_user_filters: [understanding.skill_level].filter(Boolean),
      category_filters: [],
      exclude_terms: [],
      minimum_relevance_threshold: 25,
      weight_overrides: {
        capability_match: 45,
        use_case_match: 25,
        feature_match: 15,
        popularity: 10,
        trust: 5,
      },
    };
  }
}

// ── Fallback requirement understanding (no LLM) ─────────────────────────────
function fallbackRequirementUnderstanding(query) {
  const q = query.toLowerCase();
  return {
    intent: detectIntent(q),
    use_case: detectUseCase(q),
    goal: query,
    desired_outcome: 'Achieve the goal: ' + query,
    skill_level: 'intermediate',
    budget_preference: 'free_preferred',
    content_type: detectContentType(q),
    constraints: [],
    industry: 'general',
    required_capabilities: q.split(/\s+/).filter(w => w.length > 3),
    preferred_capabilities: [],
    deal_breakers: [],
    workflow_needs: [],
    keywords: q.split(/\s+/).filter(w => w.length > 2),
    original_query: query,
    understood_at: new Date().toISOString(),
  };
}

function detectIntent(q) {
  if (q.match(/code|program|debug|develop|software/)) return 'code_assistance';
  if (q.match(/image|photo|art|draw|visual/)) return 'image_generation';
  if (q.match(/video|youtube|tiktok|reel|short/)) return 'video_creation';
  if (q.match(/audio|voice|music|podcast|speech/)) return 'audio_creation';
  if (q.match(/write|blog|article|content|copy/)) return 'content_writing';
  if (q.match(/research|paper|study|summary|summarize/)) return 'research_summarization';
  if (q.match(/chat|conversation|assistant/)) return 'chat_assistant';
  if (q.match(/design|ui|ux|logo/)) return 'design_creation';
  if (q.match(/data|analy|chart|visualiz/)) return 'data_analysis';
  if (q.match(/market|seo|ad|campaign/)) return 'marketing_assistance';
  if (q.match(/present|slide|deck/)) return 'presentation_creation';
  if (q.match(/email|outreach/)) return 'email_assistance';
  if (q.match(/translate|language/)) return 'translation';
  return 'general_ai_assistance';
}

function detectUseCase(q) {
  if (q.match(/youtube.*short|short.*youtube/)) return 'youtube_shorts';
  if (q.match(/tiktok/)) return 'tiktok_reels';
  if (q.match(/blog/)) return 'blog_writing';
  if (q.match(/academic|paper|journal/)) return 'academic_research';
  if (q.match(/react|frontend|web dev/)) return 'web_development';
  if (q.match(/podcast/)) return 'podcast_editing';
  if (q.match(/logo/)) return 'logo_design';
  if (q.match(/present|slide/)) return 'presentation_making';
  if (q.match(/code review/)) return 'code_review';
  return 'general';
}

function detectContentType(q) {
  if (q.match(/image|photo|art/)) return 'image';
  if (q.match(/video|youtube|tiktok/)) return 'video';
  if (q.match(/audio|voice|music|podcast/)) return 'audio';
  if (q.match(/code|program/)) return 'code';
  if (q.match(/data|analy/)) return 'data';
  return 'text';
}

export default {
  understandRequirement,
  mapCapabilitiesToSearch,
};
