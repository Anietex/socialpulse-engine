/**
 * Engagement metrics value object
 * Encapsulates content engagement data with useful business methods
 *
 * Benefits:
 * - Immutable metrics
 * - Built-in validation
 * - Useful comparison and calculation methods
 * - Type-safe metric operations
 */
export class Metrics {
  private constructor(
    private readonly likes: number,
    private readonly comments: number,
    private readonly shares: number,
    private readonly views: number
  ) {
    // Validate all metrics are non-negative
    if (likes < 0 || comments < 0 || shares < 0 || views < 0) {
      throw new Error('Metrics cannot be negative');
    }
  }

  /**
   * Create metrics from individual values
   */
  static create(likes: number, comments: number, shares: number, views: number = 0): Metrics {
    return new Metrics(likes, comments, shares, views);
  }

  /**
   * Create zero metrics (for new content)
   */
  static zero(): Metrics {
    return new Metrics(0, 0, 0, 0);
  }

  /**
   * Create from object (useful for database deserialization)
   */
  static fromObject(obj: {
    likes: number;
    comments: number;
    shares: number;
    views?: number;
  }): Metrics {
    return new Metrics(obj.likes, obj.comments, obj.shares, obj.views || 0);
  }

  /**
   * Getters
   */
  getLikes(): number {
    return this.likes;
  }

  getComments(): number {
    return this.comments;
  }

  getShares(): number {
    return this.shares;
  }

  getViews(): number {
    return this.views;
  }

  /**
   * Calculate total engagement (likes + comments + shares)
   */
  getTotalEngagement(): number {
    return this.likes + this.comments + this.shares;
  }

  /**
   * Calculate engagement rate (total engagement / views)
   * Returns 0 if views is 0
   */
  getEngagementRate(): number {
    if (this.views === 0) return 0;
    return this.getTotalEngagement() / this.views;
  }

  /**
   * Calculate a weighted engagement score
   * Weights: likes=1, comments=2, shares=3 (shares are most valuable)
   */
  getWeightedScore(): number {
    return this.likes * 1 + this.comments * 2 + this.shares * 3;
  }

  /**
   * Check if content has any engagement
   */
  hasEngagement(): boolean {
    return this.getTotalEngagement() > 0;
  }

  /**
   * Check if content is in growth sweet spot
   * Between 5-100 likes (configurable thresholds)
   */
  isInGrowthSweetSpot(minLikes: number = 5, maxLikes: number = 100): boolean {
    return this.likes >= minLikes && this.likes <= maxLikes;
  }

  /**
   * Check if content is viral (high engagement relative to views)
   */
  isViral(threshold: number = 0.1): boolean {
    return this.getEngagementRate() >= threshold;
  }

  /**
   * Compare with another Metrics object
   * Returns positive if this has more total engagement
   */
  compareTo(other: Metrics): number {
    return this.getTotalEngagement() - other.getTotalEngagement();
  }

  /**
   * Check if this has more engagement than another
   */
  hasMoreEngagementThan(other: Metrics): boolean {
    return this.compareTo(other) > 0;
  }

  /**
   * Convert to plain object for serialization
   */
  toObject(): {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  } {
    return {
      likes: this.likes,
      comments: this.comments,
      shares: this.shares,
      views: this.views,
    };
  }

  /**
   * Create a new Metrics with updated values
   * Since Metrics is immutable, this returns a new instance
   */
  withUpdatedLikes(likes: number): Metrics {
    return new Metrics(likes, this.comments, this.shares, this.views);
  }

  withUpdatedComments(comments: number): Metrics {
    return new Metrics(this.likes, comments, this.shares, this.views);
  }

  withUpdatedShares(shares: number): Metrics {
    return new Metrics(this.likes, this.comments, shares, this.views);
  }

  withUpdatedViews(views: number): Metrics {
    return new Metrics(this.likes, this.comments, this.shares, views);
  }

  /**
   * String representation for logging
   */
  toString(): string {
    return `Metrics(likes=${this.likes}, comments=${this.comments}, shares=${this.shares}, views=${this.views}, engagement=${this.getTotalEngagement()})`;
  }
}
