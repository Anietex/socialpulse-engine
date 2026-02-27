/**
 * User Controller
 * Handles user management HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { UserRole } from '../../domain/entities/User';
import { logger } from '../../../config/logger';

/**
 * User Controller
 */
export class UserController {
  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Get all users (admin only)
   * GET /users
   */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user is admin
      if (req.user?.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required',
        });
        return;
      }

      const role = req.query.role as UserRole | undefined;
      const users = role ? await this.userRepository.findByRole(role) : []; // TODO: Add findAll method

      const publicUsers = users.map((user) => user.toPublic());

      res.status(200).json({
        success: true,
        data: publicUsers,
      });
    } catch (error) {
      logger.error('Get users failed', { error });
      next(error);
    }
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Users can only view their own profile unless admin
      if (req.user?.role !== UserRole.ADMIN && req.user?._id !== id) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot view other user profiles',
        });
        return;
      }

      const user = await this.userRepository.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user.toPublic(),
      });
    } catch (error) {
      logger.error('Get user by ID failed', { error });
      next(error);
    }
  }

  /**
   * Update user
   * PUT /users/:id
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Users can only update their own profile unless admin
      if (req.user?.role !== UserRole.ADMIN && req.user?._id !== id) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot update other user profiles',
        });
        return;
      }

      const user = await this.userRepository.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Update allowed fields
      const { name, twitterHandle } = req.body;

      const updatedUser = user.update({
        name: name || user.name,
        twitterHandle: twitterHandle !== undefined ? twitterHandle : user.twitterHandle,
      });

      const saved = await this.userRepository.save(updatedUser);

      res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: saved.toPublic(),
      });
    } catch (error) {
      logger.error('Update user failed', { error });
      next(error);
    }
  }

  /**
   * Update user settings
   * PUT /users/:id/settings
   */
  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Users can only update their own settings unless admin
      if (req.user?.role !== UserRole.ADMIN && req.user?._id !== id) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot update other user settings',
        });
        return;
      }

      const user = await this.userRepository.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // Update settings
      const { automation, notifications } = req.body;

      const newSettings = user.settings.update({
        automation: automation || user.settings.automation,
        notifications: notifications || user.settings.notifications,
      });

      const updatedUser = user.updateSettings(newSettings);
      const saved = await this.userRepository.save(updatedUser);

      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: saved.toPublic(),
      });
    } catch (error) {
      logger.error('Update settings failed', { error });
      next(error);
    }
  }

  /**
   * Delete user (admin only)
   * DELETE /users/:id
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Only admins can delete users
      if (req.user?.role !== UserRole.ADMIN) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Admin access required',
        });
        return;
      }

      const user = await this.userRepository.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      await this.userRepository.delete(id);

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error('Delete user failed', { error });
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /users/:id/stats
   */
  async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Users can only view their own stats unless admin
      if (req.user?.role !== UserRole.ADMIN && req.user?._id !== id) {
        res.status(403).json({
          success: false,
          message: 'Forbidden: Cannot view other user statistics',
        });
        return;
      }

      const user = await this.userRepository.findById(id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      // TODO: Get actual statistics from tweet repository
      const stats = {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        totalTweets: 0,
        automatedTweets: 0,
        createdAt: user.createdAt,
      };

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get user stats failed', { error });
      next(error);
    }
  }
}
