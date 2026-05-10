// backend/src/utils/megaLogoSeeder.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const domainMap = {
  // LLMs
  "ChatGPT": "openai.com",
  "Claude": "anthropic.com",
  "Gemini": "google.com",
  "Copilot": "microsoft.com",
  "Grok": "x.ai",
  "Meta AI": "meta.ai",
  "Mistral AI": "mistral.ai",
  "Perplexity AI": "perplexity.ai",
  "You.com": "you.com",
  "Poe": "poe.com",
  "HuggingChat": "huggingface.co",
  "Cohere Command": "cohere.com",
  "AI21 Jurassic": "ai21.com",
  "Inflection Pi": "inflection.ai",
  "Llama": "meta.ai",
  "Falcon": "tii.ae",
  "Bloom": "huggingface.co",
  "Vicuna": "lmsys.org",
  "Alpaca": "stanford.edu",
  "WizardLM": "github.com",
  "Zephyr": "huggingface.co",
  
  // Writing
  "Jasper AI": "jasper.ai",
  "Copy.ai": "copy.ai",
  "Writesonic": "writesonic.com",
  "Rytr": "rytr.me",
  "Sudowrite": "sudowrite.com",
  "NovelAI": "novelai.net",
  "Grammarly": "grammarly.com",
  "QuillBot": "quillbot.com",
  "Wordtune": "wordtune.com",
  "Hemingway App": "hemingwayapp.com",
  "ProWritingAid": "prowritingaid.com",
  "Anyword": "anyword.com",
  "Writesonic": "writesonic.com",
  "Frase": "frase.io",
  "Surfer SEO": "surferseo.com",
  "Clearscope": "clearscope.io",
  "MarketMuse": "marketmuse.com",
  
  // Images
  "Midjourney": "midjourney.com",
  "DALL·E 3": "openai.com",
  "Stable Diffusion": "stability.ai",
  "Adobe Firefly": "adobe.com",
  "Ideogram": "ideogram.ai",
  "Leonardo AI": "leonardo.ai",
  "Playground AI": "playgroundai.com",
  "Canva AI": "canva.com",
  "Fotor AI": "fotor.com",
  "Pixlr AI": "pixlr.com",
  "Picsart AI": "picsart.com",
  "NightCafe": "nightcafe.studio",
  "Artbreeder": "artbreeder.com",
  "Craiyon": "craiyon.com",
  "BlueWillow": "bluewillow.ai",
  "Clipdrop": "clipdrop.co",
  "Getimg.ai": "getimg.ai",
  "Civitai": "civitai.com",
  
  // Video
  "Sora": "openai.com",
  "Runway ML": "runwayml.com",
  "Pika Labs": "pika.art",
  "HeyGen": "heygen.com",
  "Synthesia": "synthesia.io",
  "Descript": "descript.com",
  "Opus Clip": "opus.pro",
  "InVideo AI": "invideo.io",
  "Fliki": "fliki.ai",
  "Luma Dream Machine": "lumalabs.ai",
  "Kling AI": "klingai.com",
  "HeyGen": "heygen.com",
  "Synthesia": "synthesia.io",
  "D-ID": "d-id.com",
  
  // Audio
  "Suno AI": "suno.com",
  "Udio": "udio.com",
  "ElevenLabs": "elevenlabs.io",
  "Murf AI": "murf.ai",
  "Otter.ai": "otter.ai",
  "Whisper": "openai.com",
  "Fireflies.ai": "fireflies.ai",
  "Krisp": "krisp.ai",
  "Suno": "suno.com",
  "Udio": "udio.com",
  "ElevenLabs": "elevenlabs.io",
  "Play.ht": "play.ht",
  "Speechify": "speechify.com",
  
  // Coding
  "GitHub Copilot": "github.com",
  "Cursor": "cursor.com",
  "Replit AI": "replit.com",
  "Codeium": "codeium.com",
  "Tabnine": "tabnine.com",
  "v0": "v0.dev",
  "Bolt.new": "bolt.new",
  "Lovable": "lovable.dev",
  "Devin": "cognition-labs.com",
  "Tabnine": "tabnine.com",
  "Codeium": "codeium.com",
  "Aider": "aider.chat",
  "Sourcegraph Cody": "sourcegraph.com",
  
  // Productivity
  "Notion AI": "notion.so",
  "Slack AI": "slack.com",
  "Zoom AI Companion": "zoom.us",
  "Monday.com AI": "monday.com",
  "Asana AI": "asana.com",
  "ClickUp AI": "clickup.com",
  "Linear AI": "linear.app",
  "Superhuman": "superhuman.com",
  "Todoist": "todoist.com",
  
  // Design
  "Figma AI": "figma.com",
  "Framer AI": "framer.com",
  "Wix AI": "wix.com",
  "Webflow AI": "webflow.com",
  "Uizard": "uizard.io",
  "Galileo AI": "usegalileo.ai",
  
  // Cybersecurity
  "Darktrace": "darktrace.com",
  "CrowdStrike": "crowdstrike.com",
  "SentinelOne": "sentinelone.com",
  
  // Education
  "Khan Academy": "khanacademy.org",
  "Duolingo": "duolingo.com",
  "Coursera": "coursera.org",
  "Quizlet": "quizlet.com",
  
  // Marketing
  "Surfer SEO": "surferseo.com",
  "Semrush": "semrush.com",
  "Ahrefs": "ahrefs.com",
  "Hootsuite": "hootsuite.com",
  "Buffer": "buffer.com"
};

const getCleanDomain = (name, existingWebsite) => {
  // 1. Try to extract company name from parentheses
  const companyMatch = name.match(/\((.*?)\)/);
  const company = companyMatch ? companyMatch[1] : null;

  // 2. Check map with tool name or company name
  for (const [key, value] of Object.entries(domainMap)) {
    if (name.toLowerCase().includes(key.toLowerCase()) || (company && company.toLowerCase().includes(key.toLowerCase()))) {
      return value;
    }
  }

  // 3. If existing website is valid and not a filler, use it
  if (existingWebsite) {
    try {
      const url = new URL(existingWebsite);
      const host = url.hostname.replace('www.', '');
      if (host && !host.includes('ai-pro-tool') && !host.includes('example.com')) {
        return host;
      }
    } catch (e) {}
  }

  // 4. Smart Guessing
  let baseName = (company || name).toLowerCase()
    .replace(/ai$/i, '') // remove trailing AI
    .replace(/tool$/i, '') // remove trailing tool
    .replace(/[^a-z0-9]/g, '') // remove special chars
    .trim();
  
  if (baseName.length < 3) baseName = name.toLowerCase().replace(/[^a-z0-9]/g, '').trim();

  // Common AI TLDs to prefer if we were doing a real search, but for Clearbit we just guess .com or .ai
  // Most modern AI startups use .ai or .io
  const nameForDomain = name.toLowerCase();
  if (nameForDomain.includes('ai')) return `${baseName}.ai`;
  if (nameForDomain.includes('labs')) return `${baseName}.ai`;
  
  return `${baseName}.com`;
};

const seedLogos = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB. Starting Mega Logo Seeder...');

    const tools = await Tool.find({});
    console.log(`Found ${tools.length} tools to process.`);

    let updatedCount = 0;

    for (const tool of tools) {
      const domain = getCleanDomain(tool.name, tool.links?.website);
      
      // Clearbit is good for logos
      const logoUrl = `https://logo.clearbit.com/${domain}`;
      
      // Google Favicon as fallback (sz=128 is high res)
      // We can't easily check for image existence here without extra overhead,
      // so we'll just use Clearbit as primary and maybe Google as a fallback in the UI?
      // Actually, let's just use Clearbit for now but ensure domains are better.

      await Tool.updateOne(
        { _id: tool._id },
        { 
          $set: { 
            'media.logo': logoUrl,
            'links.website': tool.links?.website?.includes('ai-pro-tool') ? `https://${domain}` : tool.links.website
          } 
        }
      );

      updatedCount++;
      if (updatedCount % 100 === 0) {
        console.log(`Progress: ${updatedCount}/${tools.length} tools processed...`);
      }
    }

    console.log(`\n🎉 Mega Logo enrichment complete!`);
    console.log(`✅ Successfully processed: ${updatedCount} tools`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error in mega logo seeder:', error);
    process.exit(1);
  }
};

seedLogos();
