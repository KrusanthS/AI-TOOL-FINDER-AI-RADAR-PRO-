// backend/src/services/intentCacheService.js
// INTENT-BASED CACHING
// Cache by intent signature, not by raw query text.
// Semantically similar requests share the same cache entry.

import crypto from 'crypto';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

const CACHE_TTL = 60 * 60; // 1 hour

/**
 * Build a stable, intent-based cache key.
 * Two queries with the same intent will produce the same key.
 */
export function buildIntentCacheKey(understanding, options = {}) {
  const components = [
    understanding.intent || 'unknown',
    understanding.use_case || 'general',
    understanding.skill_level || 'intermediate',
    understanding.budget_preference || 'free_preferred',
    normalizeCapabilityList(understanding.required_capabilities),
    normalizeCapabilityList(understanding.preferred_capabilities || []),
    options.limit || 10,
  ];
  const raw = components.join('|');
  return `intent:${crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16)}`;
}

function normalizeCapabilityList(list) {
  if (!list || !list.length) return '';
  return [...list].map(s => String(s).toLowerCase().trim()).sort().filter(Boolean).join(',');
}

/**
 * Try to retrieve a cached intent result.
 */
export async function getCachedIntent(cacheKey) {
  if (!redisClient.isReady) return null;
  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.info(`Intent cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }
    return null;
  } catch (e) {
    logger.warn(`Intent cache read error: ${e.message}`);
    return null;
  }
}

/**
 * Store an intent result in cache.
 */
export async function setCachedIntent(cacheKey, result, ttl = CACHE_TTL) {
  if (!redisClient.isReady) return;
  try {
    await redisClient.setex(cacheKey, ttl, JSON.stringify(result));
    logger.info(`Intent cache SET: ${cacheKey} (TTL ${ttl}s)`);
  } catch (e) {
    logger.warn(`Intent cache write error: ${e.message}`);
  }
}

/**
 * Invalidate a cached intent result.
 */
export async function invalidateIntent(cacheKey) {
  if (!redisClient.isReady) return;
  try {
    await redisClient.del(cacheKey);
  } catch (e) {
    logger.warn(`Intent cache invalidate error: ${e.message}`);
  }
}

export default { buildIntentCacheKey, getCachedIntent, setCachedIntent, invalidateIntent };
