/**
 * Automation API Routes
 * Defines REST endpoints for automation operations
 */

import { Router } from 'express';
import { AutomationController } from '../controllers/AutomationController';

/**
 * Create automation routes
 */
export function createAutomationRoutes(controller: AutomationController): Router {
  const router = Router();

  /**
   * POST /api/platform/automation/execute
   * Execute automation for a single platform
   */
  router.post('/execute', (req, res, next) => controller.executeAutomation(req, res, next));

  /**
   * POST /api/platform/automation/execute-multiple
   * Execute automation across multiple platforms
   */
  router.post('/execute-multiple', (req, res, next) =>
    controller.executeMultiPlatformAutomation(req, res, next)
  );

  /**
   * POST /api/platform/automation/execute-action
   * Execute specific action type batch
   */
  router.post('/execute-action', (req, res, next) => controller.executeActionBatch(req, res, next));

  /**
   * GET /api/platform/automation/preview
   * Preview automation (dry run)
   */
  router.get('/preview', (req, res, next) => controller.previewAutomation(req, res, next));

  return router;
}
