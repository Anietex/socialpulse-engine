import { PlatformId, Platform } from '../../value-objects/PlatformId';

describe('PlatformId', () => {
  describe('factory methods', () => {
    it('should create Twitter platform ID', () => {
      const platformId = PlatformId.twitter();
      expect(platformId.toString()).toBe('twitter');
      expect(platformId.toEnum()).toBe(Platform.TWITTER);
    });

    it('should create LinkedIn platform ID', () => {
      const platformId = PlatformId.linkedin();
      expect(platformId.toString()).toBe('linkedin');
      expect(platformId.toEnum()).toBe(Platform.LINKEDIN);
    });

    it('should create Reddit platform ID', () => {
      const platformId = PlatformId.reddit();
      expect(platformId.toString()).toBe('reddit');
      expect(platformId.toEnum()).toBe(Platform.REDDIT);
    });

    it('should create Instagram platform ID', () => {
      const platformId = PlatformId.instagram();
      expect(platformId.toString()).toBe('instagram');
      expect(platformId.toEnum()).toBe(Platform.INSTAGRAM);
    });
  });

  describe('fromString', () => {
    it('should create platform ID from valid string', () => {
      const platformId = PlatformId.fromString('twitter');
      expect(platformId.toString()).toBe('twitter');
    });

    it('should handle uppercase input', () => {
      const platformId = PlatformId.fromString('TWITTER');
      expect(platformId.toString()).toBe('twitter');
    });

    it('should throw error for unsupported platform', () => {
      expect(() => PlatformId.fromString('facebook')).toThrow(/Unsupported platform: facebook/);
    });

    it('should throw error for empty string', () => {
      expect(() => PlatformId.fromString('')).toThrow();
    });
  });

  describe('equals', () => {
    it('should return true for same platform', () => {
      const platform1 = PlatformId.twitter();
      const platform2 = PlatformId.twitter();
      expect(platform1.equals(platform2)).toBe(true);
    });

    it('should return false for different platforms', () => {
      const platform1 = PlatformId.twitter();
      const platform2 = PlatformId.linkedin();
      expect(platform1.equals(platform2)).toBe(false);
    });
  });

  describe('platform checks', () => {
    it('should correctly identify Twitter', () => {
      const platformId = PlatformId.twitter();
      expect(platformId.isTwitter()).toBe(true);
      expect(platformId.isLinkedIn()).toBe(false);
      expect(platformId.isReddit()).toBe(false);
      expect(platformId.isInstagram()).toBe(false);
    });

    it('should correctly identify LinkedIn', () => {
      const platformId = PlatformId.linkedin();
      expect(platformId.isLinkedIn()).toBe(true);
      expect(platformId.isTwitter()).toBe(false);
    });

    it('should correctly identify Reddit', () => {
      const platformId = PlatformId.reddit();
      expect(platformId.isReddit()).toBe(true);
      expect(platformId.isTwitter()).toBe(false);
    });

    it('should correctly identify Instagram', () => {
      const platformId = PlatformId.instagram();
      expect(platformId.isInstagram()).toBe(true);
      expect(platformId.isTwitter()).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should convert to string correctly', () => {
      const platformId = PlatformId.twitter();
      expect(platformId.toString()).toBe('twitter');
    });

    it('should convert to enum correctly', () => {
      const platformId = PlatformId.linkedin();
      expect(platformId.toEnum()).toBe(Platform.LINKEDIN);
    });
  });
});
