import { PlatformId } from './PlatformId';

/**
 * Type-safe content identifier value object
 * Combines platform ID with content ID for uniqueness across platforms
 *
 * Benefits:
 * - Prevents mixing content IDs from different platforms
 * - Ensures content ID always has platform context
 * - Type-safe operations
 * - Easy serialization/deserialization
 */
export class ContentId {
  private constructor(
    private readonly platformId: PlatformId,
    private readonly contentId: string
  ) {
    if (!contentId || contentId.trim().length === 0) {
      throw new Error('Content ID cannot be empty');
    }
  }

  /**
   * Create a ContentId from platform and content ID
   * @param platformId Platform the content belongs to
   * @param contentId Platform-specific content identifier
   */
  static create(platformId: PlatformId, contentId: string): ContentId {
    return new ContentId(platformId, contentId);
  }

  /**
   * Create from a composite string format: "platform:contentId"
   * @param composite String in format "twitter:123456789"
   * @example ContentId.fromString("twitter:123456789")
   */
  static fromString(composite: string): ContentId {
    const parts = composite.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid ContentId format: ${composite}. Expected "platform:contentId"`);
    }

    const [platform, contentId] = parts;
    const platformId = PlatformId.fromString(platform);
    return new ContentId(platformId, contentId);
  }

  /**
   * Get the platform this content belongs to
   */
  getPlatformId(): PlatformId {
    return this.platformId;
  }

  /**
   * Get the platform-specific content ID
   */
  getContentId(): string {
    return this.contentId;
  }

  /**
   * Convert to composite string format: "platform:contentId"
   * Useful for storage and serialization
   */
  toString(): string {
    return `${this.platformId.toString()}:${this.contentId}`;
  }

  /**
   * Convert to object for database storage
   */
  toObject(): { platform: string; contentId: string } {
    return {
      platform: this.platformId.toString(),
      contentId: this.contentId,
    };
  }

  /**
   * Check equality with another ContentId
   */
  equals(other: ContentId): boolean {
    return this.platformId.equals(other.platformId) && this.contentId === other.contentId;
  }

  /**
   * Check if content is from a specific platform
   */
  isFromPlatform(platformId: PlatformId): boolean {
    return this.platformId.equals(platformId);
  }
}
