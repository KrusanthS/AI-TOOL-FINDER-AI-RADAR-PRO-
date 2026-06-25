// backend/src/services/toolValidationService.js
// TOOL VALIDATION
// Every discovered tool must be verified before being recommended

import axios from 'axios';
import logger from '../utils/logger.js';

const TIMEOUT = 8000;
const MIN_DESCRIPTION_LENGTH = 15;
const REQUIRED_FIELDS = ['name', 'description', 'category'];

/**
 * Validate a tool object before it can be recommended.
 * Returns { valid, errors, warnings, normalized }.
 */
export function validateToolData(tool) {
  const errors = [];
  const warnings = [];

  if (!tool) {
    return { valid: false, errors: ['Tool is null/undefined'], warnings: [], normalized: null };
  }

  // Required fields
  for (const field of REQUIRED_FIELDS) {
    if (!tool[field] || String(tool[field]).trim().length < 2) {
      errors.push(`Missing or invalid required field: ${field}`);
    }
  }

  // Description quality
  const desc = tool.description || tool.shortDescription || '';
  if (desc.length < MIN_DESCRIPTION_LENGTH) {
    warnings.push(`Description is very short (${desc.length} chars)`);
  }

  // URL validation
  const url = tool.url || tool.links?.website || tool.website_url;
  if (url) {
    try {
      new URL(url);
    } catch {
      errors.push(`Invalid URL: ${url}`);
    }
  } else {
    warnings.push('No website URL provided');
  }

  // Duplicate detection (by normalized name)
  const normalized = normalizeTool(tool);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    normalized,
  };
}

/**
 * Validate a URL is reachable (HEAD request).
 * Returns { reachable, statusCode, finalUrl, redirected }.
 */
export async function validateUrlReachability(url) {
  if (!url) return { reachable: false, reason: 'no_url' };

  try {
    new URL(url); // throw if malformed
  } catch {
    return { reachable: false, reason: 'invalid_url' };
  }

  try {
    const res = await axios.head(url, {
      timeout: TIMEOUT,
      maxRedirects: 5,
      validateStatus: () => true,
      headers: { 'User-Agent': 'AIRadarValidator/1.0' },
    });
    return {
      reachable: res.status >= 200 && res.status < 400,
      statusCode: res.status,
      finalUrl: res.request?.res?.responseUrl || url,
      redirected: res.request?._redirectable?._redirects?.length > 0,
    };
  } catch (e) {
    // Try GET as fallback (some servers reject HEAD)
    try {
      const res = await axios.get(url, {
        timeout: TIMEOUT,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: { 'User-Agent': 'AIRadarValidator/1.0' },
      });
      return {
        reachable: res.status >= 200 && res.status < 400,
        statusCode: res.status,
        finalUrl: res.request?.res?.responseUrl || url,
        redirected: false,
      };
    } catch (e2) {
      return { reachable: false, reason: e2.code || e2.message };
    }
  }
}

/**
 * Validate a list of tools, returning only valid ones.
 * Deduplicates by normalized name.
 */
export function validateToolBatch(tools) {
  const seen = new Set();
  const valid = [];
  const rejected = [];

  for (const tool of tools) {
    const result = validateToolData(tool);
    const key = result.normalized?.name;
    if (!key) {
      rejected.push({ tool, reason: 'normalization_failed' });
      continue;
    }
    if (seen.has(key)) {
      rejected.push({ tool, reason: 'duplicate' });
      continue;
    }
    if (!result.valid) {
      rejected.push({ tool, reason: 'validation_failed', errors: result.errors });
      continue;
    }
    seen.add(key);
    valid.push({ ...result.normalized, validation: { warnings: result.warnings } });
  }

  return { valid, rejected };
}

/**
 * Async-validate reachability of all tools in a batch.
 * Adds `url_status` field to each tool.
 */
export async function validateBatchReachability(tools, options = {}) {
  const { skipSlowCheck = true, maxConcurrent = 5 } = options;

  if (skipSlowCheck) {
    return tools.map(t => ({ ...t, url_status: { reachable: true, skipped: true } }));
  }

  const results = [];
  // Process in chunks for concurrency
  for (let i = 0; i < tools.length; i += maxConcurrent) {
    const chunk = tools.slice(i, i + maxConcurrent);
    const chunkResults = await Promise.all(
      chunk.map(async t => {
        const url = t.url || t.links?.website;
        const status = await validateUrlReachability(url);
        return { ...t, url_status: status };
      })
    );
    results.push(...chunkResults);
  }

  return results;
}

function normalizeTool(tool) {
  return {
    name: String(tool.name || '').trim(),
    description: String(tool.description || tool.shortDescription || '').trim().slice(0, 2000),
    shortDescription: String(tool.shortDescription || tool.description || '').trim().slice(0, 300),
    category: String(tool.category || 'Other').trim(),
    url: String(tool.url || tool.links?.website || tool.website_url || '').trim(),
    website: String(tool.links?.website || tool.url || tool.website_url || '').trim(),
    pricing: tool.pricing || { model: 'unknown' },
    tags: Array.isArray(tool.tags) ? tool.tags : [],
    features: Array.isArray(tool.features) ? tool.features : [],
    logo: tool.logo || tool.media?.logo || '',
    source: tool.source || 'unknown',
    source_detail: tool.source_detail || '',
  };
}

export default { validateToolData, validateUrlReachability, validateToolBatch, validateBatchReachability };
