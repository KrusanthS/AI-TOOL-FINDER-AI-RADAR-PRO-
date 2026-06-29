// backend/src/services/aiToolSearchService.js
// Live AI Tool Fetch Service - Fetches real-time tool data from Gemini API
// with caching, validation, error handling, and fallback to Groq

import { GoogleGenerativeAI } from '../utils/geminiRotator.js';
import Groq from 'groq-sdk';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';
import Tool from '../models/Tool.js';

// Initialize Gemini AI client
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  return new GoogleGenerativeAI(apiKey);
};

// Initialize Groq client for fallback
const getGroq = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new Groq({ apiKey });
};

// Cache configuration
const CACHE_DURATION = 24 * 60 * 60; // 24 hours in seconds

/**
 * Normalize tool name for better matching
 * Handles typos, spacing, and common variations
 */
export const normalizeToolName = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  let normalized = input.trim().toLowerCase();
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Common typo corrections for AI tools
  const typoCorrections = {
    'chat gpt': 'ChatGPT',
    'chatgpt': 'ChatGPT',
    'gpt-4': 'GPT-4',
    'gpt4': 'GPT-4',
    'mid journy': 'Midjourney',
    'mid journi': 'Midjourney',
    'mid jonrey': 'Midjourney',
    'mid Jorny': 'Midjourney',
    'midjourney': 'Midjourney',
    'runway ml': 'Runway ML',
    'runwayml': 'Runway ML',
    'cursor ai': 'Cursor',
    'cursorai': 'Cursor',
    'cursor': 'Cursor',
    'lovable': 'Lovable',
    'lovable ai': 'Lovable',
    'claude ai': 'Claude',
    'claude': 'Claude',
    'gemini': 'Gemini',
    'google gemini': 'Gemini',
    'stable diffusion': 'Stable Diffusion',
    'stable diffusion xl': 'Stable Diffusion XL',
    'sdxl': 'Stable Diffusion XL',
    'dalle': 'DALL-E',
    'dalle 3': 'DALL-E 3',
    'dalle-e': 'DALL-E',
    'perplexity': 'Perplexity',
    'perplexity ai': 'Perplexity',
    'huggingface': 'Hugging Face',
    'hugging face': 'Hugging Face',
    'replicate': 'Replicate',
    'elevenlabs': 'ElevenLabs',
    'eleven labs': 'ElevenLabs',
    'midjourney v6': 'Midjourney V6',
    'midjourney v5': 'Midjourney V5',
  };
  
  // Check for exact matches first
  for (const [wrong, correct] of Object.entries(typoCorrections)) {
    if (normalized === wrong || normalized.includes(wrong)) {
      return correct;
    }
  }
  
  // Capitalize first letter of each word for unknown tools
  return input.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

/**
 * Validate tool data returned from AI
 */
export const validateAiTool = (data) => {
  const errors = [];
  
  if (!data.name || data.name.length < 2) {
    errors.push('Tool name is required and must be at least 2 characters');
  }
  
  if (!data.description || data.description.length < 10) {
    errors.push('Description must be at least 10 characters');
  }
  
  if (!data.website) {
    errors.push('Website URL is required');
  } else {
    try {
      new URL(data.website);
    } catch {
      errors.push('Website URL is invalid');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    data: {
      name: data.name?.trim() || 'Unknown Tool',
      website: data.website || '',
      description: data.description?.trim() || 'No description available',
      category: data.category?.trim() || 'Other',
      features: Array.isArray(data.features) ? data.features.filter(f => f && f.length > 0) : [],
      pricing: data.pricing?.trim() || 'Free',
      freeOrPaid: ['free', 'freemium', 'paid', 'enterprise'].includes(
        (data.freeOrPaid || data.pricing || '').toLowerCase()
      ) ? (data.freeOrPaid || data.pricing || 'free').toLowerCase() : 'free',
      useCases: Array.isArray(data.useCases) ? data.useCases.filter(u => u && u.length > 0) : [],
      alternatives: Array.isArray(data.alternatives) ? data.alternatives.filter(a => a && a.length > 0) : [],
      tags: Array.isArray(data.tags) ? data.tags.filter(t => t && t.length > 0) : [],
      rating: typeof data.rating === 'number' ? Math.min(5, Math.max(0, data.rating)) : 0,
    }
  };
};

/**
 * Generate prompt for AI API to fetch AI tool information
 */
const generateToolSearchPrompt = (toolName) => {
  return `You are an AI tool expert. Find accurate and latest information about the AI tool: "${toolName}".

Return ONLY valid JSON with this exact structure:
{
  "name": "Exact tool name",
  "website": "Official website URL",
  "description": "Detailed description (2-3 sentences)",
  "category": "Main category (Writing, Image, Video, Audio, Coding, Marketing, Productivity, Research, Data, Other)",
  "features": ["Key feature 1", "Key feature 2", "Key feature 3"],
  "pricing": "Free/Freemium/Paid/Enterprise",
  "freeOrPaid": "free/freemium/paid/enterprise",
  "useCases": ["Use case 1", "Use case 2"],
  "alternatives": ["Alternative tool 1", "Alternative tool 2"],
  "tags": ["tag1", "tag2", "tag3"],
  "rating": 0-5 rating if available
}

Rules:
1. Only return tools that actually exist
2. Prefer official website and verified information
3. If tool doesn't exist or can't be verified, return null
4. Use accurate, up-to-date information
5. Keep JSON valid and parseable
6. No markdown formatting, no code blocks
7. If uncertain about any field, use best guess based on available information`;
};

/**
 * Fetch tool data from Groq API (fallback when Gemini quota exceeded)
 */
const fetchFromGroq = async (toolName) => {
  const groq = getGroq();
  if (!groq) {
    return null;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are an AI tool expert. Return ONLY valid JSON, no markdown formatting.' },
        { role: 'user', content: generateToolSearchPrompt(toolName) },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;
    if (content) {
      return JSON.parse(content);
    }
    return null;
  } catch (error) {
    logger.warn(`Groq API error for ${toolName}: ${error.message}`);
    return null;
  }
};

/**
 * Fetch tool data from Gemini API with retry logic
 */
const fetchFromGemini = async (toolName, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1, // Low temperature for more accurate responses
        },
      });

      const prompt = generateToolSearchPrompt(toolName);
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse and return JSON
      try {
        const data = JSON.parse(response);
        return data;
      } catch {
        logger.error(`Failed to parse Gemini response for ${toolName}: ${response}`);
        return null;
      }
    } catch (error) {
      // Check if it's a quota error
      const isQuotaError = error.message?.includes('429') || 
                           error.message?.includes('Too Many Requests') ||
                           error.message?.includes('quota');
      
      if (isQuotaError && attempt < retries) {
        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      
      logger.warn(`Gemini API error for ${toolName} (attempt ${attempt + 1}): ${error.message}`);
      
      // If quota error and we have Groq available, return null to trigger fallback
      if (isQuotaError && getGroq()) {
        return null;
      }
      
      return null;
    }
  }
  return null;
};

/**
 * Fetch tool data from AI API (tries Gemini first, falls back to Groq)
 */
const fetchFromAI = async (toolName) => {
  // Try Gemini first
  let data = await fetchFromGemini(toolName);
  
  // Fallback to Groq if Gemini failed or returned null
  if (!data) {
    logger.info(`Falling back to Groq API for: ${toolName}`);
    data = await fetchFromGroq(toolName);
  }
  
  return data;
};

/**
 * Check if tool exists in local database
 */
const checkDatabaseForTool = async (toolName) => {
  try {
    // Search by exact name match
    const normalizedName = normalizeToolName(toolName);
    
    // Try exact match first
    let tool = await Tool.findOne({
      $or: [
        { name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } },
        { tool_name: { $regex: new RegExp(`^${normalizedName}$`, 'i') } },
        { slug: normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '-') },
      ],
      status: 'approved'
    });
    
    if (tool) {
      return { found: true, tool: tool.toObject(), source: 'database' };
    }
    
    // Try partial match
    tool = await Tool.findOne({
      $or: [
        { name: { $regex: normalizedName, $options: 'i' } },
        { tool_name: { $regex: normalizedName, $options: 'i' } },
      ],
      status: 'approved'
    }).sort({ 'stats.rating': -1 });
    
    if (tool) {
      return { found: true, tool: tool.toObject(), source: 'database' };
    }
    
    return { found: false, tool: null, source: null };
  } catch (error) {
    logger.error(`Database check error for ${toolName}: ${error.message}`);
    return { found: false, tool: null, source: null, error: error.message };
  }
};

/**
 * Get cache key for a tool search
 */
const getCacheKey = (toolName) => {
  const normalized = normalizeToolName(toolName);
  return `ai-tool-search:${normalized.toLowerCase().replace(/\s+/g, '-')}`;
};

/**
 * Get cached tool data
 */
const getCachedTool = async (toolName) => {
  try {
    if (!redisClient.isReady) {
      return null;
    }
    
    const cacheKey = getCacheKey(toolName);
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      logger.info(`Cache hit for tool: ${toolName}`);
      return JSON.parse(cached);
    }
    
    return null;
  } catch (error) {
    logger.warn(`Cache read error for ${toolName}: ${error.message}`);
    return null;
  }
};

/**
 * Cache tool data
 */
const cacheTool = async (toolName, data) => {
  try {
    if (!redisClient.isReady) {
      return;
    }
    
    const cacheKey = getCacheKey(toolName);
    await redisClient.setex(cacheKey, CACHE_DURATION, JSON.stringify(data));
    logger.info(`Cached tool data for: ${toolName}`);
  } catch (error) {
    logger.warn(`Cache write error for ${toolName}: ${error.message}`);
  }
};

/**
 * Main function to search for AI tools
 * First checks database, then fetches live data if needed
 */
export const searchLiveAiTool = async (toolName, options = {}) => {
  const {
    forceRefresh = false,
    includeDatabase = true,
    timeout = 30000, // 30 seconds timeout
  } = options;

  // Validate input
  if (!toolName || typeof toolName !== 'string' || toolName.trim().length < 2) {
    return {
      success: false,
      error: 'Tool name must be at least 2 characters',
      tool: null,
      source: null,
    };
  }

  const trimmedName = toolName.trim();
  
  try {
    // STEP 1: Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = await getCachedTool(trimmedName);
      if (cached) {
        return {
          success: true,
          ...cached,
          source: 'cache',
          fromCache: true,
        };
      }
    }

    // STEP 2: Check database
    if (includeDatabase) {
      const dbResult = await checkDatabaseForTool(trimmedName);
      
      if (dbResult.found && dbResult.tool) {
        // Cache the database result
        await cacheTool(trimmedName, {
          tool: {
            ...dbResult.tool,
            source: 'database',
            verified: true,
          },
          normalizedName: normalizeToolName(trimmedName),
        });
        
        return {
          success: true,
          tool: {
            ...dbResult.tool,
            source: 'database',
            verified: true,
          },
          source: 'database',
          normalizedName: normalizeToolName(trimmedName),
        };
      }
    }

    // STEP 3: Fetch live data from AI API (Gemini with Groq fallback)
    logger.info(`Fetching live data for tool: ${trimmedName}`);
    
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI tool search timeout')), timeout);
    });

    // Race between API call and timeout
    const aiData = await Promise.race([
      fetchFromAI(trimmedName),
      timeoutPromise,
    ]);

    if (!aiData) {
      return {
        success: false,
        error: 'No information found for this tool. All AI APIs are currently unavailable.',
        tool: null,
        source: null,
      };
    }

    // STEP 4: Validate the data
    const validation = validateAiTool(aiData);
    
    if (!validation.isValid) {
      logger.warn(`Validation failed for ${trimmedName}: ${validation.errors.join(', ')}`);
      return {
        success: false,
        error: validation.errors.join('; '),
        tool: null,
        source: null,
      };
    }

    // STEP 5: Create tool object from validated data
    const liveTool = {
      name: validation.data.name,
      shortDescription: validation.data.description,
      description: validation.data.description,
      category: validation.data.category,
      features: validation.data.features,
      pricing: {
        model: validation.data.freeOrPaid,
        details: validation.data.pricing,
      },
      tags: validation.data.tags,
      useCases: validation.data.useCases,
      alternatives: validation.data.alternatives,
      stats: {
        rating: validation.data.rating,
        ratingCount: 0,
        views: 0,
        saves: 0,
      },
      links: {
        website: validation.data.website,
      },
      url: validation.data.website,
      source: 'live',
      verified: false, // Live fetched tools are not verified by default
      fetchedAt: new Date().toISOString(),
    };

    // STEP 6: Cache the result
    await cacheTool(trimmedName, {
      tool: liveTool,
      normalizedName: normalizeToolName(trimmedName),
    });

    return {
      success: true,
      tool: liveTool,
      source: 'live',
      normalizedName: normalizeToolName(trimmedName),
    };

  } catch (error) {
    logger.error(`Error searching for AI tool ${trimmedName}: ${error.message}`);
    
    return {
      success: false,
      error: error.message || 'Failed to fetch tool information',
      tool: null,
      source: null,
    };
  }
};

/**
 * Batch search for multiple tools
 */
export const batchSearchAiTools = async (toolNames, options = {}) => {
  const results = await Promise.all(
    toolNames.map(name => searchLiveAiTool(name, options))
  );
  
  return results.map((result, index) => ({
    ...result,
    searchTerm: toolNames[index],
  }));
};

/**
 * Clear cache for a specific tool
 */
export const clearToolCache = async (toolName) => {
  try {
    if (!redisClient.isReady) {
      return false;
    }
    
    const cacheKey = getCacheKey(toolName);
    await redisClient.del(cacheKey);
    logger.info(`Cleared cache for tool: ${toolName}`);
    return true;
  } catch (error) {
    logger.error(`Error clearing cache for ${toolName}: ${error.message}`);
    return false;
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  try {
    if (!redisClient.isReady) {
      return { ready: false };
    }
    
    const keys = await redisClient.keys('ai-tool-search:*');
    return {
      ready: true,
      cachedToolsCount: keys.length,
    };
  } catch (error) {
    return { ready: false, error: error.message };
  }
};

export default {
  searchLiveAiTool,
  batchSearchAiTools,
  clearToolCache,
  getCacheStats,
  normalizeToolName,
  validateAiTool,
};