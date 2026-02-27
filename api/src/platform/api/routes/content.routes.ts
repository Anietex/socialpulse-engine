/**
 * Content API Routes
 * Defines REST endpoints for content operations
 */

import { Router } from 'express';
import { ContentController } from '../controllers/ContentController';

/**
 * Create content routes
 */
export function createContentRoutes(controller: ContentController): Router {
  const router = Router();

  /**
   * POST /api/platform/content/scrape
   * Scrape content from a single platform
   */
  router.post('/scrape', (req, res, next) => controller.scrapeContent(req, res, next));

  /**
   * POST /api/platform/content/scrape-multiple
   * Scrape content from multiple platforms
   */
  router.post('/scrape-multiple', (req, res, next) =>
    controller.scrapeMultiplePlatforms(req, res, next)
  );

  /**
   * GET /api/platform/content/:contentId
   * Get content by ID
   */
  router.get('/:contentId', (req, res, next) => controller.getContentById(req, res, next));

  /**
   * GET /api/platform/content/by-stage/:status
   * Get content by stage/status
   */
  router.get('/by-stage/:status', (req, res, next) => controller.getContentByStage(req, res, next));

  /**
   * PUT /api/platform/content/status
   * Update content statuses
   */
  router.put('/status', (req, res, next) => controller.updateContentStatuses(req, res, next));

  /**
   * GET /api/platform/content/statistics
   * Get content statistics
   */
  router.get('/statistics', (req, res, next) => controller.getContentStatistics(req, res, next));

  return router;
}
