/**
 * Main API Routes
 * Simple health check and platform API integration
 */

import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Health check endpoint
 * GET /api/health
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'socialpulse-engine',
    version: '2.0.0',
  });
});

/**
 * TODO: Mount platform API routes when controllers are instantiated
 * Platform API will be available at /api/v1/*
 *
 * Example:
 * import { createPlatformApiRouter } from './platform/api/routes';
 * router.use('/v1', createPlatformApiRouter(contentController, automationController, platformController));
 */

export default router;
