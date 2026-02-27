/**
 * User API Routes
 * Defines REST endpoints for user management
 */

import { Router } from 'express';
import { UserController } from '../controllers/UserController';
import { authenticate } from '../../../middleware/authenticate';

/**
 * Create user routes
 */
export function createUserRoutes(controller: UserController): Router {
  const router = Router();

  /**
   * All routes require authentication
   */
  router.use(authenticate);

  /**
   * GET /users
   * Get all users (admin only)
   */
  router.get('/', (req, res, next) => controller.getUsers(req, res, next));

  /**
   * GET /users/:id
   * Get user by ID
   */
  router.get('/:id', (req, res, next) => controller.getUserById(req, res, next));

  /**
   * PUT /users/:id
   * Update user
   */
  router.put('/:id', (req, res, next) => controller.updateUser(req, res, next));

  /**
   * PUT /users/:id/settings
   * Update user settings
   */
  router.put('/:id/settings', (req, res, next) => controller.updateSettings(req, res, next));

  /**
   * DELETE /users/:id
   * Delete user (admin only)
   */
  router.delete('/:id', (req, res, next) => controller.deleteUser(req, res, next));

  /**
   * GET /users/:id/stats
   * Get user statistics
   */
  router.get('/:id/stats', (req, res, next) => controller.getUserStats(req, res, next));

  return router;
}
