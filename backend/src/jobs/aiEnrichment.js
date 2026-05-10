// backend/src/jobs/aiEnrichment.js
import { enrichmentQueue } from './toolDiscovery.js';
import Tool from '../models/Tool.js';
import { enrichTool } from '../services/aiService.js';
import logger from '../utils/logger.js';

enrichmentQueue.process(async (job) => {
  const { toolId } = job.data;
  
  try {
    const tool = await Tool.findById(toolId);
    if (!tool) throw new Error('Tool not found');

    logger.info(`Processing AI enrichment for tool: ${tool.name}`);

    // Call OpenAI pipeline
    const enrichedData = await enrichTool(tool);

    // Update tool
    await Tool.findByIdAndUpdate(toolId, {
      $set: {
        description: enrichedData.description,
        shortDescription: enrichedData.shortDescription,
        category: enrichedData.category,
        tags: enrichedData.tags,
        aiMeta: enrichedData.aiMeta,
        // Auto-approve if high confidence? Leaving pending for admin review
        status: 'pending' 
      }
    });

    logger.info(`Successfully enriched tool: ${tool.name}`);
    return { success: true, toolId };
  } catch (error) {
    logger.error(`Enrichment failed for tool ${toolId}: ${error.message}`);
    
    // Throw error so Bull knows the job failed and can retry
    // Set max retries in worker config
    throw error;
  }
});
