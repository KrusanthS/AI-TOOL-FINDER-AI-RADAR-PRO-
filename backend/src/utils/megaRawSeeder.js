import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import slugify from 'slugify';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const RAW_FILE_PATH = path.join(__dirname, 'raw_tools_data.txt');

// Helper to clean tool name and extract company
const parseToolLine = (line) => {
  // Regex for "Number. **Name (Company)** – Description"
  const toolRegex = /^\d+\.\s+\*\*(.*?)\*\*\s+–\s+(.*)$/;
  const match = line.match(toolRegex);
  if (!match) return null;

  let fullName = match[1].trim();
  const description = match[2].trim();

  // Extract company if in parentheses
  let company = '';
  const companyMatch = fullName.match(/\((.*?)\)/);
  if (companyMatch) {
    company = companyMatch[1];
    fullName = fullName.replace(/\(.*?\)/, '').trim();
  }

  return { name: fullName, company, description };
};

// Map raw categories to standardized categories
const CATEGORY_MAP = {
  'LARGE LANGUAGE MODELS': 'Writing',
  'WRITING & CONTENT CREATION': 'Writing',
  'IMAGE GENERATION': 'Image',
  'VIDEO GENERATION': 'Video',
  'MUSIC & AUDIO GENERATION': 'Audio',
  'CODING & DEVELOPMENT': 'Coding',
  'DATA ANALYTICS': 'Data',
  'EDUCATION & LEARNING': 'Research',
  'PRODUCTIVITY & WORKPLACE': 'Productivity',
  'MARKETING & SEO': 'Marketing',
  'HEALTHCARE & MEDICAL': 'Healthcare',
  'LEGAL & COMPLIANCE': 'Legal',
  'FINANCE & FINTECH': 'Finance',
  'ECOMMERCE & RETAIL': 'Marketing',
  'CUSTOMER SERVICE & CHATBOTS': 'Productivity',
  'DESIGN & UI/UX': 'Design',
  'CYBERSECURITY': 'Cybersecurity',
  'AUTOMOTIVE': 'Other',
  'GAMING': 'Other',
  'ROBOTICS': 'Other'
};

const getCleanCategory = (rawCat) => {
  const upper = rawCat.toUpperCase();
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (upper.includes(key)) return val;
  }
  return 'Other';
};

// Smart Domain Guesser
const guessDomain = (name, company) => {
  let cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanCompany = company.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Strip 'ai' suffix if it's at the end, but only if the remaining name is long enough
  if (cleanName.endsWith('ai') && cleanName.length > 4) {
    cleanName = cleanName.slice(0, -2);
  }

  // High-priority manual mappings
  const manual = {
    'chatgpt': 'openai.com',
    'claude': 'anthropic.com',
    'gemini': 'google.com',
    'copilot': 'microsoft.com',
    'grok': 'x.ai',
    'midjourney': 'midjourney.com',
    'stablediffusion': 'stability.ai',
    'dalle': 'openai.com',
    'adobefirefly': 'adobe.com',
    'canva': 'canva.com',
    'githubcopilot': 'github.com',
    'notion': 'notion.so',
    'elevenlabs': 'elevenlabs.io',
    'runway': 'runwayml.com',
    'sora': 'openai.com',
    'jasper': 'jasper.ai',
    'copy': 'copy.ai',
    'writesonic': 'writesonic.com',
    'perplexity': 'perplexity.ai',
    'figma': 'figma.com',
    'framer': 'framer.com',
    'wix': 'wix.com',
    'squarespace': 'squarespace.com',
    'webflow': 'webflow.com',
    'freshdesk': 'freshworks.com',
    'hubspot': 'hubspot.com',
    'drift': 'drift.com',
    'tidio': 'tidio.com',
    'livechat': 'livechat.com',
    'olark': 'olark.com',
    'crisp': 'crisp.chat',
    'chatfuel': 'chatfuel.com',
    'manychat': 'manychat.com',
    'mobilemonkey': 'customers.ai',
    'landbot': 'landbot.io',
    'botpress': 'botpress.com',
    'yellow': 'yellow.ai',
    'dialogflow': 'google.com',
    'lex': 'amazon.com',
    'voiceflow': 'voiceflow.com'
  };

  if (manual[cleanName]) return manual[cleanName];
  if (manual[cleanCompany]) return manual[cleanCompany];

  // Logic for common patterns
  if (cleanCompany === 'google') return 'google.com';
  if (cleanCompany === 'microsoft') return 'microsoft.com';
  if (cleanCompany === 'amazon' || cleanCompany === 'aws') return 'aws.amazon.com';
  if (cleanCompany === 'meta') return 'meta.com';
  if (cleanCompany === 'adobe') return 'adobe.com';
  if (cleanCompany === 'ibm') return 'ibm.com';
  if (cleanCompany === 'apple') return 'apple.com';
  if (cleanCompany === 'openai') return 'openai.com';
  if (cleanCompany === 'anthropic') return 'anthropic.com';

  // Generic guess
  if (cleanName.length > 2) return `${cleanName}.com`;
  return null;
};

const seedFromRawFile = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting Raw File Seeder...');

    const fileContent = fs.readFileSync(RAW_FILE_PATH, 'utf8');
    const lines = fileContent.split('\n');

    let currentCategory = 'Other';
    const toolsToInsert = [];
    let processedCount = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Detect Category: ## 1. 🧠 CATEGORY NAME
      if (trimmed.startsWith('##')) {
        const catMatch = trimmed.match(/##\s+\d+\.\s+.*?\s+(.*)/);
        if (catMatch) {
          currentCategory = getCleanCategory(catMatch[1]);
          console.log(`Switched to category: ${currentCategory} (${catMatch[1]})`);
        }
        continue;
      }

      // Detect Tool Line
      const toolData = parseToolLine(trimmed);
      if (toolData) {
        const domain = guessDomain(toolData.name, toolData.company);
        const website = domain ? `https://${domain}` : '#';
        
        toolsToInsert.push({
          name: toolData.name,
          slug: slugify(toolData.name, { lower: true, strict: true }) + '-' + Math.random().toString(36).substring(7),
          category: currentCategory,
          shortDescription: toolData.description,
          description: `${toolData.name}${toolData.company ? ` by ${toolData.company}` : ''} is a professional AI tool specializing in ${toolData.description}. It is widely used in the ${currentCategory} industry for enhancing productivity and creativity.`,
          pricing: {
            model: processedCount % 3 === 0 ? 'freemium' : (processedCount % 2 === 0 ? 'free' : 'paid')
          },
          links: {
            website: website,
          },
          media: {
            logo: domain ? `https://logo.clearbit.com/${domain}` : null
          },
          tags: [currentCategory.toLowerCase(), 'ai', 'tool'],
          status: 'approved',
          verified: processedCount % 10 === 0,
          stats: {
            rating: (Math.random() * (5 - 4.0) + 4.0).toFixed(1),
            ratingCount: Math.floor(Math.random() * 500) + 50,
            views: Math.floor(Math.random() * 10000) + 500,
            weeklyViews: Math.floor(Math.random() * 1000) + 50
          }
        });
        processedCount++;
      }
    }

    console.log(`Parsed ${toolsToInsert.length} tools from file. Clearing database...`);
    await Tool.deleteMany({});
    
    try {
      console.log(`Inserting ${toolsToInsert.length} tools...`);
      await Tool.insertMany(toolsToInsert, { ordered: false });
      console.log(`✅ Successfully seeded ${toolsToInsert.length} tools from raw_tools_data.txt!`);
    } catch (insertError) {
      if (insertError.name === 'MongoBulkWriteError') {
        console.log(`Partial success: ${insertError.result.nInserted} tools inserted. ${insertError.writeErrors.length} errors occurred (likely duplicates).`);
      } else {
        console.error('Insertion failed:', insertError.message);
      }
    }
    process.exit(0);
  } catch (error) {
    console.error('Error seeding from raw file:', error);
    process.exit(1);
  }
};

seedFromRawFile();
