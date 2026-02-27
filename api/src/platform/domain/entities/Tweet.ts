/**
 * Tweet Entity
 * Represents a tweet ingested from external sources (Chrome extension)
 */

/**
 * Tweet metrics
 */
export interface TweetMetrics {
  likes: number;
  replies: number;
  reposts: number;
  views: number;
}

/**
 * Tweet user
 */
export interface TweetUser {
  name: string;
  handle: string;
  avatar?: string;
}

/**
 * Tweet media
 */
export interface TweetMedia {
  images: string[];
  videos: string[];
  gifs: string[];
}

/**
 * Tweet timestamps
 */
export interface TweetTimestamps {
  scrapedAt: Date;
  ingestedAt: Date;
}

/**
 * Tweet status enum
 */
export enum TweetStatus {
  INGESTED = 'INGESTED',
  CLEANED = 'CLEANED',
  CATEGORIZED = 'CATEGORIZED',
  RANKED = 'RANKED',
  AUTOMATED = 'AUTOMATED',
  FAILED = 'FAILED',
}

/**
 * Tweet Entity
 * Immutable entity representing a tweet
 */
export class Tweet {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly batchId: string,
    public readonly injectedId: string,
    public readonly text: string,
    public readonly user: TweetUser,
    public readonly url: string,
    public readonly media: TweetMedia,
    public readonly metrics: TweetMetrics,
    public readonly status: TweetStatus,
    public readonly category: string | undefined,
    public readonly rank: number | undefined,
    public readonly automationAttempts: number,
    public readonly timestamps: TweetTimestamps,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  /**
   * Create a new tweet builder
   */
  static builder(): TweetBuilder {
    return new TweetBuilder();
  }

  /**
   * Convert to plain object
   */
  toPlain() {
    return {
      id: this.id,
      userId: this.userId,
      batchId: this.batchId,
      injectedId: this.injectedId,
      text: this.text,
      user: this.user,
      url: this.url,
      media: this.media,
      metrics: this.metrics,
      status: this.status,
      category: this.category,
      rank: this.rank,
      automationAttempts: this.automationAttempts,
      timestamps: this.timestamps,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Update tweet status
   */
  updateStatus(status: TweetStatus): Tweet {
    return new Tweet(
      this.id,
      this.userId,
      this.batchId,
      this.injectedId,
      this.text,
      this.user,
      this.url,
      this.media,
      this.metrics,
      status,
      this.category,
      this.rank,
      this.automationAttempts,
      this.timestamps,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update category
   */
  updateCategory(category: string): Tweet {
    return new Tweet(
      this.id,
      this.userId,
      this.batchId,
      this.injectedId,
      this.text,
      this.user,
      this.url,
      this.media,
      this.metrics,
      TweetStatus.CATEGORIZED,
      category,
      this.rank,
      this.automationAttempts,
      this.timestamps,
      this.createdAt,
      new Date()
    );
  }

  /**
   * Update rank
   */
  updateRank(rank: number): Tweet {
    return new Tweet(
      this.id,
      this.userId,
      this.batchId,
      this.injectedId,
      this.text,
      this.user,
      this.url,
      this.media,
      this.metrics,
      TweetStatus.RANKED,
      this.category,
      rank,
      this.automationAttempts,
      this.timestamps,
      this.createdAt,
      new Date()
    );
  }
}

/**
 * Tweet Builder
 * Builder pattern for creating Tweet instances
 */
export class TweetBuilder {
  private _id?: string;
  private _userId?: string;
  private _batchId?: string;
  private _injectedId?: string;
  private _text?: string;
  private _user?: TweetUser;
  private _url?: string;
  private _media?: TweetMedia;
  private _metrics?: TweetMetrics;
  private _status?: TweetStatus;
  private _category?: string;
  private _rank?: number;
  private _automationAttempts: number = 0;
  private _timestamps?: TweetTimestamps;
  private _createdAt?: Date;
  private _updatedAt?: Date;

  id(id: string): TweetBuilder {
    this._id = id;
    return this;
  }

  userId(userId: string): TweetBuilder {
    this._userId = userId;
    return this;
  }

  batchId(batchId: string): TweetBuilder {
    this._batchId = batchId;
    return this;
  }

  injectedId(injectedId: string): TweetBuilder {
    this._injectedId = injectedId;
    return this;
  }

  text(text: string): TweetBuilder {
    this._text = text;
    return this;
  }

  user(user: TweetUser): TweetBuilder {
    this._user = user;
    return this;
  }

  url(url: string): TweetBuilder {
    this._url = url;
    return this;
  }

  media(media: TweetMedia): TweetBuilder {
    this._media = media;
    return this;
  }

  metrics(metrics: TweetMetrics): TweetBuilder {
    this._metrics = metrics;
    return this;
  }

  status(status: TweetStatus): TweetBuilder {
    this._status = status;
    return this;
  }

  category(category: string | undefined): TweetBuilder {
    this._category = category;
    return this;
  }

  rank(rank: number | undefined): TweetBuilder {
    this._rank = rank;
    return this;
  }

  automationAttempts(attempts: number): TweetBuilder {
    this._automationAttempts = attempts;
    return this;
  }

  timestamps(timestamps: TweetTimestamps): TweetBuilder {
    this._timestamps = timestamps;
    return this;
  }

  createdAt(date: Date): TweetBuilder {
    this._createdAt = date;
    return this;
  }

  updatedAt(date: Date): TweetBuilder {
    this._updatedAt = date;
    return this;
  }

  build(): Tweet {
    if (!this._id) throw new Error('Tweet ID is required');
    if (!this._userId) throw new Error('User ID is required');
    if (!this._batchId) throw new Error('Batch ID is required');
    if (!this._injectedId) throw new Error('Injected ID is required');
    if (!this._text) throw new Error('Text is required');
    if (!this._user) throw new Error('User is required');
    if (!this._url) throw new Error('URL is required');
    if (!this._media) throw new Error('Media is required');
    if (!this._metrics) throw new Error('Metrics is required');
    if (!this._status) throw new Error('Status is required');
    if (!this._timestamps) throw new Error('Timestamps are required');

    return new Tweet(
      this._id,
      this._userId,
      this._batchId,
      this._injectedId,
      this._text,
      this._user,
      this._url,
      this._media,
      this._metrics,
      this._status,
      this._category,
      this._rank,
      this._automationAttempts,
      this._timestamps,
      this._createdAt || new Date(),
      this._updatedAt || new Date()
    );
  }
}
