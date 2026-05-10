// backend/src/controllers/adminController.js
import Tool from '../models/Tool.js';
import User from '../models/User.js';
import { invalidateCache } from '../middleware/cacheMiddleware.js';
import { discoveryQueue, enrichmentQueue } from '../jobs/toolDiscovery.js';

export const triggerDiscovery = async (req, res) => {
  try {
    await discoveryQueue.add({});
    res.json({ message: 'Discovery job triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const triggerEnrichment = async (req, res) => {
  try {
    const pendingTools = await Tool.find({ 
      status: 'pending'
    }).limit(10);
    
    for (const tool of pendingTools) {
      await enrichmentQueue.add({ toolId: tool._id });
    }
    
    res.json({ message: `Enqueued ${pendingTools.length} tools for enrichment` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getPendingTools = async (req, res) => {
  try {
    const tools = await Tool.find({ status: 'pending' }).sort({ createdAt: -1 });
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveTool = async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedAt: new Date(), approvedBy: req.user._id },
      { new: true }
    );
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    
    await invalidateCache('/api/tools*');
    res.json(tool);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectTool = async (req, res) => {
  try {
    const tool = await Tool.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    if (!tool) return res.status(404).json({ error: 'Tool not found' });
    
    await invalidateCache('/api/tools*');
    res.json(tool);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getStats = async (req, res) => {
  try {
    const totalTools = await Tool.countDocuments({ status: 'approved' });
    const pendingTools = await Tool.countDocuments({ status: 'pending' });
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const addedThisWeek = await Tool.countDocuments({ status: 'approved', approvedAt: { $gte: oneWeekAgo } });
    
    const totalUsers = await User.countDocuments();
    
    const sources = await Tool.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } }
    ]);

    res.json({
      totalTools,
      pendingTools,
      addedThisWeek,
      totalUsers,
      sources
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
