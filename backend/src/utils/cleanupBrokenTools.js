/**
 * cleanupBrokenTools.js
 * Checks every approved tool in the DB:
 *   1. website_url / links.website  → must return HTTP 2xx/3xx (not 404/timeout)
 *   2. logo_url / media.logo        → must return an image (Content-Type image/*)
 * Tools that fail either check are PERMANENTLY DELETED from MongoDB.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import https from 'https';
import http from 'http';
import { URL } from 'url';

// ── DB connection ──────────────────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('MONGODB_URI missing in .env'); process.exit(1); }

// ── Inline Tool schema (avoids importing the full model tree) ──────────────────
const toolSchema = new mongoose.Schema({}, { strict: false, collection: 'tools' });
const Tool = mongoose.model('Tool', toolSchema);

// ── HTTP helper ────────────────────────────────────────────────────────────────
const TIMEOUT_MS = 10000;
const MAX_REDIRECTS = 5;

function checkUrl(rawUrl, mustBeImage = false, redirectCount = 0) {
  return new Promise((resolve) => {
    if (!rawUrl || typeof rawUrl !== 'string') return resolve(false);

    let parsed;
    try { parsed = new URL(rawUrl.trim()); } catch { return resolve(false); }

    const lib = parsed.protocol === 'https:' ? https : http;
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: mustBeImage ? 'GET' : 'HEAD',
      timeout: TIMEOUT_MS,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AIRadarBot/1.0)' },
    };

    const req = lib.request(options, (res) => {
      const { statusCode, headers } = res;
      // Consume body to free socket
      res.resume();

      // Follow redirects
      if ([301, 302, 303, 307, 308].includes(statusCode) && headers.location && redirectCount < MAX_REDIRECTS) {
        const next = headers.location.startsWith('http')
          ? headers.location
          : `${parsed.protocol}//${parsed.hostname}${headers.location}`;
        return resolve(checkUrl(next, mustBeImage, redirectCount + 1));
      }

      if (statusCode === 404 || statusCode === 410) return resolve(false);
      if (statusCode >= 200 && statusCode < 400) {
        if (mustBeImage) {
          const ct = (headers['content-type'] || '').toLowerCase();
          return resolve(ct.startsWith('image/') || ct.includes('svg'));
        }
        return resolve(true);
      }
      // 5xx or other — treat as broken
      return resolve(false);
    });

    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.on('error', () => resolve(false));
    req.end();
  });
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connected to MongoDB\n');

  const tools = await Tool.find({ status: { $ne: 'rejected' } }).lean();
  console.log(`🔍  Checking ${tools.length} tools...\n`);

  let deleted = 0;
  let kept = 0;

  for (const tool of tools) {
    const name = tool.tool_name || tool.name || tool._id;

    // Resolve website URL (support both schema shapes)
    const websiteUrl =
      tool.website_url ||
      tool.links?.website ||
      tool.website ||
      null;

    // Resolve logo URL
    const logoUrl =
      tool.logo_url ||
      tool.media?.logo ||
      tool.logo ||
      null;

    // ── 1. Check website ──────────────────────────────────────────────────────
    const websiteOk = await checkUrl(websiteUrl, false);
    if (!websiteOk) {
      await Tool.deleteOne({ _id: tool._id });
      console.log(`❌  DELETED (broken website) → ${name}  [${websiteUrl || 'no URL'}]`);
      deleted++;
      continue; // no need to check logo
    }

    // ── 2. Check logo ─────────────────────────────────────────────────────────
    const logoOk = await checkUrl(logoUrl, true);
    if (!logoOk) {
      await Tool.deleteOne({ _id: tool._id });
      console.log(`❌  DELETED (broken/missing logo) → ${name}  [${logoUrl || 'no logo'}]`);
      deleted++;
      continue;
    }

    console.log(`✅  OK → ${name}`);
    kept++;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Total checked : ${tools.length}`);
  console.log(`  Kept          : ${kept}`);
  console.log(`  Deleted       : ${deleted}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  await mongoose.disconnect();
  console.log('🔌  Disconnected. Done.');
}

main().catch((err) => { console.error(err); process.exit(1); });
