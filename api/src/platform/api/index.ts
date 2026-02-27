/**
 * Platform API Layer
 * Main entry point for the REST API that exposes platform services
 */

import { Router } from 'express';
import { ContentController, AutomationController, PlatformController } from './controllers';
import { createPlatformApiRouter } from './routes';
import { platformErrorHandler } from './middleware/platform-error-handler';
import { ContentOrchestrationService } from '../application/services/ContentOrchestrationService';
import { AutomationOrchestrator } from '../application/services/AutomationOrchestrator';
import { PlatformService } from '../application/services/PlatformService';

// Export DTOs
export * from './dto';

// Export Controllers
export * from './controllers';

// Export Routes
export * from './routes';

// Export Middleware
export * from './middleware/platform-error-handler';

/**
 * Configuration for creating platform API
 */
export interface PlatformApiConfig {
  contentOrchestrationService: ContentOrchestrationService;
  automationOrchestrator: AutomationOrchestrator;
  platformService: PlatformService;
}

/**
 * Create platform API router with all controllers and routes
 * @param config Platform API configuration
 * @returns Configured Express router
 */
export function createPlatformApi(config: PlatformApiConfig): Router {
  const { contentOrchestrationService, automationOrchestrator, platformService } = config;

  // Create controllers
  const contentController = new ContentController(contentOrchestrationService, platformService);

  const automationController = new AutomationController(automationOrchestrator, platformService);

  const platformController = new PlatformController(platformService);

  // Create router with all routes
  const router = createPlatformApiRouter(
    contentController,
    automationController,
    platformController
  );

  // Add error handler
  router.use(platformErrorHandler);

  return router;
}
