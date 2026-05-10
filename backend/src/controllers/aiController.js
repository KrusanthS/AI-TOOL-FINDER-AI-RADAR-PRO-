// backend/src/controllers/aiController.js
import Tool from '../models/Tool.js';
import { compareTools, recommendTools, generateEmbedding } from '../services/aiService.js';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

export const compare = async (req, res) => {
  const { toolIds } = req.body;
  if (!toolIds || !Array.isArray(toolIds) || toolIds.length < 2 || toolIds.length > 4) {
    return res.status(400).json({ error: 'Please provide between 2 and 4 tool IDs' });
  }

  try {
    const cacheKey = `compare:${toolIds.sort().join(',')}`;
    const cached = await redisClient.get(cacheKey);

    // If cached, we can't easily stream the SSE back exactly as OpenAI does,
    // but for simplicity we'll send it as a single data block if cached.
    if (cached) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.write(`data: ${JSON.stringify({ content: cached })}\n\n`);
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    const tools = await Tool.find({ _id: { $in: toolIds } });
    if (tools.length < 2) {
      return res.status(404).json({ error: 'Could not find enough tools. Please try again.' });
    }

    // Capture the output to cache it
    const originalWrite = res.write.bind(res);
    let fullResponse = '';
    res.write = (chunk) => {
      const str = chunk.toString();
      if (str.startsWith('data: ') && str !== 'data: [DONE]\n\n') {
        try {
          const data = JSON.parse(str.replace(/^data: /, ''));
          if (data.content) fullResponse += data.content;
        } catch (e) {}
      }
      return originalWrite(chunk);
    };

    res.on('finish', () => {
      if (fullResponse) {
        redisClient.setex(cacheKey, 3600, fullResponse); // Cache for 1 hour
      }
    });

    await compareTools(tools, res);

  } catch (error) {
    if (!res.headersSent) res.status(500).json({ error: error.message });
  }
};

export const recommend = async (req, res) => {
  const { query, limit = 6, pricing } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const filter = { status: 'approved' };
    if (pricing && pricing !== 'all') {
      filter['pricing.model'] = pricing;
    }

    // Check if OpenAI is configured.
    const hasRealKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-') && !process.env.OPENAI_API_KEY.includes('....');

    // 1. Initial Candidate Fetch
    let candidates = [];
    if (hasRealKey) {
      candidates = await Tool.find(
        { ...filter, $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      ).sort({ score: { $meta: 'textScore' } }).limit(20);
      
      if (candidates.length === 0) {
        candidates = await Tool.find(filter).limit(50);
      }
      
      try {
        const recommendations = await recommendTools(query, candidates);
        if (recommendations.length > 0) {
          return res.json(recommendations.slice(0, Number(limit)));
        }
      } catch (aiError) {
        logger.error(`AI Analysis failed: ${aiError.message}. Falling back to internal engine.`);
      }
    }

    // --- INTERNAL INTELLIGENT MATCHER (No API Key or AI Failed) ---
    logger.warn('Using Internal Intelligent Matcher for deep word analysis.');
    
    // Fetch tools with filter
    const allTools = await Tool.find(filter).limit(300);
    
    // 1. Analyze and clean the user's query
    const stopWords = new Set(['i', 'need', 'want', 'an', 'ai', 'that', 'can', 'help', 'me', 'with', 'to', 'and', 'for', 'a', 'the', 'is', 'in', 'of', 'tool', 'tools', 'best', 'good', 'some', 'any', 'my']);
    const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
    
    // 2. Score every tool based on word matches
    const scoredTools = allTools.map(tool => {
      let score = 0;
      let matchedWords = [];
      const searchableText = `${tool.name} ${tool.shortDescription} ${tool.description} ${tool.category} ${(tool.tags || []).join(' ')}`.toLowerCase();
      
      queryWords.forEach(word => {
        if (tool.name.toLowerCase().includes(word)) { score += 10; matchedWords.push(word); }
        else if (tool.category.toLowerCase().includes(word)) { score += 8; matchedWords.push(word); }
        else if ((tool.tags || []).some(t => t.toLowerCase().includes(word))) { score += 5; matchedWords.push(word); }
        else if (searchableText.includes(word)) { score += 2; matchedWords.push(word); }
      });
      
      // Bonus for high ratings
      if (tool.stats?.rating) {
        score += (tool.stats.rating * 0.5);
      }

      return { tool, score, matchedWords: [...new Set(matchedWords)] };
    });

    // 3. Sort by highest score
    scoredTools.sort((a, b) => b.score - a.score);
    
    // Filter out tools with 0 word matches (unless query had no meaningful words)
    const relevantTools = queryWords.length > 0 
      ? scoredTools.filter(s => s.matchedWords.length > 0)
      : scoredTools;

    const finalResults = (relevantTools.length > 0 ? relevantTools : scoredTools).slice(0, Number(limit));

    // 4. Generate intelligent explanations based on matched words
    const results = finalResults.map(item => {
      let explanation = 'Analyzed query intent and matched with top directory tools.';
      if (item.matchedWords.length > 0) {
        explanation = `Strongly matches your requirements for: "${item.matchedWords.join(', ')}". Highly rated in its category.`;
      }
      return {
        ...item.tool.toObject(),
        explanation
      };
    });

    if (results.length === 0) {
      const isDirectSearch = query.split(' ').length <= 2; // Rough heuristic for tool name search
      return res.json({ 
        message: isDirectSearch 
          ? "This AI tool is not available in our website." 
          : "Sorry, no AI tools found in our website for this use case." 
      });
    }

    return res.json(results);

  } catch (error) {
    logger.error(`Recommend controller error: ${error.message}`);
    res.status(500).json({ error: 'Search service temporarily unavailable.' });
  }
};

export const chat = async (req, res) => {
  // Implementation for chat endpoint
  res.status(501).json({ error: 'Not implemented' });
};
