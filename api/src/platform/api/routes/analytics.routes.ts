/**
 * Analytics API Routes
 * Defines REST endpoints for analytics
 */

import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';

/**
 * Create analytics routes
 */
export function createAnalyticsRoutes(controller: AnalyticsController): Router {
  const router = Router();

  /**
   * GET /analytics/summary
   * Get analytics summary (last 30 days)
   */
  router.get('/summary', (req, res, next) => controller.getSummary(req, res, next));

  /**
   * GET /analytics
   * Get analytics for date range
   */
  router.get('/', (req, res, next) => controller.getAnalytics(req, res, next));

  /**
   * POST /analytics/generate
   * Generate analytics for a specific date
   */
  router.post('/generate', (req, res, next) => controller.generateAnalytics(req, res, next));

  return router;
}
