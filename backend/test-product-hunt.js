// Test Product Hunt RSS Feed
import { hybridSearch } from './src/services/hybridSearchService.js';

async function test() {
  console.log('Testing Hybrid Search with Product Hunt...\n');
  
  const result = await hybridSearch('AI', { limit: 10 });
  
  console.log('=== Sources ===');
  console.log('Database:', result.sources.database);
  console.log('GitHub:', result.sources.github);
  console.log('HuggingFace:', result.sources.huggingface);
  console.log('Hacker News:', result.sources.hacker_news);
  console.log('Product Hunt:', result.sources.product_hunt);
  console.log('RSS:', result.sources.rss);
  console.log('');
  
  console.log('=== Product Hunt Tools ===');
  const phTools = result.results.filter(t => t.source === 'product_hunt');
  phTools.forEach((tool, i) => {
    console.log((i+1) + '. ' + tool.name);
    console.log('   URL: ' + tool.url);
    console.log('   Category: ' + tool.category);
    console.log('');
  });
  
  if (result.sources.product_hunt > 0) {
    console.log('✅ Product Hunt is WORKING! Found ' + result.sources.product_hunt + ' tools');
  } else {
    console.log('❌ Product Hunt returned no results');
  }
}

test().catch(console.error);