import { IContentNormalizer, NormalizedContent } from '../../core/interfaces/IContentNormalizer';
import { RawContent } from '../../core/interfaces/IContentScraper';

/**
 * Twitter Content Normalizer
 * Transforms Twitter-specific raw data into platform-agnostic normalized format
 *
 * Responsibilities:
 * - Map Twitter fields to normalized fields
 * - Extract hashtags and mentions
 * - Detect reply/repost/quote status
 * - Ensure all required fields are present
 */
export class TwitterNormalizer implements IContentNormalizer {
  readonly platformId = 'twitter';

  /**
   * Check if raw content can be normalized
   * Validates required fields are present
   */
  canNormalize(raw: RawContent): boolean {
    return !!(raw.id && raw.text && raw.author && raw.url);
  }

  /**
   * Normalize a single piece of raw Twitter content
   */
  normalize(raw: RawContent): NormalizedContent | null {
    if (!this.canNormalize(raw)) {
      return null;
    }

    try {
      // Extract author info
      const author = raw.author || {};
      const authorId = author.id || author.handle || 'unknown';
      const authorUsername = author.handle || 'unknown';
      const authorDisplayName = author.name;
      const authorFollowers = author.followerCount;
      const authorIsVerified = author.verified || false;

      // Extract metrics
      const metrics = raw.metrics || {};
      const likes = metrics.likes || 0;
      const comments = metrics.comments || 0;
      const shares = metrics.shares || 0;
      const views = metrics.views || 0;

      // Extract hashtags
      const hashtags = this.extractHashtags(raw.text);

      // Extract mentions
      const mentions = this.extractMentions(raw.text);

      // Detect content type
      const isReply = this.isReplyTweet(raw);
      const isRepost = this.isRetweet(raw);
      const isQuote = this.isQuoteTweet(raw);

      // Extract media info
      const hasMedia = raw.hasMedia || false;
      const mediaUrls = raw.mediaUrls || [];
      const mediaTypes = raw.mediaTypes || [];

      // Parse created date
      const createdAt = raw.createdAt ? new Date(raw.createdAt) : new Date();

      const normalized: NormalizedContent = {
        id: raw.id,
        platformId: this.platformId,
        url: raw.url,

        // Author
        authorId,
        authorUsername,
        authorDisplayName,
        authorFollowers,
        authorIsVerified,

        // Content
        text: raw.text,
        hasMedia,
        mediaUrls,
        mediaTypes: mediaUrls.length > 0 ? mediaTypes : undefined,

        // Metrics
        likes,
        comments,
        shares,
        views,

        // Metadata
        createdAt,
        hashtags: hashtags.length > 0 ? hashtags : undefined,
        mentions: mentions.length > 0 ? mentions : undefined,

        // Classification
        isReply,
        isRepost,
        isQuote,

        // Raw data (for platform-specific processing later)
        rawData: raw,
      };

      return normalized;
    } catch (error) {
      console.error('Failed to normalize tweet:', error);
      return null;
    }
  }

  /**
   * Normalize multiple pieces of content
   * Filters out any that fail normalization
   */
  normalizeMany(rawList: RawContent[]): NormalizedContent[] {
    return rawList
      .map((raw) => this.normalize(raw))
      .filter((normalized): normalized is NormalizedContent => normalized !== null);
  }

  /**
   * Extract hashtags from tweet text
   */
  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex) || [];
    return matches.map((tag) => tag.substring(1)); // Remove # prefix
  }

  /**
   * Extract mentions from tweet text
   */
  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex) || [];
    return matches.map((mention) => mention.substring(1)); // Remove @ prefix
  }

  /**
   * Detect if tweet is a reply
   */
  private isReplyTweet(raw: RawContent): boolean {
    // Check if raw data indicates reply
    if (raw.isReply !== undefined) {
      return raw.isReply;
    }

    // Fallback: check if text starts with @mention
    return raw.text?.trim().startsWith('@') || false;
  }

  /**
   * Detect if tweet is a retweet
   */
  private isRetweet(raw: RawContent): boolean {
    // Check if raw data indicates retweet
    if (raw.isRetweet !== undefined) {
      return raw.isRetweet;
    }

    // Fallback: check if text starts with "RT @"
    return raw.text?.trim().startsWith('RT @') || false;
  }

  /**
   * Detect if tweet is a quote tweet
   */
  private isQuoteTweet(raw: RawContent): boolean {
    // Check if raw data indicates quote
    if (raw.isQuote !== undefined) {
      return raw.isQuote;
    }

    // Quote tweets usually have embedded tweets (would need DOM info)
    return false;
  }
}
