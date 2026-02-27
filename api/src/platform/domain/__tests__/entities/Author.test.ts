import { Author, AuthorPlainObject } from '../../entities/Author';

describe('Author', () => {
  const validAuthorData = {
    id: 'author123',
    name: 'John Doe',
    handle: 'johndoe',
    profileUrl: 'https://twitter.com/johndoe',
    avatarUrl: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
    verified: true,
    followerCount: 15000,
    description: 'Software Engineer',
  };

  describe('construction', () => {
    it('should create author with all fields', () => {
      const author = new Author(
        validAuthorData.id,
        validAuthorData.name,
        validAuthorData.handle,
        validAuthorData.profileUrl,
        validAuthorData.avatarUrl,
        validAuthorData.verified,
        validAuthorData.followerCount,
        validAuthorData.description
      );

      expect(author.id).toBe(validAuthorData.id);
      expect(author.name).toBe(validAuthorData.name);
      expect(author.handle).toBe(validAuthorData.handle);
      expect(author.verified).toBe(true);
      expect(author.followerCount).toBe(15000);
    });

    it('should create author with only required fields', () => {
      const author = new Author('id1', 'Jane Doe', 'janedoe');

      expect(author.id).toBe('id1');
      expect(author.name).toBe('Jane Doe');
      expect(author.handle).toBe('janedoe');
      expect(author.verified).toBeUndefined();
      expect(author.followerCount).toBeUndefined();
    });

    it('should throw error for empty ID', () => {
      expect(() => new Author('', 'John', 'john')).toThrow('Author ID is required');
    });

    it('should throw error for whitespace-only ID', () => {
      expect(() => new Author('   ', 'John', 'john')).toThrow('Author ID is required');
    });

    it('should throw error for empty name', () => {
      expect(() => new Author('id1', '', 'john')).toThrow('Author name is required');
    });

    it('should throw error for empty handle', () => {
      expect(() => new Author('id1', 'John', '')).toThrow('Author handle is required');
    });

    it('should throw error for negative follower count', () => {
      expect(() => new Author('id1', 'John', 'john', undefined, undefined, false, -1)).toThrow(
        'Follower count cannot be negative'
      );
    });

    it('should allow zero follower count', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 0);
      expect(author.followerCount).toBe(0);
    });
  });

  describe('isVerified', () => {
    it('should return true for verified author', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, true);
      expect(author.isVerified()).toBe(true);
    });

    it('should return false for unverified author', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false);
      expect(author.isVerified()).toBe(false);
    });

    it('should return false when verified is undefined', () => {
      const author = new Author('id1', 'John', 'john');
      expect(author.isVerified()).toBe(false);
    });
  });

  describe('hasLargeFollowing', () => {
    it('should return true for followers above default threshold (10k)', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 15000);
      expect(author.hasLargeFollowing()).toBe(true);
    });

    it('should return false for followers below default threshold', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 5000);
      expect(author.hasLargeFollowing()).toBe(false);
    });

    it('should return true at exact threshold', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 10000);
      expect(author.hasLargeFollowing()).toBe(true);
    });

    it('should support custom threshold', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 5000);
      expect(author.hasLargeFollowing(5000)).toBe(true);
      expect(author.hasLargeFollowing(6000)).toBe(false);
    });

    it('should return false when follower count is undefined', () => {
      const author = new Author('id1', 'John', 'john');
      expect(author.hasLargeFollowing()).toBe(false);
    });

    it('should return false when follower count is 0', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 0);
      expect(author.hasLargeFollowing()).toBe(false);
    });
  });

  describe('isInfluential', () => {
    it('should return true for verified author', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, true, 1000);
      expect(author.isInfluential()).toBe(true);
    });

    it('should return true for large following', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 60000);
      expect(author.isInfluential()).toBe(true);
    });

    it('should return true for verified with large following', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, true, 60000);
      expect(author.isInfluential()).toBe(true);
    });

    it('should return false for unverified with small following', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 1000);
      expect(author.isInfluential()).toBe(false);
    });

    it('should support custom follower threshold', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, false, 30000);
      expect(author.isInfluential(20000)).toBe(true);
      expect(author.isInfluential(40000)).toBe(false);
    });
  });

  describe('getFormattedHandle', () => {
    it('should add @ prefix if missing', () => {
      const author = new Author('id1', 'John', 'johndoe');
      expect(author.getFormattedHandle()).toBe('@johndoe');
    });

    it('should not add @ prefix if already present', () => {
      const author = new Author('id1', 'John', '@johndoe');
      expect(author.getFormattedHandle()).toBe('@johndoe');
    });
  });

  describe('fromPlain', () => {
    it('should create author from plain object', () => {
      const author = Author.fromPlain(validAuthorData);

      expect(author.id).toBe(validAuthorData.id);
      expect(author.name).toBe(validAuthorData.name);
      expect(author.handle).toBe(validAuthorData.handle);
      expect(author.verified).toBe(validAuthorData.verified);
      expect(author.followerCount).toBe(validAuthorData.followerCount);
    });

    it('should handle minimal plain object', () => {
      const data: AuthorPlainObject = {
        id: 'id1',
        name: 'John',
        handle: 'john',
      };
      const author = Author.fromPlain(data);

      expect(author.id).toBe('id1');
      expect(author.name).toBe('John');
      expect(author.handle).toBe('john');
    });
  });

  describe('toPlain', () => {
    it('should convert to plain object', () => {
      const author = new Author(
        validAuthorData.id,
        validAuthorData.name,
        validAuthorData.handle,
        validAuthorData.profileUrl,
        validAuthorData.avatarUrl,
        validAuthorData.verified,
        validAuthorData.followerCount,
        validAuthorData.description
      );

      const plain = author.toPlain();

      expect(plain).toEqual(validAuthorData);
    });

    it('should be reversible with fromPlain', () => {
      const author = Author.fromPlain(validAuthorData);
      const plain = author.toPlain();
      const reconstructed = Author.fromPlain(plain);

      expect(reconstructed.toPlain()).toEqual(author.toPlain());
    });
  });

  describe('equals', () => {
    it('should return true for same ID', () => {
      const author1 = new Author('id1', 'John', 'john');
      const author2 = new Author('id1', 'Jane', 'jane'); // Different name/handle

      expect(author1.equals(author2)).toBe(true);
    });

    it('should return false for different IDs', () => {
      const author1 = new Author('id1', 'John', 'john');
      const author2 = new Author('id2', 'John', 'john'); // Same name/handle

      expect(author1.equals(author2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should provide readable string representation', () => {
      const author = new Author('id1', 'John', 'john', undefined, undefined, true, 15000);
      const str = author.toString();

      expect(str).toContain('id1');
      expect(str).toContain('@john');
      expect(str).toContain('verified=true');
      expect(str).toContain('followers=15000');
    });

    it('should handle undefined values', () => {
      const author = new Author('id1', 'John', 'john');
      const str = author.toString();

      expect(str).toContain('id1');
      expect(str).toContain('@john');
      expect(str).toContain('verified=false');
      expect(str).toContain('followers=0');
    });
  });
});
