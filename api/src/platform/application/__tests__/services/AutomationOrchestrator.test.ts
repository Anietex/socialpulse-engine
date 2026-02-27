/**
 * AutomationOrchestrator Tests
 */
import { AutomationOrchestrator } from '../../services/AutomationOrchestrator';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { ActionType } from '../../../core/types/ActionType';
import {
  createMockRepository,
  createMockAdapter,
  createTestContent,
  createSuccessActionResult,
  createFailedActionResult,
  createRateLimitStatus,
} from '../helpers/mocks';

describe('AutomationOrchestrator', () => {
  let orchestrator: AutomationOrchestrator;
  let mockRepository: ReturnType<typeof createMockRepository>;
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    orchestrator = new AutomationOrchestrator(mockRepository);
    mockAdapter = createMockAdapter('twitter');
  });

  describe('executeAutomation', () => {
    it('should successfully execute automation for queued content', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          engagementAction: ActionType.LIKE,
        }),
        createTestContent({
          id: 'twitter:tweet-2',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          engagementAction: ActionType.COMMENT,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      mockAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());
      mockAdapter.rateLimits.calculateDelay.mockReturnValue(0);
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      const result = await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(result.totalProcessed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.results).toHaveLength(2);

      // Verify status updates
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        content[0].id,
        ContentStatus.ENGAGING
      );
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        content[0].id,
        ContentStatus.ENGAGED
      );
    });

    it('should handle empty queue gracefully', async () => {
      // Arrange
      mockRepository.findByStatus.mockResolvedValue([]);

      // Act
      const result = await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(result.totalProcessed).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.skipped).toBe(0);
      expect(mockAdapter.actionExecutor.executeAction).not.toHaveBeenCalled();
    });

    it('should skip content without engagement action', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          // No engagementAction set
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);

      // Act
      const result = await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(result.totalProcessed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].success).toBe(false);
      expect(result.results[0].error).toBe('No engagement action defined');
      expect(mockAdapter.actionExecutor.executeAction).not.toHaveBeenCalled();
    });

    it('should skip unsupported actions', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          engagementAction: ActionType.QUOTE,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(false);
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      const result = await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(result.totalProcessed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('Action quote not supported');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        content[0].id,
        ContentStatus.SKIPPED
      );
    });

    it('should respect rate limits', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          engagementAction: ActionType.LIKE,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(
        createRateLimitStatus(true) // Rate limited
      );

      // Act
      const result = await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(result.totalProcessed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toContain('Rate limit exceeded');
      expect(mockAdapter.actionExecutor.executeAction).not.toHaveBeenCalled();
    });

    it('should handle action execution failures', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          engagementAction: ActionType.LIKE,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      mockAdapter.actionExecutor.executeAction.mockResolvedValue(
        createFailedActionResult('Like button not found')
      );
      mockAdapter.rateLimits.calculateDelay.mockReturnValue(0);
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      const result = await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(result.totalProcessed).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('Like button not found');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(content[0].id, ContentStatus.ERROR);
    });

    it('should filter by action type when specified', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          engagementAction: ActionType.LIKE,
        }),
      ];

      mockRepository.findReadyForAction.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      mockAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());
      mockAdapter.rateLimits.calculateDelay.mockReturnValue(0);
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      await orchestrator.executeAutomation(mockAdapter, 50, ActionType.LIKE);

      // Assert
      expect(mockRepository.findReadyForAction).toHaveBeenCalledWith(ActionType.LIKE, 50);
      expect(mockRepository.findByStatus).not.toHaveBeenCalled();
    });

    it('should apply rate limit delays between actions', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          engagementAction: ActionType.LIKE,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      mockAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());
      mockAdapter.rateLimits.calculateDelay.mockReturnValue(1000); // 1 second delay
      mockRepository.updateStatus.mockResolvedValue(undefined);

      const startTime = Date.now();

      // Act
      await orchestrator.executeAutomation(mockAdapter, 50);

      const elapsedTime = Date.now() - startTime;

      // Assert
      expect(mockAdapter.rateLimits.calculateDelay).toHaveBeenCalledWith(ActionType.LIKE);
      // Should have delayed for approximately 1 second
      expect(elapsedTime).toBeGreaterThanOrEqual(1000);
    });

    it('should build action data for COMMENT action', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          text: 'Original tweet',
          engagementAction: ActionType.COMMENT,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      mockAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());
      mockAdapter.rateLimits.calculateDelay.mockReturnValue(0);
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(mockAdapter.actionExecutor.executeAction).toHaveBeenCalledWith(
        ActionType.COMMENT,
        content[0].platformContentId,
        expect.objectContaining({
          replyText: expect.any(String),
          originalText: 'Original tweet',
        })
      );
    });

    it('should build action data for QUOTE action', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          text: 'Original tweet',
          engagementAction: ActionType.QUOTE,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      mockAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());
      mockAdapter.rateLimits.calculateDelay.mockReturnValue(0);
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(mockAdapter.actionExecutor.executeAction).toHaveBeenCalledWith(
        ActionType.QUOTE,
        content[0].platformContentId,
        expect.objectContaining({
          quoteText: expect.any(String),
          originalText: 'Original tweet',
        })
      );
    });

    it('should handle unexpected errors during processing', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          engagementAction: ActionType.LIKE,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockRejectedValue(new Error('Unexpected error'));
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      const result = await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(result.totalProcessed).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.results[0].error).toBe('Unexpected error');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(content[0].id, ContentStatus.ERROR);
    });

    it('should handle top-level errors gracefully', async () => {
      // Arrange
      mockRepository.findByStatus.mockRejectedValue(new Error('Database connection lost'));

      // Act
      const result = await orchestrator.executeAutomation(mockAdapter, 50);

      // Assert
      expect(result.totalProcessed).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toBe('Database connection lost');
    });
  });

  describe('executeMultiPlatformAutomation', () => {
    it('should execute automation across multiple platforms', async () => {
      // Arrange
      const twitterAdapter = createMockAdapter('twitter');
      const instagramAdapter = createMockAdapter('instagram');

      const twitterContent = [
        createTestContent({
          id: 'twitter:tw-1',
          platformId: 'twitter',
          engagementAction: ActionType.LIKE,
        }),
      ];
      const instagramContent = [
        createTestContent({
          id: 'instagram:ig-1',
          platformId: 'instagram',
          engagementAction: ActionType.LIKE,
        }),
      ];

      mockRepository.findByStatus
        .mockResolvedValueOnce(twitterContent)
        .mockResolvedValueOnce(instagramContent);

      twitterAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      instagramAdapter.actionExecutor.supportsAction.mockReturnValue(true);

      twitterAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      instagramAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(
        createRateLimitStatus(false)
      );

      twitterAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());
      instagramAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());

      twitterAdapter.rateLimits.calculateDelay.mockReturnValue(0);
      instagramAdapter.rateLimits.calculateDelay.mockReturnValue(0);

      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      const results = await orchestrator.executeMultiPlatformAutomation(
        [twitterAdapter, instagramAdapter],
        50
      );

      // Assert
      expect(results.size).toBe(2);
      expect(results.get('twitter')?.successful).toBe(1);
      expect(results.get('instagram')?.successful).toBe(1);
    });

    it('should handle partial platform failures', async () => {
      // Arrange
      const twitterAdapter = createMockAdapter('twitter');
      const instagramAdapter = createMockAdapter('instagram');

      mockRepository.findByStatus
        .mockResolvedValueOnce([createTestContent({ engagementAction: ActionType.LIKE })])
        .mockRejectedValueOnce(new Error('Instagram database error'));

      twitterAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      twitterAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      twitterAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());
      twitterAdapter.rateLimits.calculateDelay.mockReturnValue(0);
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      const results = await orchestrator.executeMultiPlatformAutomation(
        [twitterAdapter, instagramAdapter],
        50
      );

      // Assert
      expect(results.size).toBe(2);
      expect(results.get('twitter')?.successful).toBe(1);
      expect(results.get('instagram')?.successful).toBe(0);
      expect(results.get('instagram')?.failed).toBe(0);
      expect(results.get('instagram')?.errors[0]).toBe('Instagram database error');
    });
  });

  describe('executeActionBatch', () => {
    it('should execute specific action type', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          engagementAction: ActionType.LIKE,
        }),
      ];

      mockRepository.findReadyForAction.mockResolvedValue(content);
      mockAdapter.actionExecutor.supportsAction.mockReturnValue(true);
      mockAdapter.rateLimits.getRateLimitStatus.mockResolvedValue(createRateLimitStatus(false));
      mockAdapter.actionExecutor.executeAction.mockResolvedValue(createSuccessActionResult());
      mockAdapter.rateLimits.calculateDelay.mockReturnValue(0);
      mockRepository.updateStatus.mockResolvedValue(undefined);

      // Act
      const result = await orchestrator.executeActionBatch(mockAdapter, ActionType.LIKE, 20);

      // Assert
      expect(mockRepository.findReadyForAction).toHaveBeenCalledWith(ActionType.LIKE, 20);
      expect(result.successful).toBe(1);
    });
  });

  describe('previewAutomation', () => {
    it('should preview automation without executing', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          engagementAction: ActionType.LIKE,
        }),
        createTestContent({
          id: 'twitter:tweet-2',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          engagementAction: ActionType.LIKE,
        }),
        createTestContent({
          id: 'twitter:tweet-3',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          engagementAction: ActionType.COMMENT,
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);

      // Act
      const result = await orchestrator.previewAutomation(50);

      // Assert
      expect(result.totalReady).toBe(3);
      expect(result.byAction.get(ActionType.LIKE)).toBe(2);
      expect(result.byAction.get(ActionType.COMMENT)).toBe(1);
      expect(result.content).toHaveLength(3);
      expect(mockAdapter.actionExecutor.executeAction).not.toHaveBeenCalled();
    });

    it('should handle content without engagement action', async () => {
      // Arrange
      const content = [
        createTestContent({
          id: 'twitter:tweet-1',
          status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
          // No engagementAction
        }),
      ];

      mockRepository.findByStatus.mockResolvedValue(content);

      // Act
      const result = await orchestrator.previewAutomation(50);

      // Assert
      expect(result.totalReady).toBe(1);
      expect(result.byAction.size).toBe(0);
    });
  });
});
