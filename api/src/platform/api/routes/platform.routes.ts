/**
 * Platform API Routes
 * Defines REST endpoints for platform management operations
 */

import { Router } from 'express';
import { PlatformController } from '../controllers/PlatformController';

/**
 * Create platform routes
 */
export function createPlatformRoutes(controller: PlatformController): Router {
  const router = Router();

  /**
   * GET /api/platform/platforms
   * Get all registered platforms
   */
  router.get('/', (req, res, next) => controller.getRegisteredPlatforms(req, res, next));

  /**
   * GET /api/platform/platforms/health
   * Check platform health for all platforms
   */
  router.get('/health', (req, res, next) => controller.checkPlatformHealth(req, res, next));

  /**
   * GET /api/platform/platforms/capabilities
   * Get all platform capabilities
   */
  router.get('/capabilities', (req, res, next) =>
    controller.getAllPlatformCapabilities(req, res, next)
  );

  /**
   * GET /api/platform/platforms/statistics
   * Get platform statistics
   */
  router.get('/statistics', (req, res, next) => controller.getPlatformStatistics(req, res, next));

  /**
   * POST /api/platform/platforms/:platformId/browser/init
   * Initialize browser session for a platform
   */
  router.post('/:platformId/browser/init', (req, res, next) =>
    controller.initializeBrowserSession(req, res, next)
  );

  /**
   * POST /api/platform/platforms/:platformId/browser/close
   * Close browser session for a platform
   */
  router.post('/:platformId/browser/close', (req, res, next) =>
    controller.closeBrowserSession(req, res, next)
  );

  /**
   * POST /api/platform/platforms/browser/close-all
   * Close all browser sessions
   */
  router.post('/browser/close-all', (req, res, next) =>
    controller.closeAllBrowserSessions(req, res, next)
  );

  /**
   * POST /api/platform/platforms/:platformId/browser/restart
   * Restart browser session
   */
  router.post('/:platformId/browser/restart', (req, res, next) =>
    controller.restartBrowserSession(req, res, next)
  );

  /**
   * POST /api/platform/platforms/:platformId/auth/authenticate
   * Authenticate platform
   */
  router.post('/:platformId/auth/authenticate', (req, res, next) =>
    controller.authenticatePlatform(req, res, next)
  );

  /**
   * GET /api/platform/platforms/:platformId/auth/status
   * Check authentication status
   */
  router.get('/:platformId/auth/status', (req, res, next) =>
    controller.checkAuthenticationStatus(req, res, next)
  );

  /**
   * POST /api/platform/platforms/:platformId/auth/logout
   * Logout from platform
   */
  router.post('/:platformId/auth/logout', (req, res, next) =>
    controller.logoutPlatform(req, res, next)
  );

  /**
   * POST /api/platform/platforms/:platformId/auth/save
   * Save authentication state
   */
  router.post('/:platformId/auth/save', (req, res, next) =>
    controller.saveAuthenticationState(req, res, next)
  );

  /**
   * POST /api/platform/platforms/:platformId/auth/load
   * Load authentication state
   */
  router.post('/:platformId/auth/load', (req, res, next) =>
    controller.loadAuthenticationState(req, res, next)
  );

  return router;
}
