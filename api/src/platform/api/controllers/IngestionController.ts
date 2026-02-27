/**
 * Ingestion Controller
 * Handles tweet ingestion HTTP requests from Chrome extension
 */

import { Request, Response, NextFunction } from 'express';
import { IngestionService } from '../../application/services/IngestionService';
import { SessionService } from '../../application/services/SessionService';
import { logger } from '../../../config/logger';

/**
 * Ingestion Controller
 */
export class IngestionController {
  constructor(
    private readonly ingestionService: IngestionService,
    private readonly sessionService: SessionService
  ) {}

  /**
   * Ingest tweets from Chrome extension
   * POST /ingestion/tweets
   */
  async ingestTweets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get userId from authenticated user or from request body
      const userId = req.user?._id || req.body.userId || 'anonymous';

      const { tweets } = req.body;

      if (!Array.isArray(tweets) || tweets.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            stored: 0,
            totalUnique: 0,
            accepted: 0,
            message: 'No tweets provided',
          },
        });
        return;
      }

      const result = await this.ingestionService.ingestTweets(userId, tweets);

      // Start session cooldown (fire and forget)
      this.sessionService.startSession(userId).catch((error) => {
        logger.error(`Failed to start session cooldown for user ${userId}:`, error);
      });

      res.status(201).json({
        success: true,
        message: `Ingested ${result.stored} tweets`,
        data: result,
      });
    } catch (error) {
      logger.error('Tweet ingestion failed', { error });
      next(error);
    }
  }

  /**
   * Get ingestion statistics
   * GET /ingestion/stats
   */
  async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get userId from authenticated user, query params, or default to 'anonymous'
      const userId = req.user?._id || (req.query.userId as string) || 'anonymous';

      const stats = await this.ingestionService.getIngestionStats(userId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get ingestion stats failed', { error });
      next(error);
    }
  }
}
