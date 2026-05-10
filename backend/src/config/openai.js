// backend/src/config/openai.js
import OpenAI from 'openai';
import logger from '../utils/logger.js';

let openai;

if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('sk-....')) {
  logger.warn('OpenAI API Key is missing or invalid. AI features will be limited.');
  // Create a dummy client that logs errors instead of throwing
  openai = {
    chat: {
      completions: {
        create: () => {
          throw new Error('OpenAI API Key not configured');
        }
      }
    },
    embeddings: {
      create: () => {
        throw new Error('OpenAI API Key not configured');
      }
    }
  };
} else {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

export default openai;

