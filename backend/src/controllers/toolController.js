// backend/src/controllers/toolController.js
import Tool from '../models/Tool.js';
import { incrementToolView } from '../services/toolService.js';
import { intelligentSearch as intelligentSearchService } from '../services/intelligentSearchService.js';
import { invalidateCache } from '../middleware/cacheMiddleware.js';
import redisClient from '../config/redis.js';
import logger from '../utils/logger.js';

// Lazy-load optional services to avoid crash when keys are missing
let _aiSearch = null;
const getAiSearch = async () => {
  if (!_aiSearch) {
    try {
      _aiSearch = await import('../services/aiSearchService.js');
    } catch (e) {
      logger.warn('aiSearchService unavailable: ' + e.message);
      _aiSearch = {};
    }
  }
  return _aiSearch;
};

let _enrichmentQueue = null;
const getEnrichmentQueue = async () => {
  if (!_enrichmentQueue) {
    try {
      const mod = await import('../jobs/toolDiscovery.js');
      _enrichmentQueue = mod.enrichmentQueue;
    } catch (e) {
      logger.warn('enrichmentQueue unavailable: ' + e.message);
    }
  }
  return _enrichmentQueue;
};

// ─── Category synonym map ─────────────────────────────────────────────────────
const CATEGORY_MAP = {
  chatbot: 'Chat', programming: 'Coding', code: 'Coding', coding: 'Coding',
  image: 'Image', art: 'Image', picture: 'Image', painting: 'Image', draw: 'Image', photo: 'Image',
  video: 'Video', movie: 'Video', clip: 'Video',
  write: 'Writing', writing: 'Writing', blog: 'Writing', content: 'Writing', copy: 'Writing',
  music: 'Audio', audio: 'Audio', sound: 'Audio', song: 'Audio',
  marketing: 'Marketing', seo: 'Marketing', ads: 'Marketing', social: 'Marketing',
  health: 'Healthcare', medical: 'Healthcare', doctor: 'Healthcare',
  legal: 'Legal', law: 'Legal', attorney: 'Legal',
  finance: 'Finance', money: 'Finance', stock: 'Finance',
  design: 'Design', ux: 'Design', ui: 'Design',
  cyber: 'Cybersecurity', security: 'Cybersecurity', hack: 'Cybersecurity',
  data: 'Data', analytics: 'Data', chart: 'Data',
  education: 'Research', learn: 'Research', school: 'Research',
  research: 'Research', search: 'Research',
  chat: 'Chat', llm: 'Chat', gpt: 'Chat',
  agent: 'Coding', automation: 'Productivity', productivity: 'Productivity',
};

export const getTools = async (req, res) => {
  let {
    page = 1,
    limit = 20,
    category,
    pricing,
    minRating,
    tags,
    search,
    sort = 'newest',
  } = req.query;

  const query = { status: 'approved' };

  // ── AI intelligent search (LLM + DB semantic search) ─────────────────────
  if (search) {
    try {
      const aiResult = await intelligentSearchService(search, {
        limit: Number(limit) || 20,
        userContext: {
          category,
          pricing,
          minRating: minRating ? Number(minRating) : undefined,
          tags: tags ? tags.split(',') : undefined,
        },
      });

      if (aiResult?.tools?.length) {
        let filtered = aiResult.tools;
        if (category) {
          filtered = filtered.filter((t) => {
            const candidate = (t.category || (t.categories || []).join('') || '').toString();
            return new RegExp(category, 'i').test(candidate);
          });
        }
        if (pricing) {
          filtered = filtered.filter((t) => {
            const model = (t.pricing?.model || t.pricing || '').toString().toLowerCase();
            return model === pricing.toLowerCase();
          });
        }
        if (minRating) {
          filtered = filtered.filter((t) => (t.stats?.rating || 0) >= Number(minRating));
        }
        if (tags) {
          const tagSet = new Set(tags.split(',').map((tag) => tag.toLowerCase().trim()));
          filtered = filtered.filter((t) => (t.tags || []).some((tag) => tagSet.has(tag.toLowerCase())));
        }

        const total = filtered.length;
        const paged = filtered.slice((Number(page) - 1) * Number(limit), Number(page) * Number(limit));

        return res.json({
          tools: paged,
          total,
          pages: Math.ceil(total / Number(limit)),
          currentPage: Number(page),
          aiRecommendation: aiResult.reasoning?.top_pick_reason || aiResult.reasoning?.summary || 'AI search completed',
        });
      }
    } catch (error) {
      logger.warn('Intelligent search failed, falling back to text search: ' + error.message);
    }
  }

  // ── Intent extraction from search query ──────────────────────────────────
  if (search) {
    const sl = search.toLowerCase();
    if (sl.includes('free') && !pricing) pricing = 'free';
    if ((sl.includes('paid') || sl.includes('premium')) && !pricing) pricing = 'paid';
    if (sl.includes('freemium') && !pricing) pricing = 'freemium';

    for (const [synonym, cat] of Object.entries(CATEGORY_MAP)) {
      if ((sl === synonym || (sl.includes(synonym) && sl.length < synonym.length + 3)) && !category) {
        category = cat;
        break;
      }
    }
  }

  if (category) query.category = { $regex: category, $options: 'i' };
  if (pricing) query['pricing.model'] = pricing.toLowerCase();
  if (minRating) query['stats.rating'] = { $gte: Number(minRating) };
  if (tags) query.tags = { $in: tags.split(',') };
  // Note: $text search is applied in the aggregation pipeline, not here

  let sortObj = { created_at: -1 };
  if (sort === 'trending') sortObj = { 'stats.weeklyViews': -1, 'stats.views': -1 };
  else if (sort === 'rating') sortObj = { 'stats.rating': -1, 'stats.ratingCount': -1 };
  else if (search) sortObj = { totalScore: -1, 'stats.rating': -1 };

  try {
    const pipeline = [];

    if (search) {
      pipeline.push({
        $match: { ...query, $text: { $search: search } },
      });
      pipeline.push({
        $addFields: {
          score: { $meta: 'textScore' },
          nameMatchBoost: {
            $cond: {
              if: { $eq: [{ $toLower: '$name' }, search.toLowerCase()] },
              then: 100,
              else: {
                $cond: {
                  if: { $eq: [{ $indexOfCP: [{ $toLower: '$name' }, search.toLowerCase()] }, 0] },
                  then: 50,
                  else: {
                    $cond: {
                      if: { $gt: [{ $indexOfCP: [{ $toLower: '$name' }, search.toLowerCase()] }, -1] },
                      then: 20,
                      else: 0,
                    },
                  },
                },
              },
            },
          },
        },
      });
      pipeline.push({ $addFields: { totalScore: { $add: ['$score', '$nameMatchBoost'] } } });
      // Deduplicate by name keeping highest totalScore
      pipeline.push({ $sort: { totalScore: -1, 'stats.rating': -1 } });
      pipeline.push({ $group: { _id: '$name', tool: { $first: '$$ROOT' } } });
      pipeline.push({ $replaceRoot: { newRoot: '$tool' } });
      pipeline.push({ $sort: { totalScore: -1, 'stats.rating': -1 } });
    } else {
      pipeline.push({ $match: query });
      pipeline.push({ $sort: sortObj });
    }

    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Tool.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
    pipeline.push({ $limit: Number(limit) });

    const tools = await Tool.aggregate(pipeline);

    res.json({
      tools,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page),
    });
  } catch (error) {
    logger.error('getTools error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getToolBySlug = async (req, res) => {
  try {
    const tool = await Tool.findOne({ slug: req.params.slug, status: 'approved' })
      .select('-vector_embedding -aiMeta.embedding');

    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    incrementToolView(tool.slug);

    const versions = await Tool.find({
      name: tool.name,
      _id: { $ne: tool._id },
      status: 'approved',
    }).select('name slug category pricing stats');

    const related = await Tool.find({
      category: tool.category,
      name: { $ne: tool.name },
      status: 'approved',
    }).limit(5).select('name slug category pricing stats');

    res.json({ tool, versions, related });
  } catch (error) {
    logger.error('getToolBySlug error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getTrendingTools = async (req, res) => {
  try {
    const tools = await Tool.find({ status: 'approved' })
      .sort({ 'stats.weeklyViews': -1, 'stats.saves': -1 })
      .limit(20)
      .select('name slug shortDescription media links category stats pricing verified');

    res.json(tools);
  } catch (error) {
    logger.error('getTrendingTools error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Tool.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json(categories);
  } catch (error) {
    logger.error('getCategories error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
};

// ── Admin CRUD ────────────────────────────────────────────────────────────────
export const createTool = async (req, res) => {
  try {
    const tool = new Tool(req.body);
    await tool.save();

    await invalidateCache('/api/tools*');

    const queue = await getEnrichmentQueue();
    if (queue && redisClient.isReady) {
      await queue.add({ toolId: tool._id });
    }

    // Sync to vector DB if available
    try {
      const { syncToolToVectorDB } = await getAiSearch();
      if (syncToolToVectorDB) await syncToolToVectorDB(tool);
    } catch (e) { /* optional */ }

    res.status(201).json(tool);
  } catch (error) {
    logger.error('createTool error: ' + error.message);
    res.status(400).json({ error: error.message });
  }
};

export const updateTool = async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    await invalidateCache('/api/tools*');

    try {
      const { syncToolToVectorDB } = await getAiSearch();
      if (syncToolToVectorDB) await syncToolToVectorDB(tool);
    } catch (e) { /* optional */ }

    res.json(tool);
  } catch (error) {
    logger.error('updateTool error: ' + error.message);
    res.status(400).json({ error: error.message });
  }
};

export const deleteTool = async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    if (!tool) return res.status(404).json({ error: 'Tool not found' });

    await invalidateCache('/api/tools*');

    try {
      const { deleteToolFromVectorDB } = await getAiSearch();
      if (deleteToolFromVectorDB) await deleteToolFromVectorDB(req.params.id);
    } catch (e) { /* optional */ }

    res.json({ message: 'Tool soft deleted (rejected)' });
  } catch (error) {
    logger.error('deleteTool error: ' + error.message);
    res.status(500).json({ error: error.message });
  }
};
