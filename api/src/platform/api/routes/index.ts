/**
 * Platform API Routes
 * Main router configuration for platform API
 */

import { Router } from 'express';
import { ContentController, AutomationController, PlatformController } from '../controllers';
import { createContentRoutes } from './content.routes';
import { createAutomationRoutes } from './automation.routes';
import { createPlatformRoutes } from './platform.routes';

/**
 * Create platform API router
 */
export function createPlatformApiRouter(
  contentController: ContentController,
  automationController: AutomationController,
  platformController: PlatformController
): Router {
  const router = Router();

  // Mount sub-routers
  router.use('/content', createContentRoutes(contentController));
  router.use('/automation', createAutomationRoutes(automationController));
  router.use('/platforms', createPlatformRoutes(platformController));

  return router;
}

// Re-export route creators for flexibility
export { createContentRoutes } from './content.routes';
export { createAutomationRoutes } from './automation.routes';
export { createPlatformRoutes } from './platform.routes';
