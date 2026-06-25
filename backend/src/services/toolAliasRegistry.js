// backend/src/services/toolAliasRegistry.js
// STEP 17: Tool Alias Registry
//
// A curated registry of well-known AI tools and their aliases / spelling
// variations. Used to support "Did you mean …?" and direct tool searches
// even when the tool's name in the database doesn't exactly match the
// user-typed query.
//
// This is a SMALL static map of the most popular tools. For other tools,
// the direct search service falls back to fuzzy / Levenshtein matching
// against the full database.

import logger from '../utils/logger.js';

// Map: alias (lowercased, no spaces) → canonical tool name
// Aliases include common spellings, abbreviations, and product family names.
const ALIAS_TO_CANONICAL = {
  // ChatGPT
  'gpt': 'ChatGPT',
  'chatgpt': 'ChatGPT',
  'chat gpt': 'ChatGPT',
  'chat-gpt': 'ChatGPT',
  'chatgbt': 'ChatGPT',
  'openai': 'OpenAI',
  'open ai': 'OpenAI',
  'gpt4': 'GPT-4',
  'gpt-4': 'GPT-4',
  'gpt4o': 'GPT-4o',
  'gpt-4o': 'GPT-4o',
  'gpt5': 'GPT-5',
  'gpt-5': 'GPT-5',
  'o1': 'OpenAI o1',
  'o3': 'OpenAI o3',
  'dalle': 'DALL-E',
  'dall-e': 'DALL-E',
  'dalle2': 'DALL-E',
  'dalle3': 'DALL-E',

  // Claude
  'claude': 'Claude',
  'claud': 'Claude',
  'claude ai': 'Claude',
  'claudeai': 'Claude',
  'anthropic': 'Anthropic Claude',
  'claude3': 'Claude 3',
  'claude-3': 'Claude 3',
  'claude3.5': 'Claude 3.5 Sonnet',
  'claude 3.5': 'Claude 3.5 Sonnet',
  'sonnet': 'Claude 3.5 Sonnet',
  'opus': 'Claude 3 Opus',
  'haiku': 'Claude 3 Haiku',

  // Gemini
  'gemini': 'Gemini',
  'gemini ai': 'Gemini',
  'gemini-ai': 'Gemini',
  'bard': 'Gemini',
  'google ai': 'Gemini',
  'google bard': 'Gemini',
  'gemini pro': 'Gemini Pro',
  'geminipro': 'Gemini Pro',
  'gemini ultra': 'Gemini Ultra',

  // Perplexity
  'perplexity': 'Perplexity',
  'perplexity ai': 'Perplexity',
  'perplexcity': 'Perplexity',
  'perplexcity ai': 'Perplexity',
  'pplx': 'Perplexity',

  // Midjourney
  'midjourney': 'Midjourney',
  'midjorney': 'Midjourney',
  'midjourmey': 'Midjourney',
  'mj': 'Midjourney',

  // Stable Diffusion
  'stable diffusion': 'Stable Diffusion',
  'stablediffusion': 'Stable Diffusion',
  'sd': 'Stable Diffusion',

  // DALL-E (handled above)

  // GitHub Copilot
  'github copilot': 'GitHub Copilot',
  'copilot': 'GitHub Copilot',
  'gh copilot': 'GitHub Copilot',
  'githubcopilot': 'GitHub Copilot',
  'copilott': 'GitHub Copilot',
  'copilot ai': 'GitHub Copilot',

  // Microsoft Copilot
  'microsoft copilot': 'Microsoft Copilot',
  'ms copilot': 'Microsoft Copilot',
  'bing chat': 'Microsoft Copilot',
  'bing': 'Microsoft Copilot',

  // Cursor
  'cursor': 'Cursor',
  'cursor ai': 'Cursor',
  'cursor.sh': 'Cursor',
  'cursor editor': 'Cursor',

  // Jasper
  'jasper': 'Jasper',
  'jasper ai': 'Jasper',
  'jasperai': 'Jasper',
  'jarvis ai': 'Jasper',

  // Notion AI
  'notion ai': 'Notion AI',
  'notionai': 'Notion AI',
  'notion': 'Notion AI',

  // CapCut
  'capcut': 'CapCut',
  'cap cut': 'CapCut',
  'cap-cut': 'CapCut',
  'tiktok editor': 'CapCut',

  // Runway
  'runway': 'Runway',
  'runway ml': 'Runway',
  'runwayml': 'Runway',
  'runway gen': 'Runway',

  // ElevenLabs
  'elevenlabs': 'ElevenLabs',
  'eleven labs': 'ElevenLabs',
  'eleven-labs': 'ElevenLabs',
  '11labs': 'ElevenLabs',
  '11 labs': 'ElevenLabs',

  // Suno
  'suno': 'Suno',
  'suno ai': 'Suno',
  'sunoai': 'Suno',

  // Udio
  'udio': 'Udio',

  // Grammarly
  'grammarly': 'Grammarly',
  'grammerly': 'Grammarly',

  // Copy.ai
  'copy.ai': 'Copy.ai',
  'copy ai': 'Copy.ai',
  'copyai': 'Copy.ai',

  // Writesonic
  'writesonic': 'Writesonic',
  'write sonic': 'Writesonic',

  // Synthesia
  'synthesia': 'Synthesia',

  // HeyGen
  'heygen': 'HeyGen',
  'hey gen': 'HeyGen',

  // Descript
  'descript': 'Descript',

  // Leonardo
  'leonardo': 'Leonardo AI',
  'leonardo ai': 'Leonardo AI',
  'leonardoai': 'Leonardo AI',

  // Adobe Firefly
  'firefly': 'Adobe Firefly',
  'adobe firefly': 'Adobe Firefly',

  // Microsoft Designer
  'microsoft designer': 'Microsoft Designer',

  // Canva
  'canva': 'Canva',
  'canva ai': 'Canva',
  'magic studio': 'Canva',

  // Figma AI
  'figma ai': 'Figma AI',
  'figma': 'Figma AI',

  // Character.AI
  'character.ai': 'Character.AI',
  'character ai': 'Character.AI',
  'characterai': 'Character.AI',
  'character': 'Character.AI',

  // Replika
  'replika': 'Replika',

  // Pi
  'pi ai': 'Pi',
  'pi': 'Pi',

  // Poe
  'poe': 'Poe',
  'poe ai': 'Poe',
  'poe.com': 'Poe',

  // Mistral
  'mistral': 'Mistral AI',
  'mistral ai': 'Mistral AI',
  'mistralai': 'Mistral AI',
  'mixtral': 'Mistral AI',

  // Llama
  'llama': 'Meta Llama',
  'llama2': 'Meta Llama',
  'llama 2': 'Meta Llama',
  'llama3': 'Meta Llama',
  'llama 3': 'Meta Llama',
  'meta llama': 'Meta Llama',

  // DeepSeek
  'deepseek': 'DeepSeek',
  'deep seek': 'DeepSeek',

  // Grok
  'grok': 'Grok',
  'grok ai': 'Grok',
  'grok-1': 'Grok',
  'xai': 'Grok',

  // Cohere
  'cohere': 'Cohere',
  'cohere ai': 'Cohere',

  // Hugging Face
  'huggingface': 'Hugging Face',
  'hugging face': 'Hugging Face',
  'hf': 'Hugging Face',

  // Replit
  'replit': 'Replit',
  'replit ai': 'Replit',
  'ghostwriter': 'Replit',

  // Tabnine
  'tabnine': 'Tabnine',

  // Codeium
  'codeium': 'Codeium',
  'windsurf': 'Codeium',

  // Amazon Q
  'amazon q': 'Amazon Q',
  'aws q': 'Amazon Q',

  // Whisper
  'whisper': 'Whisper',
  'openai whisper': 'Whisper',

  // Otter
  'otter': 'Otter.ai',
  'otter.ai': 'Otter.ai',
  'otterai': 'Otter.ai',

  // Zoom AI
  'zoom ai': 'Zoom AI Companion',
  'ai companion': 'Zoom AI Companion',

  // Fireflies
  'fireflies': 'Fireflies.ai',
  'fireflies.ai': 'Fireflies.ai',

  // Mem
  'mem': 'Mem',
  'mem ai': 'Mem',

  // Reflect
  'reflect': 'Reflect',
  'reflect ai': 'Reflect',

  // Roam
  'roam': 'Roam Research',
  'roam research': 'Roam Research',

  // Zapier
  'zapier': 'Zapier',

  // Make
  'make': 'Make.com',
  'make.com': 'Make.com',
  'integromat': 'Make.com',

  // n8n
  'n8n': 'n8n',

  // Airtable
  'airtable': 'Airtable',
  'airtable ai': 'Airtable',

  // Salesforce Einstein
  'einstein': 'Salesforce Einstein',
  'salesforce einstein': 'Salesforce Einstein',

  // HubSpot AI
  'hubspot ai': 'HubSpot AI',
  'hubspot': 'HubSpot AI',

  // Mailchimp AI
  'mailchimp': 'Mailchimp',
  'mailchimp ai': 'Mailchimp',

  // Surfer SEO
  'surfer seo': 'Surfer SEO',
  'surfer': 'Surfer SEO',

  // Ahrefs
  'ahrefs': 'Ahrefs',

  // SEMrush
  'semrush': 'SEMrush',
  'sem rush': 'SEMrush',

  // MarketMuse
  'marketmuse': 'MarketMuse',

  // Frase
  'frase': 'Frase',
  'frase.io': 'Frase',

  // Lumen5
  'lumen5': 'Lumen5',

  // Pictory
  'pictory': 'Pictory',

  // InVideo
  'invideo': 'InVideo',
  'in video': 'InVideo',

  // Veed
  'veed': 'Veed.io',
  'veed.io': 'Veed.io',

  // Descript (above)
  // OpusClip
  'opusclip': 'OpusClip',
  'opus clip': 'OpusClip',

  // Krisp
  'krisp': 'Krisp',

  // Krisp / Otter

  // Beautiful.ai
  'beautiful.ai': 'Beautiful.ai',
  'beautiful ai': 'Beautiful.ai',

  // Tome
  'tome': 'Tome',
  'tome ai': 'Tome',

  // Gamma
  'gamma': 'Gamma',
  'gamma ai': 'Gamma',
  'gamma.app': 'Gamma',

  // Pitch
  'pitch': 'Pitch',
  'pitch.com': 'Pitch',

  // PopAI
  'popai': 'PopAI',
  'pop ai': 'PopAI',

  // Andi
  'andi': 'Andi',
  'andi search': 'Andi',

  // You.com
  'you.com': 'You.com',
  'youcom': 'You.com',
  'you com': 'You.com',

  // Komo
  'komo': 'Komo',
  'komo ai': 'Komo',

  // Exa
  'exa': 'Exa',
  'exa.ai': 'Exa',
  'metaphor': 'Exa',

  // Phind
  'phind': 'Phind',
  'phind.com': 'Phind',

  // Brave Search
  'brave': 'Brave Search',
  'brave search': 'Brave Search',

  // Kagi
  'kagi': 'Kagi',

  // Consensus
  'consensus': 'Consensus',

  // Elicit
  'elicit': 'Elicit',

  // Scite
  'scite': 'Scite',

  // Research Rabbit
  'research rabbit': 'Research Rabbit',

  // Quillbot
  'quillbot': 'Quillbot',
  'quill bot': 'Quillbot',

  // Wordtune
  'wordtune': 'Wordtune',
  'word tune': 'Wordtune',

  // Sudowrite
  'sudowrite': 'Sudowrite',
  'sudo write': 'Sudowrite',

  // NovelAI
  'novelai': 'NovelAI',
  'novel ai': 'NovelAI',

  // Lex
  'lex': 'Lex',
  'lex.page': 'Lex',

  // Rytr
  'rytr': 'Rytr',
  'rytr.me': 'Rytr',

  // Anyword
  'anyword': 'Anyword',

  // Simplified
  'simplified': 'Simplified',
  'simplified ai': 'Simplified',

  // Krisp / Murf
  'murf': 'Murf AI',
  'murf ai': 'Murf AI',

  // Play.ht
  'play.ht': 'Play.ht',
  'playht': 'Play.ht',

  // Resemble
  'resemble': 'Resemble AI',
  'resemble ai': 'Resemble AI',

  // WellSaid
  'wellsaid': 'WellSaid Labs',
  'wellsaid labs': 'WellSaid Labs',

  // Lovo
  'lovo': 'Lovo AI',
  'lovo ai': 'Lovo AI',

  // Socratic
  'socratic': 'Socratic by Google',
  'socratic by google': 'Socratic by Google',

  // Photoroom
  'photoroom': 'Photoroom',

  // Remove.bg
  'remove.bg': 'Remove.bg',
  'removebg': 'Remove.bg',

  // Let's Enhance
  'lets enhance': 'Let\'s Enhance',
  'let\'s enhance': 'Let\'s Enhance',

  // Topaz
  'topaz': 'Topaz Labs',
  'topaz labs': 'Topaz Labs',
  'topaz gigapixel': 'Topaz Labs',
  'topaz video ai': 'Topaz Labs',

  // Krisp / Krisp.ai (above)
};

/**
 * Normalize an alias / search string for matching:
 * - lowercases
 * - removes whitespace, hyphens, and underscores
 */
export function normalizeAlias(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[\s\-_]+/g, '').trim();
}

/**
 * Get the canonical tool name for a given alias.
 * Returns null if not found.
 */
export function getCanonicalFromAlias(alias) {
  if (!alias) return null;
  // First try the raw string
  if (ALIAS_TO_CANONICAL[alias.toLowerCase().trim()]) {
    return ALIAS_TO_CANONICAL[alias.toLowerCase().trim()];
  }
  // Then try normalized (no spaces / hyphens)
  const norm = normalizeAlias(alias);
  for (const [key, value] of Object.entries(ALIAS_TO_CANONICAL)) {
    if (normalizeAlias(key) === norm) return value;
  }
  return null;
}

/**
 * Get all aliases that point to a canonical name.
 */
export function getAliasesFor(canonicalName) {
  const result = [];
  for (const [alias, canon] of Object.entries(ALIAS_TO_CANONICAL)) {
    if (canon.toLowerCase() === String(canonicalName).toLowerCase()) {
      result.push(alias);
    }
  }
  return result;
}

/**
 * Get the entire alias map (exported for inspection / seeding).
 */
export function getAliasMap() {
  return { ...ALIAS_TO_CANONICAL };
}

logger.info(`[ToolAliasRegistry] Loaded ${Object.keys(ALIAS_TO_CANONICAL).length} alias entries`);

export default {
  getCanonicalFromAlias,
  getAliasesFor,
  getAliasMap,
  normalizeAlias,
};
