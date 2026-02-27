import {
  IRateLimitProvider,
  RateLimit,
  RateLimitStatus,
} from '../../core/interfaces/IRateLimitProvider';
import { ActionType } from '../../core/types/ActionType';

/**
 * Twitter Rate Limit Provider
 * Defines safe automation rates to avoid Twitter detection and API limits
 *
 * Conservative limits to mimic human behavior:
 * - Likes: 150/hour, 1000/day (Twitter allows 1000/day officially)
 * - Replies: 25/hour, 50/day (very conservative to avoid spam detection)
 * - Retweets: 50/hour, 300/day
 * - Quotes: 10/hour, 25/day (most restrictive due to content creation)
 */
export class TwitterRateLimitProvider implements IRateLimitProvider {
  readonly platformId = 'twitter';

  private rateLimits: Map<string, RateLimit>;
  private actionHistory: Map<string, Date[]> = new Map();

  constructor() {
    this.rateLimits = new Map([
      [
        ActionType.LIKE,
        {
          actionType: ActionType.LIKE,
          maxActions: 150,
          windowMs: 60 * 60 * 1000, // 1 hour
          minDelayMs: 2000, // 2 seconds
          maxDelayMs: 8000, // 8 seconds
        },
      ],
      [
        ActionType.COMMENT,
        {
          actionType: ActionType.COMMENT,
          maxActions: 25,
          windowMs: 60 * 60 * 1000, // 1 hour
          minDelayMs: 60000, // 1 minute
          maxDelayMs: 180000, // 3 minutes
        },
      ],
      [
        ActionType.SHARE,
        {
          actionType: ActionType.SHARE,
          maxActions: 50,
          windowMs: 60 * 60 * 1000, // 1 hour
          minDelayMs: 5000, // 5 seconds
          maxDelayMs: 15000, // 15 seconds
        },
      ],
      [
        ActionType.QUOTE,
        {
          actionType: ActionType.QUOTE,
          maxActions: 10,
          windowMs: 60 * 60 * 1000, // 1 hour
          minDelayMs: 120000, // 2 minutes
          maxDelayMs: 300000, // 5 minutes
        },
      ],
      [
        ActionType.VIEW,
        {
          actionType: ActionType.VIEW,
          maxActions: 500,
          windowMs: 60 * 60 * 1000, // 1 hour
          minDelayMs: 1000, // 1 second
          maxDelayMs: 3000, // 3 seconds
        },
      ],
    ]);
  }

  /**
   * Get rate limit for a specific action type
   */
  getRateLimit(actionType: string): RateLimit | null {
    return this.rateLimits.get(actionType) || null;
  }

  /**
   * Get all rate limits
   */
  getAllRateLimits(): Map<string, RateLimit> {
    return new Map(this.rateLimits);
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(actionType: string): Promise<RateLimitStatus> {
    const rateLimit = this.getRateLimit(actionType);

    if (!rateLimit) {
      return {
        actionType,
        actionsRemaining: Infinity,
        resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        isLimited: false,
      };
    }

    // Get action history for this type
    const history = this.actionHistory.get(actionType) || [];

    // Filter to only actions within the time window
    const now = Date.now();
    const windowStart = now - rateLimit.windowMs;
    const recentActions = history.filter((timestamp) => timestamp.getTime() >= windowStart);

    // Calculate remaining actions
    const actionsRemaining = Math.max(0, rateLimit.maxActions - recentActions.length);

    // Calculate reset time (end of current window)
    const oldestAction = recentActions[0];
    const resetAt = oldestAction
      ? new Date(oldestAction.getTime() + rateLimit.windowMs)
      : new Date(now + rateLimit.windowMs);

    return {
      actionType,
      actionsRemaining,
      resetAt,
      isLimited: actionsRemaining === 0,
    };
  }

  /**
   * Calculate a human-like random delay for an action
   */
  calculateDelay(actionType: string): number {
    const rateLimit = this.getRateLimit(actionType);

    if (!rateLimit) {
      // Default delay if no rate limit configured
      return Math.floor(Math.random() * 3000) + 2000; // 2-5 seconds
    }

    const { minDelayMs, maxDelayMs } = rateLimit;
    return Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
  }

  /**
   * Record an action (for tracking rate limits)
   */
  recordAction(actionType: string): void {
    const history = this.actionHistory.get(actionType) || [];
    history.push(new Date());
    this.actionHistory.set(actionType, history);

    // Clean up old history to prevent memory bloat
    this.cleanupHistory(actionType);
  }

  /**
   * Clean up old action history outside the time window
   */
  private cleanupHistory(actionType: string): void {
    const rateLimit = this.getRateLimit(actionType);
    if (!rateLimit) return;

    const history = this.actionHistory.get(actionType);
    if (!history) return;

    const now = Date.now();
    const windowStart = now - rateLimit.windowMs;

    // Keep only actions within the window
    const recentActions = history.filter((timestamp) => timestamp.getTime() >= windowStart);
    this.actionHistory.set(actionType, recentActions);
  }

  /**
   * Check if an action would exceed rate limits
   */
  async wouldExceedLimit(actionType: string): Promise<boolean> {
    const status = await this.getRateLimitStatus(actionType);
    return status.isLimited;
  }

  /**
   * Get time until rate limit resets
   */
  async getTimeUntilReset(actionType: string): Promise<number> {
    const status = await this.getRateLimitStatus(actionType);
    return status.resetAt.getTime() - Date.now();
  }
}
