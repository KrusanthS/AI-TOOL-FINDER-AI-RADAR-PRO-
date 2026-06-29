// Test the /api/tools?category=Coding endpoint
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/tools?category=Coding&limit=20',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(`\n✅ API Response: ${json.tools?.length || 0} tools in "Coding" category\n`);
      console.log(`Total: ${json.total}, Pages: ${json.pages}, Page: ${json.currentPage}\n`);
      console.log('─'.repeat(80));
      json.tools?.forEach((t, i) => {
        console.log(`${i + 1}. ${t.name} [${t.pricing?.model || 'unknown'}]`);
        console.log(`   ${t.shortDescription || t.description?.substring(0, 100)}...`);
        console.log(`   Tags: ${(t.tags || []).slice(0, 3).join(', ')}`);
        console.log('');
      });
