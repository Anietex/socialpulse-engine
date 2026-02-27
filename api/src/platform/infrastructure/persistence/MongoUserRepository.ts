/**
 * MongoDB User Repository
 * Implements IUserRepository using MongoDB
 */

import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { User } from '../../domain/entities/User';
import { UserRole } from '../../../shared/constants/roles.js';
import { UserStatus } from '../../../shared/constants/statuses.js';
import { UserModel, UserDocument } from './schemas/UserSchema';
import { UserMapper } from './mappers/UserMapper';
import { logger } from '../../../config/logger.js';

export class MongoUserRepository implements IUserRepository {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    try {
      const doc = await UserModel.findById(id);
      return doc ? UserMapper.toDomain(doc) : null;
    } catch (error) {
      logger.error('Error finding user by ID', { id, error });
      throw error;
    }
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    try {
      const doc = await UserModel.findOne({ email: email.toLowerCase() });
      return doc ? UserMapper.toDomain(doc) : null;
    } catch (error) {
      logger.error('Error finding user by email', { email, error });
      throw error;
    }
  }

  /**
   * Find user by Twitter handle
   */
  async findByTwitterHandle(handle: string): Promise<User | null> {
    try {
      const doc = await UserModel.findOne({ twitterHandle: handle });
      return doc ? UserMapper.toDomain(doc) : null;
    } catch (error) {
      logger.error('Error finding user by Twitter handle', { handle, error });
      throw error;
    }
  }

  /**
   * Find users by role
   */
  async findByRole(role: UserRole): Promise<User[]> {
    try {
      const docs = await UserModel.find({ role }).sort({ createdAt: -1 });
      return docs.map((doc) => UserMapper.toDomain(doc));
    } catch (error) {
      logger.error('Error finding users by role', { role, error });
      throw error;
    }
  }

  /**
   * Find users by status
   */
  async findByStatus(status: UserStatus): Promise<User[]> {
    try {
      const docs = await UserModel.find({ status }).sort({ createdAt: -1 });
      return docs.map((doc) => UserMapper.toDomain(doc));
    } catch (error) {
      logger.error('Error finding users by status', { status, error });
      throw error;
    }
  }

  /**
   * Find all users with pagination
   */
  async findAll(limit: number = 50, offset: number = 0): Promise<User[]> {
    try {
      const docs = await UserModel.find().sort({ createdAt: -1 }).limit(limit).skip(offset);
      return docs.map((doc) => UserMapper.toDomain(doc));
    } catch (error) {
      logger.error('Error finding all users', { limit, offset, error });
      throw error;
    }
  }

  /**
   * Save user (create or update)
   */
  async save(user: User): Promise<User> {
    try {
      const persistence = UserMapper.toPersistence(user);

      let doc: UserDocument;

      // Check if user exists (by ID)
      const existing = await UserModel.findById(user.id);

      if (existing) {
        // Update existing user
        Object.assign(existing, persistence);
        doc = await existing.save();
      } else {
        // Create new user
        doc = await UserModel.create({
          _id: user.id,
          ...persistence,
        });
      }

      return UserMapper.toDomain(doc);
    } catch (error) {
      logger.error('Error saving user', { userId: user.id, error });
      throw error;
    }
  }

  /**
   * Delete user by ID
   */
  async delete(id: string): Promise<void> {
    try {
      await UserModel.findByIdAndDelete(id);
    } catch (error) {
      logger.error('Error deleting user', { id, error });
      throw error;
    }
  }

  /**
   * Count total users
   */
  async count(): Promise<number> {
    try {
      return await UserModel.countDocuments();
    } catch (error) {
      logger.error('Error counting users', { error });
      throw error;
    }
  }

  /**
   * Count users by role
   */
  async countByRole(role: UserRole): Promise<number> {
    try {
      return await UserModel.countDocuments({ role });
    } catch (error) {
      logger.error('Error counting users by role', { role, error });
      throw error;
    }
  }

  /**
   * Count users by status
   */
  async countByStatus(status: UserStatus): Promise<number> {
    try {
      return await UserModel.countDocuments({ status });
    } catch (error) {
      logger.error('Error counting users by status', { status, error });
      throw error;
    }
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      const count = await UserModel.countDocuments({ email: email.toLowerCase() });
      return count > 0;
    } catch (error) {
      logger.error('Error checking if email exists', { email, error });
      throw error;
    }
  }
}
