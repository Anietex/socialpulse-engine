/**
 * Supported platforms enum
 * Add new platforms here as they're implemented
 */
export enum Platform {
  TWITTER = 'twitter',
  LINKEDIN = 'linkedin',
  REDDIT = 'reddit',
  INSTAGRAM = 'instagram',
}

/**
 * Type-safe platform identifier value object
 * Prevents using raw strings and provides validation
 *
 * Benefits:
 * - Compile-time type safety
 * - Runtime validation
 * - No magic strings
 * - Easy to extend
 */
export class PlatformId {
  private constructor(private readonly value: Platform) {}

  /**
   * Create a PlatformId from a string
   * @param value String representation of platform
   * @throws Error if platform is not supported
   */
  static fromString(value: string): PlatformId {
    const normalized = value.toLowerCase();
    if (!Object.values(Platform).includes(normalized as Platform)) {
      throw new Error(
        `Unsupported platform: ${value}. Supported platforms: ${Object.values(Platform).join(', ')}`
      );
    }
    return new PlatformId(normalized as Platform);
  }

  /**
   * Factory methods for each platform
   */
  static twitter(): PlatformId {
    return new PlatformId(Platform.TWITTER);
  }

  static linkedin(): PlatformId {
    return new PlatformId(Platform.LINKEDIN);
  }

  static reddit(): PlatformId {
    return new PlatformId(Platform.REDDIT);
  }

  static instagram(): PlatformId {
    return new PlatformId(Platform.INSTAGRAM);
  }

  /**
   * Get string representation
   */
  toString(): string {
    return this.value;
  }

  /**
   * Get enum value
   */
  toEnum(): Platform {
    return this.value;
  }

  /**
   * Check equality with another PlatformId
   */
  equals(other: PlatformId): boolean {
    return this.value === other.value;
  }

  /**
   * Check if this is a specific platform
   */
  isTwitter(): boolean {
    return this.value === Platform.TWITTER;
  }

  isLinkedIn(): boolean {
    return this.value === Platform.LINKEDIN;
  }

  isReddit(): boolean {
    return this.value === Platform.REDDIT;
  }

  isInstagram(): boolean {
    return this.value === Platform.INSTAGRAM;
  }
}
