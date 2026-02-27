import { ContentId } from '../../value-objects/ContentId';
import { PlatformId } from '../../value-objects/PlatformId';

describe('ContentId', () => {
  describe('create', () => {
    it('should create content ID with platform and content ID', () => {
      const platformId = PlatformId.twitter();
      const contentId = ContentId.create(platformId, '123456789');

      expect(contentId.getPlatformId()).toBe(platformId);
      expect(contentId.getContentId()).toBe('123456789');
    });

    it('should throw error for empty content ID', () => {
      const platformId = PlatformId.twitter();
      expect(() => ContentId.create(platformId, '')).toThrow('Content ID cannot be empty');
    });

    it('should throw error for whitespace-only content ID', () => {
      const platformId = PlatformId.twitter();
      expect(() => ContentId.create(platformId, '   ')).toThrow('Content ID cannot be empty');
    });
  });

  describe('fromString', () => {
    it('should parse valid composite string', () => {
      const contentId = ContentId.fromString('twitter:123456789');

      expect(contentId.getPlatformId().toString()).toBe('twitter');
      expect(contentId.getContentId()).toBe('123456789');
    });

    it('should parse content ID with special characters', () => {
      const contentId = ContentId.fromString('linkedin:abc-123_xyz');

      expect(contentId.getPlatformId().toString()).toBe('linkedin');
      expect(contentId.getContentId()).toBe('abc-123_xyz');
    });

    it('should throw error for invalid format (no colon)', () => {
      expect(() => ContentId.fromString('twitter123456789')).toThrow(/Invalid ContentId format/);
    });

    it('should throw error for invalid format (multiple colons)', () => {
      expect(() => ContentId.fromString('twitter:123:456')).toThrow(/Invalid ContentId format/);
    });

    it('should throw error for unsupported platform', () => {
      expect(() => ContentId.fromString('facebook:123')).toThrow(/Unsupported platform/);
    });
  });

  describe('toString', () => {
    it('should convert to composite string format', () => {
      const platformId = PlatformId.twitter();
      const contentId = ContentId.create(platformId, '123456789');

      expect(contentId.toString()).toBe('twitter:123456789');
    });

    it('should be reversible with fromString', () => {
      const original = ContentId.fromString('reddit:post_abc123');
      const reconstructed = ContentId.fromString(original.toString());

      expect(reconstructed.toString()).toBe(original.toString());
    });
  });

  describe('toObject', () => {
    it('should convert to object for storage', () => {
      const platformId = PlatformId.twitter();
      const contentId = ContentId.create(platformId, '123456789');

      const obj = contentId.toObject();

      expect(obj).toEqual({
        platform: 'twitter',
        contentId: '123456789',
      });
    });
  });

  describe('equals', () => {
    it('should return true for same platform and content ID', () => {
      const contentId1 = ContentId.fromString('twitter:123');
      const contentId2 = ContentId.fromString('twitter:123');

      expect(contentId1.equals(contentId2)).toBe(true);
    });

    it('should return false for different platforms', () => {
      const contentId1 = ContentId.fromString('twitter:123');
      const contentId2 = ContentId.fromString('linkedin:123');

      expect(contentId1.equals(contentId2)).toBe(false);
    });

    it('should return false for different content IDs', () => {
      const contentId1 = ContentId.fromString('twitter:123');
      const contentId2 = ContentId.fromString('twitter:456');

      expect(contentId1.equals(contentId2)).toBe(false);
    });
  });

  describe('isFromPlatform', () => {
    it('should return true if content is from specified platform', () => {
      const contentId = ContentId.fromString('twitter:123');
      const platformId = PlatformId.twitter();

      expect(contentId.isFromPlatform(platformId)).toBe(true);
    });

    it('should return false if content is from different platform', () => {
      const contentId = ContentId.fromString('twitter:123');
      const platformId = PlatformId.linkedin();

      expect(contentId.isFromPlatform(platformId)).toBe(false);
    });
  });

  describe('getters', () => {
    it('should get platform ID', () => {
      const contentId = ContentId.fromString('instagram:abc123');
      const platformId = contentId.getPlatformId();

      expect(platformId.toString()).toBe('instagram');
    });

    it('should get content ID', () => {
      const contentId = ContentId.fromString('reddit:post_xyz');

      expect(contentId.getContentId()).toBe('post_xyz');
    });
  });
});
