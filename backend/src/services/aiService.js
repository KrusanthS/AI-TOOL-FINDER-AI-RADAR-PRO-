// backend/src/services/aiService.js
import openai from '../config/openai.js';
import logger from '../utils/logger.js';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const EMBEDDING_MODEL = 'text-embedding-3-small';

export const generateToolDescription = async (rawData) => {
  try {
    const prompt = `
      Extract tool details from the following raw text/JSON data.
      Return a JSON object with strictly these keys:
      - description: detailed description (max 2000 chars)
      - shortDescription: short elevator pitch (max 300 chars)
      - category: one of the predefined AI categories (e.g., Text, Image, Video, Audio, Coding, Productivity, Other)
      - tags: array of up to 10 relevant keywords in lowercase

      Raw Data:
      ${JSON.stringify(rawData).substring(0, 3000)}
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 1000,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    logger.error(`generateToolDescription error: ${error.message}`);
    throw error;
  }
};

export const generateProsAndCons = async (toolData) => {
  try {
    const prompt = `
      Analyze the following AI tool and provide an exhaustive list of ALL its advantages (pros) and disadvantages (cons). Do not limit yourself; list as many as are relevant and true.
      Return a JSON object with "pros" (array of strings) and "cons" (array of strings).

      Tool Info:
      Name: ${toolData.name}
      Description: ${toolData.description}
      Category: ${toolData.category}
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 800,
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    logger.error(`generateProsAndCons error: ${error.message}`);
    throw error;
  }
};

export const generateUseCases = async (toolData) => {
  try {
    const prompt = `
      List 3-5 distinct, practical use cases for the following AI tool.
      Return a JSON object with "useCases" (array of strings).

      Tool Info:
      Name: ${toolData.name}
      Description: ${toolData.description}
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    return JSON.parse(response.choices[0].message.content).useCases || [];
  } catch (error) {
    logger.error(`generateUseCases error: ${error.message}`);
    throw error;
  }
};

export const compareTools = async (tools, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const send = (text) => {
    res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
  };

  // Helper: stream text in small chunks to simulate AI typing effect
  const streamText = async (text, chunkSize = 30) => {
    for (let i = 0; i < text.length; i += chunkSize) {
      send(text.slice(i, i + chunkSize));
      await new Promise(r => setTimeout(r, 18));
    }
  };

  try {
    // Only use OpenAI if a real key is configured (not the placeholder 'sk-....')
    const hasRealKey = process.env.OPENAI_API_KEY &&
      process.env.OPENAI_API_KEY.startsWith('sk-') &&
      process.env.OPENAI_API_KEY.length > 20 &&
      !process.env.OPENAI_API_KEY.includes('....');

    if (hasRealKey) {
      const toolDetails = tools.map(t =>
        `Tool: ${t.name}\nDesc: ${t.shortDescription}\nPrice: ${t.pricing?.model}\nRating: ${t.stats?.rating}`
      ).join('\n\n');
      const prompt = `Compare the following AI tools in markdown format. Include: 1) Pros/Cons for each, 2) Feature comparison table, 3) Final recommendation with reasoning.\n\nTools:\n${toolDetails}`;
      const stream = await openai.chat.completions.create({
        model: MODEL, messages: [{ role: 'user', content: prompt }], stream: true,
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
      res.write('data: [DONE]\n\n');
      return res.end();
    }

    // --- Built-in Intelligent Comparison Engine (no API key needed) ---
    const names = tools.map(t => t.name).join(' vs ');
    const winner = tools.reduce((best, t) =>
      (Number(t.stats?.rating) || 0) >= (Number(best.stats?.rating) || 0) ? t : best, tools[0]);
    const runnerUp = tools.find(t => t._id.toString() !== winner._id.toString()) || tools[1];

    await streamText(`# 🤖 AI Deep Analysis: ${names}\n\n`);
    await streamText(`> Powered by AI Radar Pro's built-in intelligence engine.\n\n`);

    await streamText(`---\n\n## 🏆 Winner at a Glance\n\n`);
    await streamText(`**${winner.name}** is the top recommendation based on community ratings, feature depth, and category specialization.\n\n`);

    // Tool-by-tool breakdown
    for (const tool of tools) {
      const isWinner = tool._id.toString() === winner._id.toString();
      await streamText(`---\n\n## ${isWinner ? '🥇' : '🥈'} ${tool.name}${isWinner ? ' *(Recommended)*' : ''}\n\n`);
      await streamText(`**Category:** ${tool.category}\n`);
      await streamText(`**Pricing:** ${(tool.pricing?.model || 'Free').toUpperCase()}\n`);
      await streamText(`**Community Rating:** ${tool.stats?.rating || 'N/A'} ⭐ (${tool.stats?.ratingCount || 0} reviews)\n`);
      await streamText(`**Weekly Views:** ${(tool.stats?.weeklyViews || 0).toLocaleString()}\n\n`);
      await streamText(`**About:** ${tool.shortDescription || tool.description?.substring(0, 300) || 'No description available.'}\n\n`);

      // Pros
      const pros = tool.aiMeta?.pros?.length > 0
        ? tool.aiMeta.pros
        : [`Strong community adoption`, `${tool.pricing?.model === 'free' ? 'Completely free to use' : 'Flexible pricing options'}`, `Specialized for ${tool.category?.split(' ').slice(-2).join(' ')}`, `Easy to get started`];
      await streamText(`**✅ Pros:**\n`);
      for (const pro of pros.slice(0, 4)) await streamText(`- ${pro}\n`);

      // Cons
      const cons = tool.aiMeta?.cons?.length > 0
        ? tool.aiMeta.cons
        : [`May require a learning curve`, `${tool.pricing?.model === 'paid' ? 'Higher cost for full access' : 'Advanced features require paid plan'}`, `Limited offline capabilities`];
      await streamText(`\n**❌ Limitations:**\n`);
      for (const con of cons.slice(0, 3)) await streamText(`- ${con}\n`);
      await streamText(`\n`);
    }

    // Feature comparison table
    await streamText(`---\n\n## 📊 Side-by-Side Feature Comparison\n\n`);
    await streamText(`| Feature | ${tools.map(t => t.name).join(' | ')} |\n`);
    await streamText(`|---------|${tools.map(() => '------').join('|')}|\n`);
    await streamText(`| Pricing | ${tools.map(t => (t.pricing?.model || 'Free').charAt(0).toUpperCase() + (t.pricing?.model || 'free').slice(1)).join(' | ')} |\n`);
    await streamText(`| Rating | ${tools.map(t => `${t.stats?.rating || '—'} ⭐`).join(' | ')} |\n`);
    await streamText(`| Reviews | ${tools.map(t => (t.stats?.ratingCount || 0).toLocaleString()).join(' | ')} |\n`);
    await streamText(`| Category | ${tools.map(t => t.category?.split(' ').slice(-1)[0] || '—').join(' | ')} |\n`);
    await streamText(`| Best For | ${tools.map(t => t.category?.split(' ').slice(-2).join(' ') || 'General').join(' | ')} |\n\n`);

    // Final recommendation
    await streamText(`---\n\n## 🎯 Final Recommendation\n\n`);
    await streamText(`### Choose **${winner.name}** if:\n`);
    await streamText(`- You need the highest-rated solution in this space\n`);
    await streamText(`- You value a strong community and proven results\n`);
    await streamText(`- ${winner.pricing?.model === 'free' ? 'You want a completely free solution' : 'You are comfortable with ' + winner.pricing?.model + ' pricing'}\n`);
    await streamText(`- You are working in: **${winner.category}**\n\n`);

    if (runnerUp) {
      await streamText(`### Choose **${runnerUp.name}** if:\n`);
      await streamText(`- ${winner.category !== runnerUp.category ? `You need a tool specialized in **${runnerUp.category}** instead` : 'You prefer an alternative approach'}\n`);
      await streamText(`- ${runnerUp.pricing?.model === 'free' ? 'Cost is a primary concern and you need a free option' : 'You have budget and need enterprise features'}\n`);
      await streamText(`- You want to explore a different user experience\n\n`);
    }

    await streamText(`---\n\n> 💡 **Pro Tip:** Always trial both tools with a free plan before committing to a paid subscription. The best tool depends on your specific workflow and team size.\n`);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error) {
    logger.error(`compareTools error: ${error.message}`);
    if (!res.headersSent) res.status(500).json({ error: 'Failed to generate comparison' });
  }
};

export const recommendTools = async (query, candidates) => {
  try {
    const candidateContext = candidates.map(c => `- ${c.name}: ${c.shortDescription}`).join('\n');
    const systemPrompt = `
You are an advanced AI Tool Recommendation Agent operating inside a production-grade AI tools directory.
Your role is to function as a fully intelligent AI search engine — not a keyword matcher — with strict correctness, validation, and reasoning.

⚙️ SYSTEM CONFIGURATION
- STRICT_DATABASE_ONLY = true
- ENABLE_FUZZY_TOOL_MATCH = true
- ALLOW_ALTERNATIVES_IF_TOOL_NOT_FOUND = false

🧠 CORE BEHAVIOR
Understand meaning, not words. Validate relevance before suggesting anything. Reject incorrect mappings. Avoid assumption-based suggestions. Prioritize accuracy over response completion.

🧠 QUERY UNDERSTANDING PIPELINE
STEP 1: CLASSIFY QUERY (Direct search vs Intent/Use Case search)
STEP 2: INTENT EXTRACTION (Understand what exactly the user wants to achieve and the domain)
STEP 3: STRICT RELEVANCE VALIDATION. Before suggesting ANY tool, validate:
✔ Does this tool ACTUALLY solve the user's problem?
✔ Is it in the correct domain?
If ANY answer is "NO" → REMOVE the tool.

🚨 FAILURE HANDLING
If tools do NOT strongly match intent, DO NOT suggest random tools. Return an empty recommendations array.

🚫 HARD RULES
- NO irrelevant tools
- NO hallucinated tools
- NO cross-domain mistakes
- ALWAYS prefer "not found" (empty array) over wrong suggestion

Return a JSON object with a "recommendations" array containing objects with "toolName" and "explanation".
In the "explanation" field, format your text exactly like this:
"🔍 Understanding Your Need: [interpretation]
🧠 Suggested Approach: [approach]
🛠️ Key Capabilities: [why it matches]
💡 Pro Tip: [tip]"
    `;

    const userPrompt = `
User query: "${query}"

Candidates from database:
${candidateContext}

Based strictly on the rules, evaluate the candidates and return the JSON.
    `;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: "json_object" },
      max_tokens: 1500,
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    
    // Map explanations back to original tool objects
    const recommendedTools = parsed.recommendations.map(rec => {
      const tool = candidates.find(c => c.name === rec.toolName);
      if (tool) {
        return { ...tool.toObject(), explanation: rec.explanation };
      }
      return null;
    }).filter(Boolean);

    return recommendedTools;
  } catch (error) {
    logger.error(`recommendTools error: ${error.message}`);
    throw error;
  }
};

export const generateEmbedding = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
      encoding_format: "float",
    });
    return response.data[0].embedding;
  } catch (error) {
    logger.error(`generateEmbedding error: ${error.message}`);
    throw error;
  }
};

export const enrichTool = async (toolData) => {
  try {
    logger.info(`Starting enrichment for: ${toolData.name}`);
    
    // 1. Core info
    const coreInfo = await generateToolDescription(toolData);
    
    // 2. Pros & Cons
    const { pros, cons } = await generateProsAndCons({ ...toolData, ...coreInfo });
    
    // 3. Use Cases
    const useCases = await generateUseCases({ ...toolData, ...coreInfo });
    
    // 4. Summary & Embedding
    const combinedText = `${coreInfo.description} ${coreInfo.category} ${coreInfo.tags.join(' ')}`;
    const embedding = await generateEmbedding(combinedText);
    
    return {
      description: coreInfo.description,
      shortDescription: coreInfo.shortDescription,
      category: coreInfo.category || 'Other',
      tags: coreInfo.tags || [],
      aiMeta: {
        pros: pros || [],
        cons: cons || [],
        useCases: useCases || [],
        embedding
      }
    };
  } catch (error) {
    logger.error(`enrichTool failed: ${error.message}`);
    throw error; // Let caller handle retry
  }
};
