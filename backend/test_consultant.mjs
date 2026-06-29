// test_consultant.mjs
// Smoke test for the new LLM-first consultant architecture

import { pathToFileURL } from 'url';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const modulesToTest = [
  './src/models/Tool.js',
  './src/services/llmConsultantService.js',
  './src/services/capabilitySearchService.js',
  './src/services/toolValidationService.js',
  './src/services/intentCacheService.js',
  './src/services/intentWebDiscoveryService.js',
  './src/services/recommendationService.js',
  './src/services/aiConsultantOrchestrator.js',
  './src/controllers/consultantController.js',
  './src/routes/consultant.js',
];

let passed = 0;
let failed = 0;
const failures = [];

for (const mod of modulesToTest) {
  const absPath = resolve(__dirname, mod);
  const fileUrl = pathToFileURL(absPath).href;
  try {
    await import(fileUrl);
    console.log(`✓ ${mod}`);
    passed++;
  } catch (e) {
    console.log(`✗ ${mod}`);
    console.log(`  ${e.message}`);
    failures.push({ mod, err: e });
    failed++;
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Smoke test results: ${passed} passed, ${failed} failed`);
if (failed === 0) {
  console.log('✓ All modules can be imported successfully');
  process.exit(0);
} else {
  console.log('\nFailures:');
  for (const f of failures) {
    console.log(`  - ${f.mod}: ${f.err.message.split('\n')[0]}`);
  }
  process.exit(1);
}
