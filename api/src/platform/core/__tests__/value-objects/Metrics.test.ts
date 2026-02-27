import { Metrics } from '../../value-objects/Metrics';

describe('Metrics', () => {
  describe('create', () => {
    it('should create metrics with valid values', () => {
      const metrics = Metrics.create(10, 5, 2, 100);

      expect(metrics.getLikes()).toBe(10);
      expect(metrics.getComments()).toBe(5);
      expect(metrics.getShares()).toBe(2);
      expect(metrics.getViews()).toBe(100);
    });

    it('should create metrics without views (defaults to 0)', () => {
      const metrics = Metrics.create(10, 5, 2);

      expect(metrics.getViews()).toBe(0);
    });

    it('should throw error for negative likes', () => {
      expect(() => Metrics.create(-1, 5, 2, 100)).toThrow('Metrics cannot be negative');
    });

    it('should throw error for negative comments', () => {
      expect(() => Metrics.create(10, -1, 2, 100)).toThrow('Metrics cannot be negative');
    });

    it('should throw error for negative shares', () => {
      expect(() => Metrics.create(10, 5, -1, 100)).toThrow('Metrics cannot be negative');
    });

    it('should throw error for negative views', () => {
      expect(() => Metrics.create(10, 5, 2, -1)).toThrow('Metrics cannot be negative');
    });

    it('should allow zero metrics', () => {
      const metrics = Metrics.create(0, 0, 0, 0);

      expect(metrics.getTotalEngagement()).toBe(0);
    });
  });

  describe('zero', () => {
    it('should create zero metrics', () => {
      const metrics = Metrics.zero();

      expect(metrics.getLikes()).toBe(0);
      expect(metrics.getComments()).toBe(0);
      expect(metrics.getShares()).toBe(0);
      expect(metrics.getViews()).toBe(0);
    });
  });

  describe('fromObject', () => {
    it('should create metrics from object with all fields', () => {
      const obj = { likes: 10, comments: 5, shares: 2, views: 100 };
      const metrics = Metrics.fromObject(obj);

      expect(metrics.getLikes()).toBe(10);
      expect(metrics.getComments()).toBe(5);
      expect(metrics.getShares()).toBe(2);
      expect(metrics.getViews()).toBe(100);
    });

    it('should default views to 0 if not provided', () => {
      const obj = { likes: 10, comments: 5, shares: 2 };
      const metrics = Metrics.fromObject(obj);

      expect(metrics.getViews()).toBe(0);
    });
  });

  describe('getTotalEngagement', () => {
    it('should calculate total engagement correctly', () => {
      const metrics = Metrics.create(10, 5, 2, 100);

      expect(metrics.getTotalEngagement()).toBe(17); // 10 + 5 + 2
    });

    it('should return 0 for zero metrics', () => {
      const metrics = Metrics.zero();

      expect(metrics.getTotalEngagement()).toBe(0);
    });
  });

  describe('getEngagementRate', () => {
    it('should calculate engagement rate correctly', () => {
      const metrics = Metrics.create(10, 5, 5, 100);

      expect(metrics.getEngagementRate()).toBe(0.2); // 20 / 100
    });

    it('should return 0 when views is 0', () => {
      const metrics = Metrics.create(10, 5, 2, 0);

      expect(metrics.getEngagementRate()).toBe(0);
    });

    it('should handle high engagement rate', () => {
      const metrics = Metrics.create(50, 30, 20, 100);

      expect(metrics.getEngagementRate()).toBe(1.0); // 100%
    });
  });

  describe('getWeightedScore', () => {
    it('should calculate weighted score correctly', () => {
      // Weights: likes=1, comments=2, shares=3
      const metrics = Metrics.create(10, 5, 2, 100);

      expect(metrics.getWeightedScore()).toBe(26); // (10*1) + (5*2) + (2*3) = 10 + 10 + 6 = 26
    });

    it('should return 0 for zero metrics', () => {
      const metrics = Metrics.zero();

      expect(metrics.getWeightedScore()).toBe(0);
    });

    it('should prioritize shares over comments and likes', () => {
      const metrics1 = Metrics.create(10, 0, 0); // 10 likes = 10 * 1 = 10
      const metrics2 = Metrics.create(0, 6, 0); // 6 comments = 6 * 2 = 12
      const metrics3 = Metrics.create(0, 0, 5); // 5 shares = 5 * 3 = 15

      expect(metrics3.getWeightedScore()).toBeGreaterThan(metrics2.getWeightedScore());
      expect(metrics2.getWeightedScore()).toBeGreaterThan(metrics1.getWeightedScore());
    });
  });

  describe('hasEngagement', () => {
    it('should return true when there is engagement', () => {
      const metrics = Metrics.create(1, 0, 0, 100);

      expect(metrics.hasEngagement()).toBe(true);
    });

    it('should return false for zero engagement', () => {
      const metrics = Metrics.zero();

      expect(metrics.hasEngagement()).toBe(false);
    });

    it('should return false when only views exist', () => {
      const metrics = Metrics.create(0, 0, 0, 100);

      expect(metrics.hasEngagement()).toBe(false);
    });
  });

  describe('isInGrowthSweetSpot', () => {
    it('should return true for likes within default range (5-100)', () => {
      const metrics = Metrics.create(50, 10, 5, 500);

      expect(metrics.isInGrowthSweetSpot()).toBe(true);
    });

    it('should return false for likes below minimum', () => {
      const metrics = Metrics.create(3, 1, 0, 50);

      expect(metrics.isInGrowthSweetSpot()).toBe(false);
    });

    it('should return false for likes above maximum', () => {
      const metrics = Metrics.create(150, 30, 20, 1000);

      expect(metrics.isInGrowthSweetSpot()).toBe(false);
    });

    it('should include boundary values', () => {
      const metrics1 = Metrics.create(5, 1, 0, 50);
      const metrics2 = Metrics.create(100, 20, 10, 1000);

      expect(metrics1.isInGrowthSweetSpot()).toBe(true);
      expect(metrics2.isInGrowthSweetSpot()).toBe(true);
    });

    it('should support custom thresholds', () => {
      const metrics = Metrics.create(15, 3, 1, 100);

      expect(metrics.isInGrowthSweetSpot(10, 20)).toBe(true);
      expect(metrics.isInGrowthSweetSpot(20, 50)).toBe(false);
    });
  });

  describe('isViral', () => {
    it('should return true for high engagement rate', () => {
      const metrics = Metrics.create(50, 30, 20, 100); // 100% engagement

      expect(metrics.isViral()).toBe(true);
    });

    it('should return false for low engagement rate', () => {
      const metrics = Metrics.create(5, 3, 2, 1000); // 1% engagement

      expect(metrics.isViral()).toBe(false);
    });

    it('should support custom threshold', () => {
      const metrics = Metrics.create(10, 5, 5, 100); // 20% engagement

      expect(metrics.isViral(0.1)).toBe(true); // 10% threshold
      expect(metrics.isViral(0.3)).toBe(false); // 30% threshold
    });
  });

  describe('compareTo', () => {
    it('should return positive for higher engagement', () => {
      const metrics1 = Metrics.create(20, 10, 5); // 35 total
      const metrics2 = Metrics.create(10, 5, 2); // 17 total

      expect(metrics1.compareTo(metrics2)).toBeGreaterThan(0);
    });

    it('should return negative for lower engagement', () => {
      const metrics1 = Metrics.create(10, 5, 2); // 17 total
      const metrics2 = Metrics.create(20, 10, 5); // 35 total

      expect(metrics1.compareTo(metrics2)).toBeLessThan(0);
    });

    it('should return zero for equal engagement', () => {
      const metrics1 = Metrics.create(10, 5, 2);
      const metrics2 = Metrics.create(10, 5, 2);

      expect(metrics1.compareTo(metrics2)).toBe(0);
    });
  });

  describe('hasMoreEngagementThan', () => {
    it('should return true when has more engagement', () => {
      const metrics1 = Metrics.create(20, 10, 5);
      const metrics2 = Metrics.create(10, 5, 2);

      expect(metrics1.hasMoreEngagementThan(metrics2)).toBe(true);
    });

    it('should return false when has less engagement', () => {
      const metrics1 = Metrics.create(10, 5, 2);
      const metrics2 = Metrics.create(20, 10, 5);

      expect(metrics1.hasMoreEngagementThan(metrics2)).toBe(false);
    });

    it('should return false when equal', () => {
      const metrics1 = Metrics.create(10, 5, 2);
      const metrics2 = Metrics.create(10, 5, 2);

      expect(metrics1.hasMoreEngagementThan(metrics2)).toBe(false);
    });
  });

  describe('toObject', () => {
    it('should convert to plain object', () => {
      const metrics = Metrics.create(10, 5, 2, 100);

      expect(metrics.toObject()).toEqual({
        likes: 10,
        comments: 5,
        shares: 2,
        views: 100,
      });
    });
  });

  describe('immutability (with* methods)', () => {
    it('should create new instance with updated likes', () => {
      const original = Metrics.create(10, 5, 2, 100);
      const updated = original.withUpdatedLikes(20);

      expect(updated.getLikes()).toBe(20);
      expect(original.getLikes()).toBe(10); // Original unchanged
    });

    it('should create new instance with updated comments', () => {
      const original = Metrics.create(10, 5, 2, 100);
      const updated = original.withUpdatedComments(10);

      expect(updated.getComments()).toBe(10);
      expect(original.getComments()).toBe(5);
    });

    it('should create new instance with updated shares', () => {
      const original = Metrics.create(10, 5, 2, 100);
      const updated = original.withUpdatedShares(5);

      expect(updated.getShares()).toBe(5);
      expect(original.getShares()).toBe(2);
    });

    it('should create new instance with updated views', () => {
      const original = Metrics.create(10, 5, 2, 100);
      const updated = original.withUpdatedViews(200);

      expect(updated.getViews()).toBe(200);
      expect(original.getViews()).toBe(100);
    });
  });

  describe('toString', () => {
    it('should provide readable string representation', () => {
      const metrics = Metrics.create(10, 5, 2, 100);
      const str = metrics.toString();

      expect(str).toContain('likes=10');
      expect(str).toContain('comments=5');
      expect(str).toContain('shares=2');
      expect(str).toContain('views=100');
      expect(str).toContain('engagement=17');
    });
  });
});
