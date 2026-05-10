
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Tool from '../models/Tool.js';
import axios from 'axios';

dotenv.config();

const verifyTools = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for tool verification...');

    // 1. Famous Tool URL Mapping (Fixing my own mistakes from seeding)
    const famousTools = {
      'ChatGPT': 'https://chat.openai.com',
      'Claude': 'https://claude.ai',
      'Gemini': 'https://gemini.google.com',
      'Midjourney': 'https://www.midjourney.com',
      'Stable Diffusion': 'https://stablediffusionweb.com',
      'Perplexity AI': 'https://www.perplexity.ai',
      'Jasper AI': 'https://www.jasper.ai',
      'Copy.ai': 'https://www.copy.ai',
      'Canva AI': 'https://www.canva.com/ai-image-generator/',
      'Adobe Firefly': 'https://www.adobe.com/sensei/generative-ai/firefly.html',
      'Runway': 'https://runwayml.com',
      'Luma Dream Machine': 'https://lumalabs.ai/dream-machine',
      'Suno AI': 'https://suno.com',
      'Udio': 'https://www.udio.com',
      'ElevenLabs': 'https://elevenlabs.io',
      'Poe': 'https://poe.com',
      'Copilot': 'https://copilot.microsoft.com',
      'Leonardo AI': 'https://leonardo.ai',
      'Civitai': 'https://civitai.com',
      'Hugging Face': 'https://huggingface.co',
      'GitHub Copilot': 'https://github.com/features/copilot'
    };

    console.log('Fixing URLs for famous tools...');
    for (const [name, url] of Object.entries(famousTools)) {
      await Tool.updateOne({ name }, { $set: { 'links.website': url } });
    }

    // 2. Remove Filler Tools Immediately
    console.log('Removing filler tools...');
    const fillerResult = await Tool.deleteMany({
      $or: [
        { name: /AI Assistant v/i },
        { name: /Filler Tool/i },
        { slug: /filler/i },
        { 'links.website': /ai-tool-/i }
      ]
    });
    console.log(`Removed ${fillerResult.deletedCount} filler tools.`);

    // 3. Fetch Remaining Tools
    const tools = await Tool.find({ status: 'approved' });
    console.log(`Checking ${tools.length} tools for valid internet presence...`);

    const toolsToDelete = [];
    const batchSize = 30;

    for (let i = 0; i < tools.length; i += batchSize) {
      const batch = tools.slice(i, i + batchSize);
      console.log(`Checking batch ${i/batchSize + 1} of ${Math.ceil(tools.length / batchSize)}...`);

      const checks = batch.map(async (tool) => {
        const url = tool.links?.website;
        if (!url || !url.startsWith('http')) {
          toolsToDelete.push(tool._id);
          return;
        }

        try {
          // Use a HEAD request with a longer timeout and no content limit
          await axios.head(url, { 
            timeout: 10000, 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
            validateStatus: (status) => status < 500 // Anything below 500 is likely "exists"
          });
        } catch (error) {
          // Handle specific errors that imply the site EXISTS but rejects HEAD
          const existsImplied = 
            error.code === 'ERR_BAD_RESPONSE' || 
            error.message.includes('maxContentLength') || 
            error.message.includes('timeout') ||
            (error.response && error.response.status < 500);

          if (existsImplied) return;

          // If HEAD fails, try GET once with very small response limit
          try {
             await axios.get(url, { 
               timeout: 10000, 
               headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
               maxContentLength: 10000,
               validateStatus: (status) => status < 500
             });
          } catch (getErr) {
             const getExistsImplied = 
               getErr.message.includes('maxContentLength') || 
               getErr.message.includes('timeout') ||
               (getErr.response && getErr.response.status < 500);
             
             if (!getExistsImplied) {
                console.log(`Tool offline: ${tool.name} (${url}) - Error: ${getErr.message.substring(0, 50)}`);
                toolsToDelete.push(tool._id);
             }
          }
        }
      });

      await Promise.all(checks);
    }

    if (toolsToDelete.length > 0) {
      console.log(`Deleting ${toolsToDelete.length} tools that are not available on the internet...`);
      await Tool.deleteMany({ _id: { $in: toolsToDelete } });
    }

    const finalCount = await Tool.countDocuments({ status: 'approved' });
    console.log(`Verification complete. Final tool count: ${finalCount}`);
    
    process.exit();
  } catch (error) {
    console.error('Verification Error:', error);
    process.exit(1);
  }
};

verifyTools();
