import { ContentId } from '../../core/value-objects/ContentId';
import { PlatformId } from '../../core/value-objects/PlatformId';
import { Metrics } from '../../core/value-objects/Metrics';
import { ContentStatus } from '../../core/types/ContentStatus';
import { ActionType } from '../../core/types/ActionType';
import { Author } from './Author';

/**
 * Media item interface
 */
export interface MediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  alt?: string;
  thumbnailUrl?: string;
}

/**
 * Rich domain entity for content
 * Contains business logic and validation
 *
 * This is NOT an anemic domain model - it contains:
 * - Business rules (canBeCategorized, shouldAutomate)
 * - Validation logic
 * - Status transition rules
 * - Content processing logic
 */
export class Content {
  private constructor(
    public readonly id: ContentId,
    public readonly platformId: PlatformId,
    public readonly platformContentId: string,
    public readonly text: string,
    public readonly author: Author,
    public readonly url: string,
    public readonly createdAt: Date,
    private _metrics: Metrics,
    private _status: ContentStatus,
    public readonly media: MediaItem[],
    public readonly isReply: boolean,
    public readonly isRepost: boolean,
    public readonly isQuote: boolean,
    private _category?: string,
    private _rankScore?: number,
    private _engagementAction?: ActionType,
    private _cleanedText?: string,
    private _textWithDescriptions?: string,
    public readonly platformData?: Record<string, any>,
    public readonly batchId?: string
  ) {
    this.validate();
  }

  /**
   * Getters for mutable fields (encapsulation)
   */
  get metrics(): Metrics {
    return this._metrics;
  }

  get status(): ContentStatus {
    return this._status;
  }

  get category(): string | undefined {
    return this._category;
  }

  get rankScore(): number | undefined {
    return this._rankScore;
  }

  get engagementAction(): ActionType | undefined {
    return this._engagementAction;
  }

  get cleanedText(): string | undefined {
    return this._cleanedText;
  }

  get textWithDescriptions(): string | undefined {
    return this._textWithDescriptions;
  }

  /**
   * Validate content data
   */
  private validate(): void {
    if (!this.text || this.text.trim() === '') {
      throw new Error('Content text is required');
    }
    if (!this.url || this.url.trim() === '') {
      throw new Error('Content URL is required');
    }
    if (this.createdAt > new Date()) {
      throw new Error('Content created date cannot be in the future');
    }
  }

  /**
   * Check if content is ready for categorization
   */
  canBeCategorized(): boolean {
    return (
      this._status === ContentStatus.PENDING_CATEGORIZATION && (!!this._cleanedText || !!this.text)
    );
  }

  /**
   * Check if content is ready for ranking
   */
  canBeRanked(): boolean {
    return this._status === ContentStatus.PENDING_RANKING && !!this._category;
  }

  /**
   * Check if content is ready for engagement determination
   */
  canDetermineEngagement(): boolean {
    return this._status === ContentStatus.PENDING_ACTION && this._rankScore !== undefined;
  }

  /**
   * Check if content should be automated
   */
  shouldAutomate(): boolean {
    return (
      this._status === ContentStatus.QUEUED_FOR_ENGAGEMENT &&
      this._engagementAction !== undefined &&
      this._engagementAction !== ActionType.VIEW // VIEW is passive
    );
  }

  /**
   * Check if content has high engagement
   */
  hasHighEngagement(threshold: number = 1000): boolean {
    return this._metrics.getTotalEngagement() > threshold;
  }

  /**
   * Check if content is in growth sweet spot (5-100 likes)
   */
  isInGrowthSweetSpot(): boolean {
    return this._metrics.isInGrowthSweetSpot();
  }

  /**
   * Check if content is viral
   */
  isViral(threshold: number = 0.1): boolean {
    return this._metrics.isViral(threshold);
  }

  /**
   * Check if content has media
   */
  hasMedia(): boolean {
    return this.media.length > 0;
  }

  /**
   * Get text for LLM processing (prefers textWithDescriptions)
   */
  getTextForProcessing(): string {
    return this._textWithDescriptions || this._cleanedText || this.text;
  }

  /**
   * Check if author is influential
   */
  hasInfluentialAuthor(followerThreshold: number = 50000): boolean {
    return this.author.isInfluential(followerThreshold);
  }

  /**
   * Calculate content age in hours
   */
  getAgeInHours(): number {
    const now = new Date();
    const ageMs = now.getTime() - this.createdAt.getTime();
    return ageMs / (1000 * 60 * 60);
  }

  /**
   * Check if content is fresh (less than 24 hours old)
   */
  isFresh(maxAgeHours: number = 24): boolean {
    return this.getAgeInHours() < maxAgeHours;
  }

  /**
   * Update methods (create new instance with updated field)
   * Content is immutable - these return new instances
   */

  withMetrics(metrics: Metrics): Content {
    return new Content(
      this.id,
      this.platformId,
      this.platformContentId,
      this.text,
      this.author,
      this.url,
      this.createdAt,
      metrics,
      this._status,
      this.media,
      this.isReply,
      this.isRepost,
      this.isQuote,
      this._category,
      this._rankScore,
      this._engagementAction,
      this._cleanedText,
      this._textWithDescriptions,
      this.platformData,
      this.batchId
    );
  }

  withStatus(status: ContentStatus): Content {
    return new Content(
      this.id,
      this.platformId,
      this.platformContentId,
      this.text,
      this.author,
      this.url,
      this.createdAt,
      this._metrics,
      status,
      this.media,
      this.isReply,
      this.isRepost,
      this.isQuote,
      this._category,
      this._rankScore,
      this._engagementAction,
      this._cleanedText,
      this._textWithDescriptions,
      this.platformData,
      this.batchId
    );
  }

  withCategory(category: string): Content {
    return new Content(
      this.id,
      this.platformId,
      this.platformContentId,
      this.text,
      this.author,
      this.url,
      this.createdAt,
      this._metrics,
      this._status,
      this.media,
      this.isReply,
      this.isRepost,
      this.isQuote,
      category,
      this._rankScore,
      this._engagementAction,
      this._cleanedText,
      this._textWithDescriptions,
      this.platformData,
      this.batchId
    );
  }

  withRankScore(rankScore: number): Content {
    return new Content(
      this.id,
      this.platformId,
      this.platformContentId,
      this.text,
      this.author,
      this.url,
      this.createdAt,
      this._metrics,
      this._status,
      this.media,
      this.isReply,
      this.isRepost,
      this.isQuote,
      this._category,
      rankScore,
      this._engagementAction,
      this._cleanedText,
      this._textWithDescriptions,
      this.platformData,
      this.batchId
    );
  }

  withEngagementAction(action: ActionType): Content {
    return new Content(
      this.id,
      this.platformId,
      this.platformContentId,
      this.text,
      this.author,
      this.url,
      this.createdAt,
      this._metrics,
      this._status,
      this.media,
      this.isReply,
      this.isRepost,
      this.isQuote,
      this._category,
      this._rankScore,
      action,
      this._cleanedText,
      this._textWithDescriptions,
      this.platformData,
      this.batchId
    );
  }

  withCleanedText(cleanedText: string): Content {
    return new Content(
      this.id,
      this.platformId,
      this.platformContentId,
      this.text,
      this.author,
      this.url,
      this.createdAt,
      this._metrics,
      this._status,
      this.media,
      this.isReply,
      this.isRepost,
      this.isQuote,
      this._category,
      this._rankScore,
      this._engagementAction,
      cleanedText,
      this._textWithDescriptions,
      this.platformData,
      this.batchId
    );
  }

  withTextWithDescriptions(textWithDescriptions: string): Content {
    return new Content(
      this.id,
      this.platformId,
      this.platformContentId,
      this.text,
      this.author,
      this.url,
      this.createdAt,
      this._metrics,
      this._status,
      this.media,
      this.isReply,
      this.isRepost,
      this.isQuote,
      this._category,
      this._rankScore,
      this._engagementAction,
      this._cleanedText,
      textWithDescriptions,
      this.platformData,
      this.batchId
    );
  }

  withBatchId(batchId: string): Content {
    return new Content(
      this.id,
      this.platformId,
      this.platformContentId,
      this.text,
      this.author,
      this.url,
      this.createdAt,
      this._metrics,
      this._status,
      this.media,
      this.isReply,
      this.isRepost,
      this.isQuote,
      this._category,
      this._rankScore,
      this._engagementAction,
      this._cleanedText,
      this._textWithDescriptions,
      this.platformData,
      batchId
    );
  }

  /**
   * Factory method to create Content from plain object
   */
  static fromPlain(data: ContentPlainObject): Content {
    return new Content(
      ContentId.fromString(data.id),
      PlatformId.fromString(data.platformId),
      data.platformContentId,
      data.text,
      Author.fromPlain(data.author),
      data.url,
      new Date(data.createdAt),
      Metrics.fromObject(data.metrics),
      data.status as ContentStatus,
      data.media || [],
      data.isReply || false,
      data.isRepost || false,
      data.isQuote || false,
      data.category,
      data.rankScore,
      data.engagementAction as ActionType | undefined,
      data.cleanedText,
      data.textWithDescriptions,
      data.platformData,
      data.batchId
    );
  }

  /**
   * Convert to plain object for persistence
   */
  toPlain(): ContentPlainObject {
    return {
      id: this.id.toString(),
      platformId: this.platformId.toString(),
      platformContentId: this.platformContentId,
      text: this.text,
      author: this.author.toPlain(),
      url: this.url,
      createdAt: this.createdAt.toISOString(),
      metrics: this._metrics.toObject(),
      status: this._status,
      media: this.media,
      isReply: this.isReply,
      isRepost: this.isRepost,
      isQuote: this.isQuote,
      category: this._category,
      rankScore: this._rankScore,
      engagementAction: this._engagementAction,
      cleanedText: this._cleanedText,
      textWithDescriptions: this._textWithDescriptions,
      platformData: this.platformData,
      batchId: this.batchId,
    };
  }

  /**
   * Builder for creating Content instances
   */
  static builder(): ContentBuilder {
    return new ContentBuilder();
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    return `Content(id=${this.id.toString()}, platform=${this.platformId.toString()}, status=${this._status}, author=${this.author.handle})`;
  }
}

/**
 * Plain object representation for serialization
 */
export interface ContentPlainObject {
  id: string;
  platformId: string;
  platformContentId: string;
  text: string;
  author: import('./Author').AuthorPlainObject;
  url: string;
  createdAt: string;
  metrics: {
    likes: number;
    comments: number;
    shares: number;
    views: number;
  };
  status: string;
  media: MediaItem[];
  isReply: boolean;
  isRepost: boolean;
  isQuote: boolean;
  category?: string;
  rankScore?: number;
  engagementAction?: string;
  cleanedText?: string;
  textWithDescriptions?: string;
  platformData?: Record<string, any>;
  batchId?: string;
}

/**
 * Builder pattern for Content creation
 * Makes it easier to construct Content with many optional fields
 */
export class ContentBuilder {
  private props: Partial<ContentPlainObject> = {};

  id(id: string): this {
    this.props.id = id;
    return this;
  }

  platformId(platformId: string): this {
    this.props.platformId = platformId;
    return this;
  }

  platformContentId(platformContentId: string): this {
    this.props.platformContentId = platformContentId;
    return this;
  }

  text(text: string): this {
    this.props.text = text;
    return this;
  }

  author(author: import('./Author').AuthorPlainObject): this {
    this.props.author = author;
    return this;
  }

  url(url: string): this {
    this.props.url = url;
    return this;
  }

  createdAt(createdAt: string | Date): this {
    this.props.createdAt = createdAt instanceof Date ? createdAt.toISOString() : createdAt;
    return this;
  }

  metrics(metrics: { likes: number; comments: number; shares: number; views?: number }): this {
    this.props.metrics = {
      likes: metrics.likes,
      comments: metrics.comments,
      shares: metrics.shares,
      views: metrics.views || 0,
    };
    return this;
  }

  status(status: string): this {
    this.props.status = status;
    return this;
  }

  media(media: MediaItem[]): this {
    this.props.media = media;
    return this;
  }

  isReply(isReply: boolean): this {
    this.props.isReply = isReply;
    return this;
  }

  isRepost(isRepost: boolean): this {
    this.props.isRepost = isRepost;
    return this;
  }

  isQuote(isQuote: boolean): this {
    this.props.isQuote = isQuote;
    return this;
  }

  category(category: string): this {
    this.props.category = category;
    return this;
  }

  rankScore(rankScore: number): this {
    this.props.rankScore = rankScore;
    return this;
  }

  engagementAction(engagementAction: string): this {
    this.props.engagementAction = engagementAction;
    return this;
  }

  cleanedText(cleanedText: string): this {
    this.props.cleanedText = cleanedText;
    return this;
  }

  textWithDescriptions(textWithDescriptions: string): this {
    this.props.textWithDescriptions = textWithDescriptions;
    return this;
  }

  platformData(platformData: Record<string, any>): this {
    this.props.platformData = platformData;
    return this;
  }

  batchId(batchId: string): this {
    this.props.batchId = batchId;
    return this;
  }

  build(): Content {
    // Validation
    if (!this.props.id) throw new Error('Content ID is required');
    if (!this.props.platformId) throw new Error('Platform ID is required');
    if (!this.props.platformContentId) throw new Error('Platform content ID is required');
    if (!this.props.text) throw new Error('Text is required');
    if (!this.props.author) throw new Error('Author is required');
    if (!this.props.url) throw new Error('URL is required');
    if (!this.props.createdAt) throw new Error('Created date is required');
    if (!this.props.metrics) throw new Error('Metrics are required');
    if (!this.props.status) throw new Error('Status is required');

    // Set defaults for optional fields
    if (this.props.media === undefined) this.props.media = [];
    if (this.props.isReply === undefined) this.props.isReply = false;
    if (this.props.isRepost === undefined) this.props.isRepost = false;
    if (this.props.isQuote === undefined) this.props.isQuote = false;

    return Content.fromPlain(this.props as ContentPlainObject);
  }
}
