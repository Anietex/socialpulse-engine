/**
 * ContentOrchestrationService Tests
 */
import { ContentOrchestrationService } from '../../services/ContentOrchestrationService';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { PlatformId } from '../../../core/value-objects/PlatformId';
import { ContentId } from '../../../core/value-objects/ContentId';
import {
  createMockRepository,
  createMockAdapter,
  createMockContentService,
  createTestContent,
  createTestRawContent,
  createTestNormalizedContent,
} from '../helpers/mocks';

describe('ContentOrchestrationService', () => {
  let service: ContentOrchestrationService;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let mockDomainService: ReturnType<typeof createMockContentService>;
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    mockDomainService = createMockContentService();
    mockAdapter = createMockAdapter('twitter');
    service = new ContentOrchestrationService(mockRepository, mockDomainService);
  });

  describe('scrapeAndSaveContent', () => {
    it('should successfully scrape, normalize, and save content', async () => {
      // Arrange
      const rawContent = [
        createTestRawContent('tweet-1'),
        createTestRawContent('tweet-2'),
        createTestRawContent('tweet-3'),
      ];
      const normalizedContent = [
        createTestNormalizedContent('tweet-1'),
        createTestNormalizedContent('tweet-2'),
        createTestNormalizedContent('tweet-3'),
      ];

      mockAdapter.scraper.scrape.mockResolvedValue(rawContent);
      mockAdapter.normalizer.normalizeMany.mockReturnValue(normalizedContent);
      mockRepository.findByPlatformContentId.mockResolvedValue(null); // No duplicates
      mockRepository.saveMany.mockResolvedValue([
        createTestContent({ id: 'twitter:tweet-1', platformContentId: 'tweet-1' }),
        createTestContent({ id: 'twitter:tweet-2', platformContentId: 'tweet-2' }),
        createTestContent({ id: 'twitter:tweet-3', platformContentId: 'tweet-3' }),
      ]);

      // Act
      const result = await service.scrapeAndSaveContent(mockAdapter, 100);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalScraped).toBe(3);
      expect(result.totalNormalized).toBe(3);
      expect(result.totalSaved).toBe(3);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.newContentIds).toHaveLength(3);
      expect(mockAdapter.scraper.scrape).toHaveBeenCalledTimes(1);
      expect(mockAdapter.normalizer.normalizeMany).toHaveBeenCalledWith(rawContent);
      expect(mockRepository.saveMany).toHaveBeenCalledTimes(1);
    });

    it('should handle empty scrape results', async () => {
      // Arrange
      mockAdapter.scraper.scrape.mockResolvedValue([]);

      // Act
      const result = await service.scrapeAndSaveContent(mockAdapter, 100);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalScraped).toBe(0);
      expect(result.totalNormalized).toBe(0);
      expect(result.totalSaved).toBe(0);
      expect(result.duplicates).toBe(0);
      expect(mockRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should filter out duplicate content', async () => {
      // Arrange
      const rawContent = [
        createTestRawContent('tweet-1'),
        createTestRawContent('tweet-2'),
        createTestRawContent('tweet-3'),
      ];
      const normalizedContent = [
        createTestNormalizedContent('tweet-1'),
        createTestNormalizedContent('tweet-2'),
        createTestNormalizedContent('tweet-3'),
      ];

      mockAdapter.scraper.scrape.mockResolvedValue(rawContent);
      mockAdapter.normalizer.normalizeMany.mockReturnValue(normalizedContent);

      // tweet-2 already exists (duplicate)
      mockRepository.findByPlatformContentId.mockImplementation(
        async (_platformId: any, contentId: string) => {
          if (contentId === 'tweet-2') {
            return createTestContent({ platformContentId: 'tweet-2' });
          }
          return null;
        }
      );

      mockRepository.saveMany.mockResolvedValue([
        createTestContent({ platformContentId: 'tweet-1' }),
        createTestContent({ platformContentId: 'tweet-3' }),
      ]);

      // Act
      const result = await service.scrapeAndSaveContent(mockAdapter, 100);

      // Assert
      expect(result.success).toBe(true);
      expect(result.totalScraped).toBe(3);
      expect(result.totalNormalized).toBe(3);
      expect(result.totalSaved).toBe(2); // Only 2 saved (1 was duplicate)
      expect(result.duplicates).toBe(1);
      expect(mockRepository.findByPlatformContentId).toHaveBeenCalledTimes(3);
    });

    it('should add batch ID when provided', async () => {
      // Arrange
      const rawContent = [createTestRawContent('tweet-1')];
      const normalizedContent = [createTestNormalizedContent('tweet-1')];

      mockAdapter.scraper.scrape.mockResolvedValue(rawContent);
      mockAdapter.normalizer.normalizeMany.mockReturnValue(normalizedContent);
      mockRepository.findByPlatformContentId.mockResolvedValue(null);
      mockRepository.saveMany.mockResolvedValue([
        createTestContent({ platformContentId: 'tweet-1' }),
      ]);

      // Act
      const result = await service.scrapeAndSaveContent(mockAdapter, 100, 'batch-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockRepository.saveMany).toHaveBeenCalledTimes(1);
      const savedContent = mockRepository.saveMany.mock.calls[0][0];
      // Batch ID should be set on all content
      expect(savedContent.every((c: any) => c.batchId === 'batch-123')).toBe(true);
    });

    it('should handle scraping errors gracefully', async () => {
      // Arrange
      mockAdapter.scraper.scrape.mockRejectedValue(new Error('Scraping failed'));

      // Act
      const result = await service.scrapeAndSaveContent(mockAdapter, 100);

      // Assert
      expect(result.success).toBe(false);
      expect(result.totalScraped).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Scraping failed');
      expect(mockRepository.saveMany).not.toHaveBeenCalled();
    });

    it('should handle normalization failures', async () => {
      // Arrange
      const rawContent = [createTestRawContent('tweet-1')];

      mockAdapter.scraper.scrape.mockResolvedValue(rawContent);
      mockAdapter.normalizer.normalizeMany.mockImplementation(() => {
        throw new Error('Normalization failed');
      });

      // Act
      const result = await service.scrapeAndSaveContent(mockAdapter, 100);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Normalization failed');
    });

    it('should handle database save errors', async () => {
      // Arrange
      const rawContent = [createTestRawContent('tweet-1')];
      const normalizedContent = [createTestNormalizedContent('tweet-1')];

      mockAdapter.scraper.scrape.mockResolvedValue(rawContent);
      mockAdapter.normalizer.normalizeMany.mockReturnValue(normalizedContent);
      mockRepository.findByPlatformContentId.mockResolvedValue(null);
      mockRepository.saveMany.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.scrapeAndSaveContent(mockAdapter, 100);

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Database error');
    });
  });

  describe('scrapeFromMultiplePlatforms', () => {
    it('should scrape from multiple platforms in parallel', async () => {
      // Arrange
      const twitterAdapter = createMockAdapter('twitter');
      const instagramAdapter = createMockAdapter('instagram');

      twitterAdapter.scraper.scrape.mockResolvedValue([createTestRawContent('tweet-1')]);
      twitterAdapter.normalizer.normalizeMany.mockReturnValue([
        createTestNormalizedContent('tweet-1'),
      ]);

      instagramAdapter.scraper.scrape.mockResolvedValue([createTestRawContent('post-1')]);
      instagramAdapter.normalizer.normalizeMany.mockReturnValue([
        createTestNormalizedContent('post-1'),
      ]);

      mockRepository.findByPlatformContentId.mockResolvedValue(null);
      mockRepository.saveMany.mockResolvedValue([createTestContent()]);

      // Act
      const results = await service.scrapeFromMultiplePlatforms(
        [twitterAdapter, instagramAdapter],
        50
      );

      // Assert
      expect(results.size).toBe(2);
      expect(results.get('twitter')?.success).toBe(true);
      expect(results.get('instagram')?.success).toBe(true);
      expect(twitterAdapter.scraper.scrape).toHaveBeenCalledTimes(1);
      expect(instagramAdapter.scraper.scrape).toHaveBeenCalledTimes(1);
    });

    it('should handle partial failures across platforms', async () => {
      // Arrange
      const twitterAdapter = createMockAdapter('twitter');
      const instagramAdapter = createMockAdapter('instagram');

      twitterAdapter.scraper.scrape.mockResolvedValue([createTestRawContent('tweet-1')]);
      twitterAdapter.normalizer.normalizeMany.mockReturnValue([
        createTestNormalizedContent('tweet-1'),
      ]);

      instagramAdapter.scraper.scrape.mockRejectedValue(new Error('Instagram API error'));

      mockRepository.findByPlatformContentId.mockResolvedValue(null);
      mockRepository.saveMany.mockResolvedValue([createTestContent()]);

      // Act
      const results = await service.scrapeFromMultiplePlatforms(
        [twitterAdapter, instagramAdapter],
        50
      );

      // Assert
      expect(results.size).toBe(2);
      expect(results.get('twitter')?.success).toBe(true);
      expect(results.get('instagram')?.success).toBe(false);
      expect(results.get('instagram')?.errors[0]).toBe('Instagram API error');
    });
  });

  describe('getContent', () => {
    it('should retrieve content by ID', async () => {
      // Arrange
      const contentId = ContentId.fromString('twitter:tweet-1');
      const content = createTestContent({ id: 'twitter:tweet-1' });
      mockRepository.findById.mockResolvedValue(content);

      // Act
      const result = await service.getContent(contentId);

      // Assert
      expect(result).toBe(content);
      expect(mockRepository.findById).toHaveBeenCalledWith(contentId);
    });

    it('should return null when content not found', async () => {
      // Arrange
      const contentId = ContentId.fromString('twitter:nonexistent');
      mockRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.getContent(contentId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getContentForStage', () => {
    it('should delegate to domain service', async () => {
      // Arrange
      const content = [createTestContent()];
      mockDomainService.getContentForNextStage.mockResolvedValue(content);

      // Act
      const result = await service.getContentForStage(ContentStatus.PENDING_CATEGORIZATION, 100);

      // Assert
      expect(result).toBe(content);
      expect(mockDomainService.getContentForNextStage).toHaveBeenCalledWith(
        ContentStatus.PENDING_CATEGORIZATION,
        100
      );
    });
  });

  describe('updateContentStatuses', () => {
    it('should batch update content statuses', async () => {
      // Arrange
      const contentIds = [
        ContentId.fromString('twitter:tweet-1'),
        ContentId.fromString('twitter:tweet-2'),
      ];
      mockRepository.updateManyStatuses.mockResolvedValue(undefined);

      // Act
      await service.updateContentStatuses(contentIds, ContentStatus.ENGAGED);

      // Assert
      expect(mockRepository.updateManyStatuses).toHaveBeenCalledWith(
        contentIds,
        ContentStatus.ENGAGED
      );
    });
  });

  describe('saveProcessedContent', () => {
    it('should save processed content', async () => {
      // Arrange
      const content = [createTestContent()];
      mockRepository.saveMany.mockResolvedValue(content);

      // Act
      const result = await service.saveProcessedContent(content);

      // Assert
      expect(result).toBe(content);
      expect(mockRepository.saveMany).toHaveBeenCalledWith(content);
    });
  });

  describe('getContentStatistics', () => {
    it('should return statistics for all statuses', async () => {
      // Arrange
      mockRepository.count.mockImplementation(async (filter: any) => {
        const statusCounts: Record<string, number> = {
          [ContentStatus.PENDING_CATEGORIZATION]: 10,
          [ContentStatus.PENDING_RANKING]: 5,
          [ContentStatus.PENDING_ACTION]: 3,
          [ContentStatus.QUEUED_FOR_ENGAGEMENT]: 2,
          [ContentStatus.ENGAGING]: 1,
          [ContentStatus.ENGAGED]: 20,
          [ContentStatus.SKIPPED]: 5,
          [ContentStatus.ERROR]: 2,
        };
        return statusCounts[filter.status as string] || 0;
      });

      // Act
      const result = await service.getContentStatistics();

      // Assert
      expect(result.total).toBe(48); // Sum of all counts
      expect(result.byStatus.get(ContentStatus.PENDING_CATEGORIZATION)).toBe(10);
      expect(result.byStatus.get(ContentStatus.ENGAGED)).toBe(20);
      expect(result.byStatus.get(ContentStatus.ERROR)).toBe(2);
      expect(mockRepository.count).toHaveBeenCalledTimes(8);
    });

    it('should filter statistics by platform', async () => {
      // Arrange
      const platformId = PlatformId.fromString('twitter');
      mockRepository.count.mockResolvedValue(5);

      // Act
      await service.getContentStatistics(platformId);

      // Assert
      expect(mockRepository.count).toHaveBeenCalledWith(expect.objectContaining({ platformId }));
    });
  });
});
