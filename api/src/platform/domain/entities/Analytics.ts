/**
 * Analytics Entity
 * Represents analytics data for tweets and user activity
 */

/**
 * Category breakdown
 */
export interface CategoryBreakdown {
  category: string;
  count: number;
}

/**
 * Analytics metrics
 */
export interface AnalyticsMetrics {
  tweetsIngested: number;
  tweetsProcessed: number;
  tweetsAutomated: number;
  avgProcessingTime: number;
  categoryBreakdown: CategoryBreakdown[];
}

/**
 * Analytics Entity
 * Tracks analytics for a specific date and user (or system-wide)
 */
export class Analytics {
  constructor(
    public readonly id: string,
    public readonly userId: string | undefined, // undefined = system-wide
    public readonly date: Date,
    public readonly metrics: AnalyticsMetrics,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Create a new analytics builder
   */
  static builder(): AnalyticsBuilder {
    return new AnalyticsBuilder();
  }

  /**
   * Convert to plain object
   */
  toPlain() {
    return {
      id: this.id,
      userId: this.userId,
      date: this.date,
      metrics: this.metrics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Check if system-wide analytics
   */
  isSystemWide(): boolean {
    return this.userId === undefined;
  }

  /**
   * Update metrics
   */
  updateMetrics(metrics: Partial<AnalyticsMetrics>): Analytics {
    return new Analytics(
      this.id,
      this.userId,
      this.date,
      { ...this.metrics, ...metrics },
      this.createdAt,
      new Date()
    );
  }
}

/**
 * Analytics Builder
 */
export class AnalyticsBuilder {
  private _id?: string;
  private _userId?: string;
  private _date?: Date;
  private _metrics?: AnalyticsMetrics;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  id(id: string): AnalyticsBuilder {
    this._id = id;
    return this;
  }

  userId(userId: string | undefined): AnalyticsBuilder {
    this._userId = userId;
    return this;
  }

  date(date: Date): AnalyticsBuilder {
    this._date = date;
    return this;
  }

  metrics(metrics: AnalyticsMetrics): AnalyticsBuilder {
    this._metrics = metrics;
    return this;
  }

  createdAt(date: Date): AnalyticsBuilder {
    this._createdAt = date;
    return this;
  }

  updatedAt(date: Date): AnalyticsBuilder {
    this._updatedAt = date;
    return this;
  }

  build(): Analytics {
    if (!this._id) throw new Error('Analytics ID is required');
    if (!this._date) throw new Error('Date is required');
    if (!this._metrics) throw new Error('Metrics are required');

    return new Analytics(
      this._id,
      this._userId,
      this._date,
      this._metrics,
      this._createdAt || new Date(),
      this._updatedAt || new Date()
    );
  }
}
