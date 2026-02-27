/**
 * Tweet API Routes
 * Defines REST endpoints for tweet search and retrieval
 */

import { Router } from 'express';
import { TweetController } from '../controllers/TweetController';

/**
 * Create tweet routes
 */
export function createTweetRoutes(controller: TweetController): Router {
  const router = Router();

  /**
   * GET /tweets/search
   * Search tweets with filters
   * Query params: userId, status, category, minRank, maxRank, q (search), limit, offset
   */
  router.get('/search', (req, res, next) => controller.searchTweets(req, res, next));

  /**
   * GET /tweets/:id
   * Get tweet by ID
   */
  router.get('/:id', (req, res, next) => controller.getTweetById(req, res, next));

  return router;
}
