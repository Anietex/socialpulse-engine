/**
 * User Repository Interface
 * Defines contract for user persistence operations
 */

import { User } from '../entities/User';
import { UserRole } from '../../../shared/constants/roles.js';
import { UserStatus } from '../../../shared/constants/statuses.js';

export interface IUserRepository {
  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by Twitter handle
   */
  findByTwitterHandle(handle: string): Promise<User | null>;

  /**
   * Find users by role
   */
  findByRole(role: UserRole): Promise<User[]>;

  /**
   * Find users by status
   */
  findByStatus(status: UserStatus): Promise<User[]>;

  /**
   * Find all users with pagination
   */
  findAll(limit?: number, offset?: number): Promise<User[]>;

  /**
   * Save user (create or update)
   */
  save(user: User): Promise<User>;

  /**
   * Delete user by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Count total users
   */
  count(): Promise<number>;

  /**
   * Count users by role
   */
  countByRole(role: UserRole): Promise<number>;

  /**
   * Count users by status
   */
  countByStatus(status: UserStatus): Promise<number>;

  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<boolean>;
}
