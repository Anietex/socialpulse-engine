/**
 * Session Controller
 * Handles session management HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../../application/services/SessionService';
import { logger } from '../../../config/logger';

/**
 * Session Controller
 */
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * Check if user can start a new scraping session
   * GET /session/can-start
   */
  async canStartSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get userId from authenticated user or query params
      const userId = req.user?._id || (req.query.userId as string) || 'anonymous';

      const result = await this.sessionService.canStartSession(userId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Check session failed', { error });
      next(error);
    }
  }

  /**
   * Reset session (admin/internal use)
   * POST /session/reset
   */
  async resetSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?._id || req.body.userId;

      if (!userId) {
        res.status(400).json({
          success: false,
          message: 'User ID is required',
        });
        return;
      }

      await this.sessionService.resetSession(userId);

      res.status(200).json({
        success: true,
        message: 'Session reset successfully',
      });
    } catch (error) {
      logger.error('Reset session failed', { error });
      next(error);
    }
  }
}
