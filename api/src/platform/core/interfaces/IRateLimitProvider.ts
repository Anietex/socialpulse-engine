/**
 * Rate limit information for an action type
 */
export interface RateLimit {
  /**
   * Action type this rate limit applies to
   */
  actionType: string;

  /**
   * Maximum number of actions allowed in the time window
   */
  maxActions: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Minimum delay between actions in milliseconds
   * Used to make automation appear more human-like
   */
  minDelayMs: number;

  /**
   * Maximum delay between actions in milliseconds
   * Random delays are chosen between min and max
   */
  maxDelayMs: number;
}

/**
 * Rate limit status for tracking consumption
 */
export interface RateLimitStatus {
  actionType: string;
  actionsRemaining: number;
  resetAt: Date;
  isLimited: boolean;
}

/**
 * Interface for providing platform-specific rate limits
 * Implementations define safe automation rates to avoid detection
 */
export interface IRateLimitProvider {
  /**
   * Get rate limit for a specific action type
   * @param actionType The action to get limits for
   * @returns Rate limit configuration or null if no limit
   */
  getRateLimit(actionType: string): RateLimit | null;

  /**
   * Get all rate limits for this platform
   * @returns Map of action types to rate limits
   */
  getAllRateLimits(): Map<string, RateLimit>;

  /**
   * Check current rate limit status for an action
   * @param actionType The action to check
   * @returns Current status of the rate limit
   */
  getRateLimitStatus(actionType: string): Promise<RateLimitStatus>;

  /**
   * Calculate a human-like delay for an action
   * Returns a random delay within the configured range
   * @param actionType The action to calculate delay for
   * @returns Delay in milliseconds
   */
  calculateDelay(actionType: string): number;

  /**
   * Get the platform this rate limit provider targets
   */
  readonly platformId: string;
}
