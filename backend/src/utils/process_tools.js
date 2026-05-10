
import fs from 'fs';
import path from 'path';
import slugify from 'slugify';

const rawDataPath = 'c:/Users/krusa/OneDrive/Desktop/Folder/AI-PROJECTS/ai-radar-pro/backend/src/utils/raw_tools_data.txt';
const outputPath = 'c:/Users/krusa/OneDrive/Desktop/Folder/AI-PROJECTS/ai-radar-pro/backend/src/utils/tools_enriched.json';

const pricingModels = ['free', 'freemium', 'paid', 'enterprise'];

function guessWebsite(name) {
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const commonWebsites = {
        'chatgpt': 'https://chat.openai.com',
        'claude': 'https://claude.ai',
        'gemini': 'https://gemini.google.com',
        'copilot': 'https://copilot.microsoft.com',
        'grok': 'https://x.ai',
        'perplexity': 'https://perplexity.ai',
        'midjourney': 'https://midjourney.com',
        'dalle': 'https://openai.com/dall-e-3',
        'stablediffusion': 'https://stability.ai',
        'githubcopilot': 'https://github.com/features/copilot',
        'cursor': 'https://cursor.sh',
        'notion': 'https://notion.so',
        'canva': 'https://canva.com',
        'figma': 'https://figma.com',
        'elevenlabs': 'https://elevenlabs.io',
        'suno': 'https://suno.com',
        'udio': 'https://udio.com',
        'runway': 'https://runwayml.com',
        'pika': 'https://pika.art',
        'heygen': 'https://heygen.com',
        'synthesia': 'https://synthesia.io'
    };

    if (commonWebsites[cleanName]) return commonWebsites[cleanName];
    
    // Fallback guess
    return `https://${cleanName}.ai`;
}

function getPricingModel(category, name) {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('open source') || nameLower.includes('free')) return 'free';
    if (category.includes('Enterprise') || nameLower.includes('ibm') || nameLower.includes('microsoft') || nameLower.includes('google')) return 'enterprise';
    return 'freemium'; // Default for most AI tools
}

function processData() {
    const data = fs.readFileSync(rawDataPath, 'utf8');
    const lines = data.split('\n');
    const tools = [];
    let currentCategory = '';

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Match category headers: ## 1. 🧠 CATEGORY NAME
        const categoryMatch = line.match(/^## \d+\. .*? (.*)/);
        if (categoryMatch) {
            currentCategory = categoryMatch[1].trim();
            return;
        }

        // Match tool items: 1. **Name** – Description
        // Some lines might not have bolding or different dashes
        const toolMatch = line.match(/^\d+\. \*\*(.*?)\*\*(?: \((.*?)\))? [–-] (.*)/);
        if (toolMatch) {
            const name = toolMatch[1].trim();
            const company = toolMatch[2] ? toolMatch[2].trim() : '';
            const description = toolMatch[3].trim();
            
            const fullName = company ? `${name} (${company})` : name;
            const slug = slugify(name, { lower: true, strict: true });

            const tool = {
                name: fullName,
                slug: slug,
                category: currentCategory,
                shortDescription: description.substring(0, 300),
                description: description,
                pricing: {
                    model: getPricingModel(currentCategory, name),
                },
                links: {
                    website: guessWebsite(name)
                },
                tags: [
                    currentCategory.toLowerCase().split(' ')[0],
                    name.toLowerCase().replace(/\s/g, '-'),
                    'ai',
                    'tool'
                ].filter(t => t.length > 2),
                features: description.split(',').map(f => f.trim()).filter(f => f.length > 2),
                source: 'manual',
                status: 'approved',
                stats: {
                    rating: (Math.random() * (5 - 4) + 4).toFixed(1), // Random high rating for priority tools
                    ratingCount: Math.floor(Math.random() * 500) + 10,
                    views: Math.floor(Math.random() * 10000) + 100,
                    weeklyViews: Math.floor(Math.random() * 500) + 10
                },
                aiMeta: {
                    useCases: description.split(',').map(f => f.trim()),
                    summary: `Leading AI tool in ${currentCategory} category.`
                }
            };

            tools.push(tool);
        }
    });

    // Remove duplicates by slug
    const uniqueTools = [];
    const seenSlugs = new Set();
    tools.forEach(tool => {
        if (!seenSlugs.has(tool.slug)) {
            seenSlugs.add(tool.slug);
            uniqueTools.push(tool);
        }
    });

    console.log(`Processed ${uniqueTools.length} unique tools.`);
    fs.writeFileSync(outputPath, JSON.stringify(uniqueTools, null, 2));
}

processData();
