// backend/src/controllers/toolController.js
import Tool from '../models/Tool.js';
import { incrementToolView, findSimilarTools } from '../services/toolService.js';
import { invalidateCache } from '../middleware/cacheMiddleware.js';
import redisClient from '../config/redis.js';
import { enrichmentQueue } from '../jobs/toolDiscovery.js';


export const getTools = async (req, res) => {
  let { 
    page = 1, 
    limit = 20, 
    category, 
    pricing, 
    minRating, 
    tags, 
    search, 
    sort = 'newest' 
  } = req.query;

  const query = { status: 'approved' };

  // Intelligent Search Pre-processing
  if (search) {
    const searchLower = search.toLowerCase();
    
    // 1. Intent Extraction: Pricing
    if (searchLower.includes('free') && !pricing) pricing = 'free';
    if ((searchLower.includes('paid') || searchLower.includes('premium')) && !pricing) pricing = 'paid';
    if (searchLower.includes('freemium') && !pricing) pricing = 'freemium';

    // 2. Intent Extraction: Categories (Synonyms) - Aligned with actual DB categories
    const categoryMap = {
      'chatbot': 'Productivity',
      'programming': 'Coding',
      'code': 'Coding',
      'coding': 'Coding',
      'image': 'Image',
      'art': 'Image',
      'picture': 'Image',
      'painting': 'Image',
      'draw': 'Image',
      'photo': 'Image',
      'video': 'Video',
      'movie': 'Video',
      'clip': 'Video',
      'write': 'Writing',
      'writing': 'Writing',
      'blog': 'Writing',
      'content': 'Writing',
      'copy': 'Writing',
      'music': 'Audio',
      'audio': 'Audio',
      'sound': 'Audio',
      'song': 'Audio',
      'marketing': 'Marketing',
      'seo': 'Marketing',
      'ads': 'Marketing',
      'social': 'Marketing',
      'health': 'Healthcare',
      'medical': 'Healthcare',
      'doctor': 'Healthcare',
      'legal': 'Legal',
      'law': 'Legal',
      'attorney': 'Legal',
      'finance': 'Finance',
      'money': 'Finance',
      'stock': 'Finance',
      'design': 'Design',
      'ux': 'Design',
      'ui': 'Design',
      'cyber': 'Cybersecurity',
      'security': 'Cybersecurity',
      'hack': 'Cybersecurity',
      'data': 'Data',
      'analytics': 'Data',
      'chart': 'Data',
      'education': 'Research',
      'learn': 'Research',
      'school': 'Research'
    };

    for (const [synonym, actualCategory] of Object.entries(categoryMap)) {
      // Only apply category filter if the search term is very similar to the synonym
      // to avoid over-filtering when searching for specific tool names like "Copy AI"
      if (searchLower === synonym || (searchLower.includes(synonym) && searchLower.length < synonym.length + 3) && !category) {
        category = actualCategory;
        break;
      }
    }
  }

  if (category) {
    // Partial match for category to be more flexible
    query.category = { $regex: category, $options: 'i' };
  }
  if (pricing) query['pricing.model'] = pricing;
  if (minRating) query['stats.rating'] = { $gte: Number(minRating) };
  if (tags) query.tags = { $in: tags.split(',') };
  if (search) {
    query.$text = { $search: search };
  }

  let sortObj = { createdAt: -1 };
  if (sort === 'trending') sortObj = { 'stats.weeklyViews': -1, 'stats.views': -1 };
  else if (sort === 'rating') sortObj = { 'stats.rating': -1, 'stats.ratingCount': -1 };
  else if (search) sortObj = { score: { $meta: 'textScore' } };

  try {
    const pipeline = [];

    // If searching, we need to handle text score and name boosting
    if (search) {
      pipeline.push({ 
        $match: query 
      });
      // Add text score and custom name-match boosting
      pipeline.push({
        $addFields: { 
          score: { $meta: "textScore" },
          nameMatchBoost: {
            $cond: {
              if: { $eq: [{ $toLower: "$name" }, search.toLowerCase()] },
              then: 100, // Highest priority: Exact name match
              else: {
                $cond: {
                  if: { $eq: [{ $indexOfCP: [{ $toLower: "$name" }, search.toLowerCase()] }, 0] },
                  then: 50, // High priority: Name starts with search term
                  else: {
                    $cond: {
                      if: { $gt: [{ $indexOfCP: [{ $toLower: "$name" }, search.toLowerCase()] }, -1] },
                      then: 20, // Medium priority: Name contains search term
                      else: 0
                    }
                  }
                }
              }
            }
          }
        }
      });
      // Combined score for final sorting
      pipeline.push({
        $addFields: {
          totalScore: { $add: ["$score", "$nameMatchBoost"] }
        }
      });
      sortObj = { totalScore: -1, 'stats.rating': -1 };
    } else {
      pipeline.push({ $match: query });
    }

    // Sorting for grouping (highest rating first within each name group)
    pipeline.push({ $sort: { 'stats.rating': -1, createdAt: -1 } });

    // Grouping by name to avoid duplicates/versions
    pipeline.push({
      $group: {
        _id: '$name',
        tool: { $first: '$$ROOT' }
      }
    });

    // Flattening
    pipeline.push({ $replaceRoot: { newRoot: '$tool' } });

    // Apply final sorting
    pipeline.push({ $sort: sortObj });

    // Count total unique tools
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });
    const countResult = await Tool.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Apply pagination
    pipeline.push({ $skip: (Number(page) - 1) * Number(limit) });
    pipeline.push({ $limit: Number(limit) });

    const tools = await Tool.aggregate(pipeline);

    res.json({
      tools,
      total,
      pages: Math.ceil(total / Number(limit)),
      currentPage: Number(page)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getToolBySlug = async (req, res) => {
  try {
    const tool = await Tool.findOne({ slug: req.params.slug, status: 'approved' }).select('-aiMeta.embedding');
    if (!tool) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    // Increment view asynchronously
    incrementToolView(tool.slug);

    // Fetch other versions of the same tool
    const versions = await Tool.find({ 
      name: tool.name, 
      _id: { $ne: tool._id },
      status: 'approved' 
    }).select('name slug category pricing stats');

    // Fetch related tools (from same category but different name)
    const related = await Tool.find({
      category: tool.category,
      name: { $ne: tool.name },
      status: 'approved'
    }).limit(5).select('name slug category pricing stats');

    res.json({ tool, versions, related });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getTrendingTools = async (req, res) => {
  try {
    const tools = await Tool.find({ status: 'approved' })
      .sort({ 'stats.weeklyViews': -1, 'stats.saves': -1 })
      .limit(20)
      .select('name slug shortDescription media.logo category stats');
      
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Tool.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin endpoints
export const createTool = async (req, res) => {
  try {
    const tool = new Tool(req.body);
    await tool.save();
    
    // Invalidate caches
    await invalidateCache('/api/tools*');
    
    // Enqueue AI enrichment job
    if (redisClient.isReady) {
      await enrichmentQueue.add({ toolId: tool._id });
    }
    
    res.status(201).json(tool);

  } catch (error) {
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
    
    res.json(tool);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteTool = async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(req.params.id, { status: 'rejected' });
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    
    await invalidateCache('/api/tools*');
    
    res.json({ message: 'Tool soft deleted (rejected)' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
