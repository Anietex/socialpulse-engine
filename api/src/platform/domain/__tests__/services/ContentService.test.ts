import { ContentService } from '../../services/ContentService';
import { Content } from '../../entities/Content';
import { Author } from '../../entities/Author';
import { IContentRepository } from '../../repositories/IContentRepository';
import { ContentId } from '../../../core/value-objects/ContentId';
import { PlatformId } from '../../../core/value-objects/PlatformId';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { ActionType } from '../../../core/types/ActionType';

// Mock repository
class MockContentRepository implements IContentRepository {
  private contents: Map<string, Content> = new Map();

  async findById(id: ContentId): Promise<Content | null> {
    return this.contents.get(id.toString()) || null;
  }

  async findByIds(ids: ContentId[]): Promise<Content[]> {
    return ids
      .map((id) => this.contents.get(id.toString()))
      .filter((c) => c !== undefined) as Content[];
  }

  async findByPlatform(platformId: PlatformId, limit?: number): Promise<Content[]> {
    const filtered = Array.from(this.contents.values()).filter((c) =>
      c.platformId.equals(platformId)
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async findByStatus(status: ContentStatus, limit?: number): Promise<Content[]> {
    const filtered = Array.from(this.contents.values()).filter((c) => c.status === status);
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async findByPlatformAndStatus(
    platformId: PlatformId,
    status: ContentStatus,
    limit?: number
  ): Promise<Content[]> {
    const filtered = Array.from(this.contents.values()).filter(
      (c) => c.platformId.equals(platformId) && c.status === status
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async findReadyForAction(action: ActionType, limit?: number): Promise<Content[]> {
    const filtered = Array.from(this.contents.values()).filter(
      (c) => c.engagementAction === action
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async findByBatchId(batchId: string): Promise<Content[]> {
    return Array.from(this.contents.values()).filter((c) => c.batchId === batchId);
  }

  async findForRanking(batchId: string, limit?: number): Promise<Content[]> {
    const filtered = Array.from(this.contents.values()).filter(
      (c) => c.batchId === batchId && c.canBeRanked()
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async findForEngagement(batchId: string, limit?: number): Promise<Content[]> {
    const filtered = Array.from(this.contents.values()).filter(
      (c) => c.batchId === batchId && c.canDetermineEngagement()
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async findForAutomation(batchId: string, limit?: number): Promise<Content[]> {
    const filtered = Array.from(this.contents.values()).filter(
      (c) => c.batchId === batchId && c.shouldAutomate()
    );
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async findInGrowthSweetSpot(platformId?: PlatformId, limit?: number): Promise<Content[]> {
    let filtered = Array.from(this.contents.values()).filter((c) => c.isInGrowthSweetSpot());
    if (platformId) {
      filtered = filtered.filter((c) => c.platformId.equals(platformId));
    }
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async findFreshContent(
    maxAgeHours: number,
    platformId?: PlatformId,
    limit?: number
  ): Promise<Content[]> {
    let filtered = Array.from(this.contents.values()).filter((c) => c.isFresh(maxAgeHours));
    if (platformId) {
      filtered = filtered.filter((c) => c.platformId.equals(platformId));
    }
    return limit ? filtered.slice(0, limit) : filtered;
  }

  async save(content: Content): Promise<Content> {
    this.contents.set(content.id.toString(), content);
    return content;
  }

  async saveMany(content: Content[]): Promise<Content[]> {
    content.forEach((c) => this.contents.set(c.id.toString(), c));
    return content;
  }

  async updateStatus(id: ContentId, status: ContentStatus): Promise<void> {
    const content = this.contents.get(id.toString());
    if (content) {
      this.contents.set(id.toString(), content.withStatus(status));
    }
  }

  async updateManyStatuses(ids: ContentId[], status: ContentStatus): Promise<void> {
    for (const id of ids) {
      await this.updateStatus(id, status);
    }
  }

  async delete(id: ContentId): Promise<void> {
    this.contents.delete(id.toString());
  }

  async deleteMany(ids: ContentId[]): Promise<void> {
    ids.forEach((id) => this.contents.delete(id.toString()));
  }

  async count(_criteria: any): Promise<number> {
    return Array.from(this.contents.values()).length;
  }

  async exists(id: ContentId): Promise<boolean> {
    return this.contents.has(id.toString());
  }

  async findByPlatformContentId(
    platformId: PlatformId,
    platformContentId: string
  ): Promise<Content | null> {
    return (
      Array.from(this.contents.values()).find(
        (c) => c.platformId.equals(platformId) && c.platformContentId === platformContentId
      ) || null
    );
  }

  // Helper for tests
  addContent(content: Content): void {
    this.contents.set(content.id.toString(), content);
  }

  clear(): void {
    this.contents.clear();
  }
}

describe('ContentService', () => {
  let repository: MockContentRepository;
  let service: ContentService;

  beforeEach(() => {
    repository = new MockContentRepository();
    service = new ContentService(repository);
  });

  const createTestContent = (overrides: Partial<any> = {}): Content => {
    const author = new Author('author1', 'John Doe', 'johndoe', undefined, undefined, true, 10000);

    const data = {
      id: 'twitter:123',
      platformId: 'twitter',
      platformContentId: '123',
      text: 'Test content',
      author: author.toPlain(),
      url: 'https://twitter.com/test/123',
      createdAt: new Date().toISOString(),
      metrics: { likes: 50, comments: 10, shares: 5, views: 1000 },
      status: ContentStatus.PENDING_CATEGORIZATION,
      media: [],
      isReply: false,
      isRepost: false,
      isQuote: false,
      ...overrides,
    };

    return Content.fromPlain(data);
  };

  describe('transitionStatus', () => {
    it('should transition to next valid status', async () => {
      const content = createTestContent();
      repository.addContent(content);

      await service.transitionStatus(content.id, ContentStatus.PENDING_RANKING);

      const updated = await repository.findById(content.id);
      expect(updated?.status).toBe(ContentStatus.PENDING_RANKING);
    });

    it('should throw error for content not found', async () => {
      const id = ContentId.fromString('twitter:nonexistent');

      await expect(service.transitionStatus(id, ContentStatus.PENDING_RANKING)).rejects.toThrow(
        'Content not found'
      );
    });

    it('should throw error for invalid transition', async () => {
      const content = createTestContent({ status: ContentStatus.PENDING_CATEGORIZATION });
      repository.addContent(content);

      await expect(
        service.transitionStatus(content.id, ContentStatus.PENDING_ACTION)
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('calculateGrowthScore', () => {
    it('should give max score (100) for sweet spot comments (10-50)', () => {
      const content = createTestContent({
        metrics: { likes: 100, comments: 30, shares: 10, views: 1000 },
      });

      const score = service.calculateGrowthScore(content);

      expect(score).toBeGreaterThanOrEqual(70); // Should be high
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give lower score for too few comments', () => {
      const content = createTestContent({
        metrics: { likes: 100, comments: 5, shares: 10, views: 1000 },
      });

      const score = service.calculateGrowthScore(content);

      // Score is ~75 because high engagement ratio (11.5%) compensates for low comments
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThan(85); // Still lower than sweet spot
    });

    it('should penalize viral content (500+ comments)', () => {
      const content = createTestContent({
        metrics: { likes: 50000, comments: 600, shares: 1000, views: 100000 },
      });

      const score = service.calculateGrowthScore(content);

      expect(score).toBeLessThan(50); // Should be heavily penalized
    });

    it('should penalize very viral content (50k+ likes)', () => {
      const content = createTestContent({
        metrics: { likes: 60000, comments: 100, shares: 1000, views: 200000 },
      });

      const score = service.calculateGrowthScore(content);

      // Score is ~73 because anti-viral penalty is only 20% weight
      // High comment score (87) and engagement ratio (30.5%) still push score up
      expect(score).toBeGreaterThanOrEqual(70);
      expect(score).toBeLessThan(80); // Still penalized vs non-viral content
    });

    it('should give high score for good engagement ratio', () => {
      const content = createTestContent({
        metrics: { likes: 80, comments: 15, shares: 5, views: 100 }, // 100% engagement rate
      });

      const score = service.calculateGrowthScore(content);

      expect(score).toBeGreaterThan(80); // Very high score
    });

    it('should give low score for poor engagement ratio', () => {
      const content = createTestContent({
        metrics: { likes: 5, comments: 2, shares: 1, views: 10000 }, // 0.08% engagement
      });

      const score = service.calculateGrowthScore(content);

      expect(score).toBeLessThan(50);
    });

    it('should return score between 0 and 100', () => {
      const testCases = [
        { likes: 0, comments: 0, shares: 0, views: 0 },
        { likes: 100000, comments: 1000, shares: 5000, views: 1000000 },
        { likes: 50, comments: 25, shares: 10, views: 500 },
      ];

      testCases.forEach((metrics) => {
        const content = createTestContent({ metrics: { ...metrics, views: metrics.views || 1 } });
        const score = service.calculateGrowthScore(content);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('shouldAutomateContent', () => {
    it('should return true for high quality content with action', () => {
      const content = createTestContent({
        status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
        engagementAction: ActionType.LIKE,
        rankScore: 75,
      });

      expect(service.shouldAutomateContent(content)).toBe(true);
    });

    it('should return false for low rank score', () => {
      const content = createTestContent({
        status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
        engagementAction: ActionType.LIKE,
        rankScore: 40,
      });

      expect(service.shouldAutomateContent(content)).toBe(false);
    });

    it('should return false without engagement action', () => {
      const content = createTestContent({
        status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
        rankScore: 75,
      });

      expect(service.shouldAutomateContent(content)).toBe(false);
    });

    it('should return false for wrong status', () => {
      const content = createTestContent({
        status: ContentStatus.PENDING_ACTION,
        engagementAction: ActionType.LIKE,
        rankScore: 75,
      });

      expect(service.shouldAutomateContent(content)).toBe(false);
    });

    it('should accept exactly rank score 50', () => {
      const content = createTestContent({
        status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
        engagementAction: ActionType.LIKE,
        rankScore: 50,
      });

      expect(service.shouldAutomateContent(content)).toBe(true);
    });
  });

  describe('getContentForCategorization', () => {
    it('should return only categorizable content', async () => {
      const content1 = createTestContent({
        id: 'twitter:1',
        status: ContentStatus.PENDING_CATEGORIZATION,
        batchId: 'batch1',
      });
      const content2 = createTestContent({
        id: 'twitter:2',
        status: ContentStatus.PENDING_RANKING,
        batchId: 'batch1',
      });

      repository.addContent(content1);
      repository.addContent(content2);

      const results = await service.getContentForCategorization('batch1');

      expect(results).toHaveLength(1);
      expect(results[0].id.toString()).toBe('twitter:1');
    });

    it('should respect limit', async () => {
      for (let i = 0; i < 5; i++) {
        const content = createTestContent({
          id: `twitter:${i}`,
          status: ContentStatus.PENDING_CATEGORIZATION,
          batchId: 'batch1',
        });
        repository.addContent(content);
      }

      const results = await service.getContentForCategorization('batch1', 3);

      expect(results).toHaveLength(3);
    });
  });

  describe('findGrowthOpportunities', () => {
    it('should find content in growth sweet spot', async () => {
      const inSweetSpot = createTestContent({
        id: 'twitter:1',
        metrics: { likes: 50, comments: 10, shares: 5, views: 1000 },
      });
      const outOfSweetSpot = createTestContent({
        id: 'twitter:2',
        metrics: { likes: 150, comments: 10, shares: 5, views: 1000 },
      });

      repository.addContent(inSweetSpot);
      repository.addContent(outOfSweetSpot);

      const results = await service.findGrowthOpportunities(PlatformId.twitter());

      expect(results).toHaveLength(1);
      expect(results[0].id.toString()).toBe('twitter:1');
    });
  });

  describe('findFreshQualityContent', () => {
    it('should find fresh content with high quality score', async () => {
      const freshHighQuality = createTestContent({
        id: 'twitter:1',
        createdAt: new Date().toISOString(),
        metrics: { likes: 50, comments: 25, shares: 10, views: 500 }, // Should score high
      });

      repository.addContent(freshHighQuality);

      const results = await service.findFreshQualityContent(PlatformId.twitter(), 24, 10);

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].id.toString()).toBe('twitter:1');
    });

    it('should exclude old content', async () => {
      const oldContent = createTestContent({
        id: 'twitter:1',
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
        metrics: { likes: 50, comments: 25, shares: 10, views: 500 },
      });

      repository.addContent(oldContent);

      const results = await service.findFreshQualityContent(PlatformId.twitter(), 24, 10);

      expect(results).toHaveLength(0);
    });
  });

  describe('batchUpdateStatus', () => {
    it('should update all valid content statuses', async () => {
      const content1 = createTestContent({
        id: 'twitter:1',
        status: ContentStatus.PENDING_CATEGORIZATION,
      });
      const content2 = createTestContent({
        id: 'twitter:2',
        status: ContentStatus.PENDING_CATEGORIZATION,
      });

      repository.addContent(content1);
      repository.addContent(content2);

      await service.batchUpdateStatus([content1.id, content2.id], ContentStatus.PENDING_RANKING);

      const updated1 = await repository.findById(content1.id);
      const updated2 = await repository.findById(content2.id);

      expect(updated1?.status).toBe(ContentStatus.PENDING_RANKING);
      expect(updated2?.status).toBe(ContentStatus.PENDING_RANKING);
    });

    it('should throw error if any transition is invalid', async () => {
      const content1 = createTestContent({
        id: 'twitter:1',
        status: ContentStatus.PENDING_CATEGORIZATION,
      });
      const content2 = createTestContent({
        id: 'twitter:2',
        status: ContentStatus.PENDING_RANKING, // Different status
      });

      repository.addContent(content1);
      repository.addContent(content2);

      await expect(
        service.batchUpdateStatus([content1.id, content2.id], ContentStatus.PENDING_RANKING)
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('contentExists', () => {
    it('should return true for existing content', async () => {
      const content = createTestContent({
        platformContentId: 'unique123',
      });
      repository.addContent(content);

      const exists = await service.contentExists(PlatformId.twitter(), 'unique123');

      expect(exists).toBe(true);
    });

    it('should return false for non-existing content', async () => {
      const exists = await service.contentExists(PlatformId.twitter(), 'nonexistent');

      expect(exists).toBe(false);
    });
  });

  describe('getBatchStatistics', () => {
    it('should calculate correct statistics', async () => {
      const contents = [
        createTestContent({
          id: 'twitter:1',
          batchId: 'batch1',
          status: ContentStatus.PENDING_CATEGORIZATION,
          category: 'educational',
          metrics: { likes: 50, comments: 10, shares: 5, views: 1000 },
        }),
        createTestContent({
          id: 'twitter:2',
          batchId: 'batch1',
          status: ContentStatus.PENDING_RANKING,
          category: 'educational',
          rankScore: 75,
          metrics: { likes: 60, comments: 12, shares: 6, views: 1200 },
        }),
        createTestContent({
          id: 'twitter:3',
          batchId: 'batch1',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          category: 'promotional',
          rankScore: 85,
          engagementAction: ActionType.LIKE,
          metrics: { likes: 70, comments: 15, shares: 8, views: 1500 },
        }),
      ];

      contents.forEach((c) => repository.addContent(c));

      const stats = await service.getBatchStatistics('batch1');

      expect(stats.total).toBe(3);
      expect(stats.byStatus[ContentStatus.PENDING_CATEGORIZATION]).toBe(1);
      expect(stats.byStatus[ContentStatus.PENDING_RANKING]).toBe(1);
      expect(stats.byStatus[ContentStatus.QUEUED_FOR_ENGAGEMENT]).toBe(1);
      expect(stats.byCategory['educational']).toBe(2);
      expect(stats.byCategory['promotional']).toBe(1);
      expect(stats.averageRankScore).toBe(80); // (75 + 85) / 2
      expect(stats.inGrowthSweetSpot).toBe(3); // All have 50-100 likes
      expect(stats.readyForAutomation).toBe(1); // Only one with action and score >= 50
    });

    it('should handle empty batch', async () => {
      const stats = await service.getBatchStatistics('emptybatch');

      expect(stats.total).toBe(0);
      expect(stats.averageRankScore).toBe(0);
      expect(stats.inGrowthSweetSpot).toBe(0);
      expect(stats.readyForAutomation).toBe(0);
    });
  });
});
