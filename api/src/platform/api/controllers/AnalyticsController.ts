/**
 * Analytics Controller
 * Handles analytics HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from '../../application/services/AnalyticsService';
import { logger } from '../../../config/logger';

/**
 * Analytics Controller
 */
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Get analytics summary
   * GET /analytics/summary
   */
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?._id || (req.query.userId as string);

      const summary = await this.analyticsService.getAnalyticsSummary(userId);

      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error('Get analytics summary failed', { error });
      next(error);
    }
  }

  /**
   * Get analytics for date range
   * GET /analytics
   */
  async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?._id || (req.query.userId as string);
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

      const analytics = await this.analyticsService.getAnalytics({
        userId,
        startDate,
        endDate,
      });

      res.status(200).json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      logger.error('Get analytics failed', { error });
      next(error);
    }
  }

  /**
   * Generate analytics for a specific date
   * POST /analytics/generate
   */
  async generateAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?._id || req.body.userId;
      const date = req.body.date ? new Date(req.body.date) : new Date();

      const analytics = await this.analyticsService.generateAnalytics(userId, date);

      res.status(201).json({
        success: true,
        message: 'Analytics generated successfully',
        data: analytics,
      });
    } catch (error) {
      logger.error('Generate analytics failed', { error });
      next(error);
    }
  }
}
