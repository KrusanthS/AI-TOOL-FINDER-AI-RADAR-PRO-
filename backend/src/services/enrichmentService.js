import Groq from 'groq-sdk';
import axios from 'axios';
import * as cheerio from 'cheerio';
import Tool from '../models/Tool.js';
import { syncToolToVectorDB } from './aiSearchService.js';
import logger from '../utils/logger.js';

let groq = null;
const getGroq = () => {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
};

// Block SSRF: only allow https to public internet, never internal/loopback
const isSafeExternalUrl = (urlStr) => {
  try {
    const u = new URL(urlStr);
    if (u.protocol !== 'https:') return false;
    const host = u.hostname;
    return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|169\.254\.|::1$)/.test(host);
  } catch {
    return false;
  }
};

/**
 * PHASE 2 - INTERNET ENRICHMENT
 * Helper function to scrape a website briefly to get context if metadata is missing.
 */
const scrapeWebsiteContent = async (url) => {
  if (!url || !isSafeExternalUrl(url)) return '';
  try {
    const { data } = await axios.get(url, { timeout: 5000, maxRedirects: 3 });
    const $ = cheerio.load(data);
    
    // Extract main text content, limiting to first 3000 chars to save tokens
    $('script, style, noscript, iframe').remove();
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    return text.substring(0, 3000);
  } catch (error) {
    logger.warn(`Could not scrape ${url}: ${error.message}`);
    return '';
  }
};

/**
 * PHASE 1 & 2 - COMPLETE AI TOOL AUDIT AND INTERNET ENRICHMENT
 * Evaluates an existing tool in the database, searches for missing info using LLM knowledge
 * and optional scraping, and updates the database with the rich schema.
 */
export const enrichAndOptimizeTool = async (toolId) => {
  try {
    const tool = await Tool.findById(toolId);
    if (!tool) throw new Error("Tool not found");

    const groqClient = getGroq();

    // Optionally scrape website if available and we lack description
    let scrapedContent = '';
    if (tool.website_url || (tool.links && tool.links.website)) {
       const targetUrl = tool.website_url || tool.links.website;
       scrapedContent = await scrapeWebsiteContent(targetUrl);
    }

    const currentData = JSON.stringify({
      name: tool.tool_name || tool.name,
      description: tool.long_description || tool.description || tool.shortDescription,
      category: tool.categories || tool.category,
      website: tool.website_url || tool?.links?.website,
      scraped_context: scrapedContent
    });

    const enrichmentPrompt = `You are an expert AI Data Enrichment System. 
I have partial data for an AI tool. Use your vast knowledge base and the provided context to fill in all the missing details according to this exact schema. Do not make up URLs, but you MUST deduce the workflows, features, and capabilities based on the tool's known functionality.

Current Data:
${currentData}

Return a JSON object matching this schema exactly:
{
  "tool_name": "String",
  "short_description": "String (1-2 sentences max)",
  "long_description": "String (Detailed explanation)",
  "categories": ["String"],
  "subcategories": ["String"],
  "primary_use_cases": ["String"],
  "secondary_use_cases": ["String"],
  "workflows": ["String"],
  "tags": ["String"],
  "industries": ["String"],
  "integrations": ["String"],
  "api_available": Boolean,
  "open_source": Boolean,
  "pricing_type": "free" | "freemium" | "paid" | "enterprise" | "unknown",
  "ai_models_supported": ["String"],
  "features": ["String"],
  "strengths": ["String"],
  "weaknesses": ["String"],
  "alternatives": ["String"],
  "competitors": ["String"],
  "automation_level": "none" | "partial" | "full" | "agentic" | "unknown",
  "agent_capabilities": Boolean,
  "semantic_keywords": ["String"]
}`;

    const completion = await groqClient.chat.completions.create({
      messages: [{ role: 'system', content: "Return ONLY valid JSON." }, { role: 'user', content: enrichmentPrompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      response_format: { type: "json_object" }
    });

    const rawContent = completion.choices[0].message.content;
    let enrichedData;
    try {
      // Extract JSON safely — LLMs occasionally wrap in markdown code fences
      const match = rawContent.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON object found in LLM response');
      enrichedData = JSON.parse(match[0]);
      // Validate it's a plain object, not an array or primitive
      if (typeof enrichedData !== 'object' || Array.isArray(enrichedData)) {
        throw new Error('LLM returned unexpected JSON shape');
      }
    } catch (parseErr) {
      throw new Error(`Failed to parse enrichment response: ${parseErr.message}`);
    }

    // Apply enriched data to tool
    Object.assign(tool, enrichedData);
    
    // Save to trigger pre-save hooks (like slug generation)
    await tool.save();

    // Generate new embeddings and sync to Pinecone
    await syncToolToVectorDB(tool);

    return tool;
  } catch (error) {
    console.error(`Enrichment failed for tool ${toolId}: ${error.message}`);
    logger.error(`Enrichment failed for tool ${toolId}: ${error.message}`);
    throw error;
  }
};

/**
 * Batch process tools that need enrichment
 */
export const runBatchEnrichment = async (limit = 10) => {
  // Find tools that haven't been fully enriched yet (e.g. missing primary_use_cases)
  const toolsToEnrich = await Tool.find({ 
    $or: [
      { primary_use_cases: { $exists: false } },
      { primary_use_cases: { $size: 0 } },
      { automation_level: 'unknown' }
    ]
  }).limit(limit);

  console.log(`Found ${toolsToEnrich.length} tools to enrich.`);

  const results = [];
  for (const tool of toolsToEnrich) {
    console.log(`Enriching tool: ${tool.tool_name || tool.name}`);
    try {
      const enriched = await enrichAndOptimizeTool(tool._id);
      results.push({ id: tool._id, status: 'success', name: enriched.tool_name });
      
      // Delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      results.push({ id: tool._id, status: 'failed', error: err.message });
    }
  }

  return results;
};
