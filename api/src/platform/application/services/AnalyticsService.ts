/**
 * Analytics Service
 * Generates and retrieves analytics data
 */

import {
  IAnalyticsRepository,
  AnalyticsQueryParams,
} from '../../domain/repositories/IAnalyticsRepository';
import { ITweetRepository } from '../../domain/repositories/ITweetRepository';
import { Analytics, AnalyticsMetrics } from '../../domain/entities/Analytics';
import { TweetStatus } from '../../domain/entities/Tweet';
import { logger } from '../../../config/logger';
import { nanoid } from 'nanoid';

/**
 * Analytics Service
 */
export class AnalyticsService {
  constructor(
    private readonly analyticsRepository: IAnalyticsRepository,
    private readonly tweetRepository: ITweetRepository
  ) {}

  /**
   * Generate analytics for a specific date and user
   */
  async generateAnalytics(userId: string | undefined, date: Date): Promise<Analytics> {
    logger.info('Generating analytics', { userId, date });

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all tweets for the date range
    const tweets = userId ? await this.tweetRepository.findByUserId(userId, 10000) : [];

    // Filter tweets by date
    const tweetsInRange = tweets.filter(
      (tweet) => tweet.createdAt >= startOfDay && tweet.createdAt <= endOfDay
    );

    // Calculate metrics
    const tweetsIngested = tweetsInRange.filter((t) => t.status === TweetStatus.INGESTED).length;

    const tweetsProcessed = tweetsInRange.filter(
      (t) =>
        t.status === TweetStatus.CLEANED ||
        t.status === TweetStatus.CATEGORIZED ||
        t.status === TweetStatus.RANKED ||
        t.status === TweetStatus.AUTOMATED
    ).length;

    const tweetsAutomated = tweetsInRange.filter((t) => t.status === TweetStatus.AUTOMATED).length;

    // Calculate category breakdown
    const categoryMap = new Map<string, number>();
    tweetsInRange.forEach((tweet) => {
      if (tweet.category) {
        categoryMap.set(tweet.category, (categoryMap.get(tweet.category) || 0) + 1);
      }
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, count]) => ({
      category,
      count,
    }));

    const metrics: AnalyticsMetrics = {
      tweetsIngested,
      tweetsProcessed,
      tweetsAutomated,
      avgProcessingTime: 0, // TODO: Calculate from job data
      categoryBreakdown,
    };

    // Check if analytics already exists
    const existing = await this.analyticsRepository.findByUserAndDate(userId, date);

    if (existing) {
      const updated = existing.updateMetrics(metrics);
      return await this.analyticsRepository.save(updated);
    }

    // Create new analytics
    const analytics = Analytics.builder()
      .id(`analytics_${Date.now()}_${nanoid(8)}`)
      .userId(userId)
      .date(date)
      .metrics(metrics)
      .createdAt(new Date())
      .updatedAt(new Date())
      .build();

    return await this.analyticsRepository.save(analytics);
  }

  /**
   * Get analytics by query params
   */
  async getAnalytics(params: AnalyticsQueryParams): Promise<Analytics[]> {
    return await this.analyticsRepository.find(params);
  }

  /**
   * Get system-wide analytics
   */
  async getSystemAnalytics(startDate: Date, endDate: Date): Promise<Analytics[]> {
    return await this.analyticsRepository.getSystemAnalytics(startDate, endDate);
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string, startDate: Date, endDate: Date): Promise<Analytics[]> {
    return await this.analyticsRepository.getUserAnalytics(userId, startDate, endDate);
  }

  /**
   * Get analytics summary
   */
  async getAnalyticsSummary(userId?: string) {
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 30);

    const analytics = userId
      ? await this.getUserAnalytics(userId, last30Days, now)
      : await this.getSystemAnalytics(last30Days, now);

    const totalTweetsIngested = analytics.reduce((sum, a) => sum + a.metrics.tweetsIngested, 0);
    const totalTweetsProcessed = analytics.reduce((sum, a) => sum + a.metrics.tweetsProcessed, 0);
    const totalTweetsAutomated = analytics.reduce((sum, a) => sum + a.metrics.tweetsAutomated, 0);

    // Aggregate category breakdown
    const categoryMap = new Map<string, number>();
    analytics.forEach((a) => {
      a.metrics.categoryBreakdown.forEach((cb) => {
        categoryMap.set(cb.category, (categoryMap.get(cb.category) || 0) + cb.count);
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalTweetsIngested,
      totalTweetsProcessed,
      totalTweetsAutomated,
      categoryBreakdown,
      successRate: totalTweetsIngested > 0 ? (totalTweetsAutomated / totalTweetsIngested) * 100 : 0,
      last30Days: analytics.length,
    };
  }
}
