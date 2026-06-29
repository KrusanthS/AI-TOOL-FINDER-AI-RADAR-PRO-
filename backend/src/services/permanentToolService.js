// backend/src/services/permanentToolService.js
// Service layer for the PermanentTool collection.
// Provides search, CRUD, and upsert (duplicate-safe) operations.

import PermanentTool from '../models/PermanentTool.js';
import logger from '../utils/logger.js';

/**
 * Search permanent tools by query string.
 * Uses MongoDB text search first, then falls back to regex.
 */
export async function searchPermanentTools(query, options = {}) {
  const { limit = 30 } = options;

  if (!query || typeof query !== 'string') return [];

  try {
    // Try text search first
    let tools = [];
    try {
      tools = await PermanentTool.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .lean();
    } catch {
      // text index may not be ready yet
    }

    // Fall back to regex if text search returned too few results
    if (tools.length < 3) {
      const searchText = query.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
      const regexTools = await PermanentTool.find({
        $or: [
          { name: { $regex: searchText, $options: 'i' } },
          { description: { $regex: searchText, $options: 'i' } },
          { short_description: { $regex: searchText, $options: 'i' } },
          { category: { $regex: searchText, $options: 'i' } },
          { tags: { $in: [new RegExp(searchText, 'i')] } },
        ],
      })
        .sort({ popularity_score: -1 })
        .limit(limit)
        .lean();

      // Merge and deduplicate
      const seen = new Set(tools.map(t => t._id.toString()));
      for (const t of regexTools) {
        if (!seen.has(t._id.toString())) {
          tools.push(t);
          seen.add(t._id.toString());
        }
      }
    }

    return tools;
  } catch (error) {
    logger.error(`searchPermanentTools error: ${error.message}`);
    return [];
  }
}

/**
 * Find a single permanent tool by exact name match (case-insensitive).
 */
export async function findPermanentToolByName(name) {
  if (!name) return null;
  try {
    return await PermanentTool.findOne({
      name_lower: name.toLowerCase().trim(),
    }).lean();
  } catch (error) {
    logger.error(`findPermanentToolByName error: ${error.message}`);
    return null;
  }
}

/**
 * Upsert a permanent tool. Checks for duplicates by name (case-insensitive)
 * and website URL. If found, updates the existing record. Otherwise inserts.
 * Safe to call multiple times with the same data.
 */
export async function upsertPermanentTool(toolData) {
  const nameLower = (toolData.name || '').toLowerCase().trim();
  const urlLower = (toolData.website_url || '').toLowerCase().replace(/\/+$/, '').trim();

  if (!nameLower) {
    throw new Error('Tool name is required');
  }

  try {
    // Check for existing by name OR website URL
    const existing = await PermanentTool.findOne({
      $or: [
        { name_lower: nameLower },
        ...(urlLower ? [{ website_url_lower: urlLower }] : []),
      ],
    });

    if (existing) {
      // Update existing record
      Object.assign(existing, toolData);
      existing.last_updated = new Date();
      await existing.save();
      logger.info(`Updated permanent tool: ${existing.name}`);
      return { tool: existing, action: 'updated' };
    }

    // Insert new
    const tool = new PermanentTool(toolData);
    await tool.save();
    logger.info(`Inserted permanent tool: ${tool.name}`);
    return { tool, action: 'inserted' };
  } catch (error) {
    // Handle duplicate key error (race condition)
    if (error.code === 11000) {
      logger.warn(`Duplicate permanent tool skipped: ${toolData.name}`);
      const existing = await PermanentTool.findOne({ name_lower: nameLower });
      return { tool: existing, action: 'skipped' };
    }
    throw error;
  }
}

/**
 * Get all permanent tools with optional filters.
 */
export async function getAllPermanentTools(options = {}) {
  const { page = 1, limit = 50, category, search } = options;
  const filter = {};

  if (category) filter.category = { $regex: category, $options: 'i' };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  const [tools, total] = await Promise.all([
    PermanentTool.find(filter)
      .sort({ popularity_score: -1, name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PermanentTool.countDocuments(filter),
  ]);

  return { tools, total, pages: Math.ceil(total / limit), currentPage: page };
}

/**
 * Get a permanent tool by ID.
 */
export async function getPermanentToolById(id) {
  return PermanentTool.findById(id).lean();
}

/**
 * Delete a permanent tool by ID.
 */
export async function deletePermanentTool(id) {
  return PermanentTool.findByIdAndDelete(id);
}
