// backend/src/services/scrapingService.js
import axios from 'axios';
import logger from '../utils/logger.js';

export const fetchProductHuntAITools = async (cursor = null) => {
  if (!process.env.PRODUCTHUNT_TOKEN || process.env.PRODUCTHUNT_TOKEN === 'your-ph-token') {
    logger.warn('ProductHunt API token missing. Skipping ProductHunt scrape.');
    return null;
  }

  try {
    const query = `
      query {
        posts(first: 20, topic: "artificial-intelligence" ${cursor ? `, after: "${cursor}"` : ''}) {
          edges {
            node {
              id
              name
              tagline
              description
              website
              thumbnail {
                url
              }
              topics {
                edges {
                  node {
                    name
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const response = await axios.post(
      'https://api.producthunt.com/v2/api/graphql',
      { query },
      {
        headers: {
          'Authorization': `Bearer ${process.env.PRODUCTHUNT_TOKEN}`,
          'Accept': 'application/json'
        }
      }
    );

    return response.data?.data?.posts || null;
  } catch (error) {
    if (error.response?.status === 401) {
      logger.warn('ProductHunt token invalid (401). Please check your PRODUCTHUNT_TOKEN in .env');
    } else {
      logger.error(`ProductHunt scrape error: ${error.message}`);
    }
    return null;
  }
};

export const fetchGitHubAITools = async (page = 1) => {
  try {
    const query = encodeURIComponent('topic:ai topic:machine-learning sort:stars');
    const response = await axios.get(
      `https://api.github.com/search/repositories?q=${query}&per_page=20&page=${page}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    return response.data.items;
  } catch (error) {
    logger.error(`GitHub scrape error: ${error.message}`);
    return [];
  }
};

export const autonomousAISearch = async (category = "General") => {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-....')) {
    logger.warn('OpenAI API Key not configured. Skipping autonomous AI search.');
    return [];
  }

  try {
    const { default: openai } = await import('../config/openai.js');
    
    const prompt = `
      You are an autonomous AI tool discovery agent. Search your knowledge base and the web (if you have browsing capability) to find 15 real, existing AI tools related to the category: "${category}". 
      Try to find lesser-known or newly released tools, not just the massive popular ones like ChatGPT.
      Return a JSON object with a "tools" array. Each object should have:
      - name: The exact name of the tool
      - tagline: A very short 1-sentence description
      - description: A detailed description of what it does
      - website: The official URL (guess it if you have to, e.g., https://name.ai)
      - category: The category it belongs to (e.g., Video, Audio, Coding, Productivity, Image, Text, Design)
    `;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    return parsed.tools || [];
  } catch (error) {
    if (error.message.includes('Key not configured')) {
      logger.warn('Autonomous AI search skipped: OpenAI key not configured.');
    } else {
      logger.error(`Autonomous AI search error: ${error.message}`);
    }
    return [];
  }
};

