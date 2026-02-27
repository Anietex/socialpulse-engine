import { RawContent } from './IContentScraper';

/**
 * Normalized content in platform-agnostic format
 * This is the shape expected by the domain layer
 */
export interface NormalizedContent {
  // Identity
  id: string; // Platform-specific content ID
  platformId: string; // Which platform this came from
  url: string; // Direct link to the content

  // Author information
  authorId: string;
  authorUsername: string;
  authorDisplayName?: string;
  authorFollowers?: number;
  authorIsVerified?: boolean;

  // Content
  text: string;
  hasMedia: boolean;
  mediaUrls?: string[];
  mediaTypes?: ('image' | 'video' | 'gif')[];

  // Engagement metrics
  likes: number;
  comments: number;
  shares: number; // Retweets, reposts, etc.
  views?: number;

  // Metadata
  createdAt: Date;
  language?: string;
  hashtags?: string[];
  mentions?: string[];

  // Classification hints
  isReply: boolean;
  isRepost: boolean; // Retweet, share, etc.
  isQuote: boolean; // Quote tweet, quote post, etc.

  // Raw data for platform-specific needs
  rawData?: Record<string, any>;
}

/**
 * Interface for normalizing platform-specific content
 * Converts RawContent to NormalizedContent for domain layer
 *
 * Follows Adapter Pattern and Single Responsibility Principle
 * - Each platform has its own normalizer
 * - Normalizer only does transformation, no business logic
 */
export interface IContentNormalizer {
  /**
   * Normalize a single piece of raw content
   * @param raw Platform-specific raw content
   * @returns Normalized content or null if cannot be normalized
   */
  normalize(raw: RawContent): NormalizedContent | null;

  /**
   * Normalize multiple pieces of content
   * Filters out any that fail normalization
   * @param rawList Array of raw content
   * @returns Array of successfully normalized content
   */
  normalizeMany(rawList: RawContent[]): NormalizedContent[];

  /**
   * Validate that raw content has required fields
   * @param raw Raw content to validate
   * @returns true if content can be normalized
   */
  canNormalize(raw: RawContent): boolean;

  /**
   * Get the platform this normalizer targets
   */
  readonly platformId: string;
}
