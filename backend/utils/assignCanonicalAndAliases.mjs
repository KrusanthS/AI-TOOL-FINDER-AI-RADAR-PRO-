// backend/utils/assignCanonicalAndAliases.mjs
// STEP 17: One-time migration script that:
//   1. Assigns `canonical_categories` to every tool in the DB.
//   2. Seeds `aliases` from the tool alias registry.
//
// Run with:  node utils/assignCanonicalAndAliases.mjs
//
// Idempotent: re-running it is safe.

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Tool from '../src/models/Tool.js';
import { determineCanonicalCategories } from '../src/services/categoryRegistry.js';
import { getAliasMap } from '../src/services/toolAliasRegistry.js';
import logger from '../src/utils/logger.js';

const MONGODB_URI = process.env.MONGODB_URI;

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // ── 1) Build alias → canonical-name map for known tools ────────────────
    const aliasMap = getAliasMap();
    const canonicalNameToAliases = {};
    for (const [alias, canonical] of Object.entries(aliasMap)) {
      if (!canonicalNameToAliases[canonical]) {
        canonicalNameToAliases[canonical] = new Set();
      }
      canonicalNameToAliases[canonical].add(alias);
    }

    // Also add the canonical name itself as an alias
    for (const canonical of Object.keys(canonicalNameToAliases)) {
      canonicalNameToAliases[canonical].add(canonical.toLowerCase());
    }

    logger.info(`Built alias sets for ${Object.keys(canonicalNameToAliases).length} canonical tools`);

    // ── 2) Stream all approved tools and update each one ────────────────────
    const cursor = Tool.find({ status: 'approved' }).cursor({ batchSize: 100 });
    let processed = 0;
    let updated = 0;
    let totalWithAliases = 0;
    let totalWithMulti = 0;
    const canonicalDist = {};

    const bulkOps = [];
    const BULK_THRESHOLD = 200;

    for await (const tool of cursor) {
      processed++;
      // Compute canonical categories
      const canonical = determineCanonicalCategories(tool);
      canonical.forEach((c) => {
        canonicalDist[c] = (canonicalDist[c] || 0) + 1;
      });
      if (canonical.length > 1) totalWithMulti++;

      // Find matching aliases
      const nameLower = String(tool.name || '').toLowerCase();
      const toolNameLower = String(tool.tool_name || '').toLowerCase();
      let newAliases = [...(tool.aliases || [])];

      for (const [canonicalName, aliasSet] of Object.entries(canonicalNameToAliases)) {
        const cLower = canonicalName.toLowerCase();
        // Match by exact name or by checking each alias against the tool's name
        if (nameLower === cLower || toolNameLower === cLower) {
          for (const a of aliasSet) {
            if (!newAliases.includes(a)) newAliases.push(a);
          }
        } else {
          // Try matching by checking if any of the aliases for this canonical name
          // appear as a substring in the tool's name
          for (const a of aliasSet) {
            const aLower = a.toLowerCase();
            if (aLower.length >= 4 && (nameLower.includes(aLower) || toolNameLower.includes(aLower))) {
              if (!newAliases.includes(a)) newAliases.push(a);
            }
          }
        }
      }
      if (newAliases.length > 0) totalWithAliases++;

      // Compute search_normalized
      const normParts = [tool.name, tool.tool_name, ...newAliases]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase().replace(/[\s\-_]+/g, '').trim());
      const searchNormalized = normParts.join('|');

      bulkOps.push({
        updateOne: {
          filter: { _id: tool._id },
          update: {
            $set: {
              canonical_categories: canonical,
              aliases: newAliases,
              search_normalized: searchNormalized,
            },
          },
        },
      });

      if (bulkOps.length >= BULK_THRESHOLD) {
        const result = await Tool.bulkWrite(bulkOps, { ordered: false });
        updated += (result.modifiedCount || 0);
        bulkOps.length = 0;
        logger.info(`Processed ${processed}, updated ${updated} (${totalWithAliases} with aliases, ${totalWithMulti} in multiple categories)`);
      }
    }

    if (bulkOps.length) {
      const result = await Tool.bulkWrite(bulkOps, { ordered: false });
      updated += (result.modifiedCount || 0);
    }

    logger.info('──────────────────────────────────────');
    logger.info(`Migration complete!`);
    logger.info(`Total processed: ${processed}`);
    logger.info(`Total updated: ${updated}`);
    logger.info(`Tools with aliases: ${totalWithAliases}`);
    logger.info(`Tools in multiple canonical categories: ${totalWithMulti}`);
    logger.info('Canonical category distribution:');
    for (const [cat, count] of Object.entries(canonicalDist).sort((a, b) => b[1] - a[1])) {
      logger.info(`  ${cat}: ${count}`);
    }

    process.exit(0);
  } catch (e) {
    logger.error(`Migration error: ${e.message}`);
    logger.error(e.stack);
    process.exit(1);
  }
})();
