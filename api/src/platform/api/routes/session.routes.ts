/**
 * Session API Routes
 * Defines REST endpoints for session management
 */

import { Router } from 'express';
import { SessionController } from '../controllers/SessionController';

/**
 * Create session routes
 */
export function createSessionRoutes(controller: SessionController): Router {
  const router = Router();

  /**
   * GET /session/can-start
   * Check if user can start a new scraping session (no auth required)
   */
  router.get('/can-start', (req, res, next) => controller.canStartSession(req, res, next));

  /**
   * POST /session/reset
   * Reset session to allow new sessions (no auth required for now)
   */
  router.post('/reset', (req, res, next) => controller.resetSession(req, res, next));

  return router;
}
