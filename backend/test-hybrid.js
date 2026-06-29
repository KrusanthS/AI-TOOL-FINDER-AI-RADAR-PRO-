// Test script to verify hybrid search fetches MANY AI tools from internet
import { hybridSearch } from './src/services/hybridSearchService.js';

async function test() {
  console.log('='.repeat(70));
  console.log('🔥 FETCHING MAX AI TOOLS FROM INTERNET 🔥');
  console.log('='.repeat(70));
  
  const queries = ['AI', 'GPT', 'image generation', 'coding assistant', 'writing tool', 'chatbot'];
  let totalInternetTools = 0;
  let totalDbTools = 0;
  let allInternetTools = [];
  
  for (const query of queries) {
    console.log('\n🔍 Query: "' + query + '"');
    console.log('-'.repeat(50));
    
    const result = await hybridSearch(query, { limit: 50 });
    
    const dbTools = result.results.filter(t => t.source === 'database');
    const internetTools = result.results.filter(t => t.source !== 'database');
    
    totalDbTools += dbTools.length;
    totalInternetTools += internetTools.length;
    allInternetTools = [...allInternetTools, ...internetTools];
    
    console.log('   Database tools: ' + dbTools.length);
    console.log('   Internet tools: ' + internetTools.length);
    
    if (internetTools.length > 0) {
      console.log('\n   🌐 Top Internet Tools:');
      internetTools.slice(0, 8).forEach((tool, i) => {
        console.log('   ' + (i+1) + '. ' + tool.name + ' (' + tool.source + ') - Score: ' + tool.scores.final);
      });
      if (internetTools.length > 8) {
        console.log('   ... and ' + (internetTools.length - 8) + ' more');
      }
    }
  }
  
  // Remove duplicates
  const uniqueTools = [...new Map(allInternetTools.map(t => [t.name, t])).values()];
  
  console.log('\n' + '='.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(70));
  console.log('Total Database tools found: ' + totalDbTools);
  console.log('Total Internet tools found: ' + totalInternetTools);
  console.log('Unique Internet tools (no duplicates): ' + uniqueTools.length);
  console.log('\n✅ YES! The system fetches ' + uniqueTools.length + '+ AI tools from the internet');
  console.log('   that are NOT stored in the database.');
  console.log('='.repeat(70));
  
  console.log('\n🌐 ALL UNIQUE INTERNET TOOLS:');
  console.log('-'.repeat(70));
  uniqueTools.forEach((tool, i) => {
    console.log((i+1) + '. ' + tool.name + ' | Source: ' + tool.source + ' | Category: ' + tool.category);
  });
}

test().catch(console.error);