// backend/src/utils/geminiRotator.js
import { GoogleGenerativeAI as RealGoogleGenerativeAI } from '@google/generative-ai';
import logger from './logger.js';

class GeminiRotator {
  constructor() {
    this.keys = [];
    if (process.env.GEMINI_API_KEY_1) this.keys.push(process.env.GEMINI_API_KEY_1);
    if (process.env.GEMINI_API_KEY_2) this.keys.push(process.env.GEMINI_API_KEY_2);
    if (process.env.GEMINI_API_KEY_3) this.keys.push(process.env.GEMINI_API_KEY_3);
    
    // Fallback for single key setup
    if (this.keys.length === 0 && process.env.GEMINI_API_KEY) {
      this.keys.push(process.env.GEMINI_API_KEY);
    }
    
    this.currentIndex = 0;
  }

  getCurrentKey() {
    if (this.keys.length === 0) return null;
    return this.keys[this.currentIndex];
  }

  rotateKey(error) {
    if (this.keys.length > 1) {
      const oldIndex = this.currentIndex;
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      logger.info(`Gemini Key ${oldIndex + 1} quota/rate-limit exceeded. Switching to Gemini Key ${this.currentIndex + 1}...`);
      return true;
    }
    return false;
  }

  isRetryableError(error) {
    if (!error) return false;
    const msg = error.message?.toLowerCase() || '';
    return error.status === 429 || 
           msg.includes('429') ||
           msg.includes('resource_exhausted') || 
           msg.includes('quota') || 
           msg.includes('rate limit') ||
           msg.includes('exhausted');
  }

  async executeWithRotation(operation) {
    if (this.keys.length === 0) {
      throw new Error('No Gemini API keys configured.');
    }

    let attempts = 0;
    const maxAttempts = this.keys.length;

    while (attempts < maxAttempts) {
      try {
        return await operation(this.getCurrentKey(), this.currentIndex);
      } catch (error) {
        if (this.isRetryableError(error) && attempts < maxAttempts - 1) {
          this.rotateKey(error);
          attempts++;
        } else {
          if (attempts >= maxAttempts - 1 && this.isRetryableError(error)) {
             logger.error('All Gemini API keys exhausted.');
          }
          throw error;
        }
      }
    }
  }

  async startupValidation() {
    if (this.keys.length === 0) {
      logger.warn('No Gemini API keys found during startup validation.');
      return;
    }

    for (let i = 0; i < this.keys.length; i++) {
      const key = this.keys[i];
      try {
        const ai = new RealGoogleGenerativeAI(key);
        // Use gemini-1.5-flash for a fast cheap check
        const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
        await model.generateContent('Hi');
        logger.info(`✅ API Key ${i + 1} is valid`);
      } catch (error) {
        if (error.message?.toLowerCase().includes('fetch') || error.code === 'ENOTFOUND') {
          logger.error(`❌ API Key ${i + 1} is unreachable: ${error.message}`);
        } else {
          logger.error(`❌ API Key ${i + 1} is invalid: ${error.message}`);
        }
      }
    }
  }
}

export const rotator = new GeminiRotator();

export const startupValidation = () => rotator.startupValidation();

export class GoogleGenerativeAI {
  constructor(apiKey) {
    // We ignore the provided apiKey in favor of our rotating keys.
  }

  getGenerativeModel(options) {
    return {
      generateContent: async (prompt) => {
        return rotator.executeWithRotation(async (key) => {
          const ai = new RealGoogleGenerativeAI(key);
          const model = ai.getGenerativeModel(options);
          return await model.generateContent(prompt);
        });
      },
      embedContent: async (prompt) => {
        return rotator.executeWithRotation(async (key) => {
          const ai = new RealGoogleGenerativeAI(key);
          const model = ai.getGenerativeModel(options);
          return await model.embedContent(prompt);
        });
      }
    };
  }
}
