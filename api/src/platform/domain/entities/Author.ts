/**
 * Author entity - represents content creator
 * Contains author information and business logic
 */
export class Author {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly handle: string,
    public readonly profileUrl?: string,
    public readonly avatarUrl?: string,
    public readonly verified?: boolean,
    public readonly followerCount?: number,
    public readonly description?: string
  ) {
    this.validate();
  }

  /**
   * Validate author data
   */
  private validate(): void {
    if (!this.id || this.id.trim() === '') {
      throw new Error('Author ID is required');
    }
    if (!this.name || this.name.trim() === '') {
      throw new Error('Author name is required');
    }
    if (!this.handle || this.handle.trim() === '') {
      throw new Error('Author handle is required');
    }
    if (this.followerCount !== undefined && this.followerCount < 0) {
      throw new Error('Follower count cannot be negative');
    }
  }

  /**
   * Check if author is verified
   */
  isVerified(): boolean {
    return this.verified === true;
  }

  /**
   * Check if author has large following
   */
  hasLargeFollowing(threshold: number = 10000): boolean {
    return (this.followerCount || 0) >= threshold;
  }

  /**
   * Check if author is influential (verified OR large following)
   */
  isInfluential(followerThreshold: number = 50000): boolean {
    return this.isVerified() || this.hasLargeFollowing(followerThreshold);
  }

  /**
   * Get formatted handle (with @ prefix if missing)
   */
  getFormattedHandle(): string {
    return this.handle.startsWith('@') ? this.handle : `@${this.handle}`;
  }

  /**
   * Create Author from plain object
   */
  static fromPlain(data: AuthorPlainObject): Author {
    return new Author(
      data.id,
      data.name,
      data.handle,
      data.profileUrl,
      data.avatarUrl,
      data.verified,
      data.followerCount,
      data.description
    );
  }

  /**
   * Convert to plain object for serialization
   */
  toPlain(): AuthorPlainObject {
    return {
      id: this.id,
      name: this.name,
      handle: this.handle,
      profileUrl: this.profileUrl,
      avatarUrl: this.avatarUrl,
      verified: this.verified,
      followerCount: this.followerCount,
      description: this.description,
    };
  }

  /**
   * Check equality with another Author
   */
  equals(other: Author): boolean {
    return this.id === other.id;
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    return `Author(id=${this.id}, handle=${this.getFormattedHandle()}, verified=${this.isVerified()}, followers=${this.followerCount || 0})`;
  }
}

/**
 * Plain object representation for serialization
 */
export interface AuthorPlainObject {
  id: string;
  name: string;
  handle: string;
  profileUrl?: string;
  avatarUrl?: string;
  verified?: boolean;
  followerCount?: number;
  description?: string;
}
