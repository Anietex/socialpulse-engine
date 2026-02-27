/**
 * Ingestion API Routes
 * Defines REST endpoints for tweet ingestion from Chrome extension
 */

import { Router } from 'express';
import { IngestionController } from '../controllers/IngestionController';
import { validate } from '../../../middleware/validation';
import { ingestTweetsSchema } from '../validators/ingestion.validation';

/**
 * Create ingestion routes
 */
export function createIngestionRoutes(controller: IngestionController): Router {
  const router = Router();

  /**
   * POST /ingestion/tweets
   * Ingest tweets from Chrome extension (no auth required)
   */
  router.post('/tweets', validate(ingestTweetsSchema), (req, res, next) =>
    controller.ingestTweets(req, res, next)
  );

  /**
   * GET /ingestion/stats
   * Get ingestion statistics (no auth required)
   */
  router.get('/stats', (req, res, next) => controller.getStats(req, res, next));

  return router;
}
