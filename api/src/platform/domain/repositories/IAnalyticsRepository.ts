/**
 * Analytics Repository Interface
 */

import { Analytics } from '../entities/Analytics';

export interface AnalyticsQueryParams {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface IAnalyticsRepository {
  /**
   * Save analytics
   */
  save(analytics: Analytics): Promise<Analytics>;

  /**
   * Find analytics by ID
   */
  findById(id: string): Promise<Analytics | null>;

  /**
   * Find analytics by user and date
   */
  findByUserAndDate(userId: string | undefined, date: Date): Promise<Analytics | null>;

  /**
   * Find analytics by query params
   */
  find(params: AnalyticsQueryParams): Promise<Analytics[]>;

  /**
   * Get system-wide analytics for date range
   */
  getSystemAnalytics(startDate: Date, endDate: Date): Promise<Analytics[]>;

  /**
   * Get user analytics for date range
   */
  getUserAnalytics(userId: string, startDate: Date, endDate: Date): Promise<Analytics[]>;

  /**
   * Delete analytics
   */
  delete(id: string): Promise<void>;
}
