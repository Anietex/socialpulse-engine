/**
 * Core types and enums
 * Barrel export for convenient imports
 */

export { ActionType, ActionTypeUtils } from './ActionType';
export { ContentStatus, ContentStatusUtils } from './ContentStatus';

// Re-export ActionContext for convenient importing
export type { ActionContext } from '../interfaces/IActionStrategy';

/**
 * Common types used across the platform
 */

/**
 * Category types for content classification
 */
export enum Category {
  EDUCATIONAL = 'educational',
  PROMOTIONAL = 'promotional',
  ENGAGEMENT = 'engagement',
  PERSONAL = 'personal',
  NEWS = 'news',
  ENTERTAINMENT = 'entertainment',
  OTHER = 'other',
}

/**
 * Priority levels for content ranking
 */
export enum Priority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Result type for operations that can fail
 * Follows Railway Oriented Programming pattern
 */
export type Result<T, E = Error> = { success: true; value: T } | { success: false; error: E };

/**
 * Utility functions for Result type
 */
export class ResultUtils {
  static ok<T>(value: T): Result<T, never> {
    return { success: true, value };
  }

  static err<E>(error: E): Result<never, E> {
    return { success: false, error };
  }

  static isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
    return result.success === true;
  }

  static isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
    return result.success === false;
  }
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Date range filter
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Generic filter interface
 */
export interface Filter<T = any> {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains';
  value: T;
}
