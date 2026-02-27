/**
 * Engagement Worker
 * Processes engagement jobs from the engagement queue
 * Now integrated with AutomationOrchestrator for real automation
 */

import { Worker, Job } from 'bullmq';
import { IContentRepository } from '../../../domain/repositories/IContentRepository';
import { IJobRepository } from '../../../domain/repositories/IJobRepository';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { ContentId } from '../../../core/value-objects/ContentId';
import { logger } from '../../../../config/logger';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

/**
 * Engagement Worker
 */
export class EngagementWorker {
  private worker: Worker;

  constructor(
    private readonly contentRepository: IContentRepository,
    private readonly jobRepository: IJobRepository
  ) {
    this.worker = new Worker(
      'engagement',
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 2, // Process 2 jobs concurrently (rate limits)
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process engagement job
   * NOTE: This worker is now deprecated in favor of calling AutomationOrchestrator directly.
   * Content is already in QUEUED_FOR_ENGAGEMENT status after ranking.
   * To trigger automation, call: POST /api/v1/automation/execute
   */
  private async processJob(job: Job) {
    const { contentId, batchId, jobId } = job.data;

    logger.info('Processing engagement job (DEPRECATED - use AutomationOrchestrator API instead)', {
      jobId,
      contentId,
      batchId,
    });

    try {
      const jobEntity = await this.jobRepository.findById(jobId);
      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsProcessing());
      }

      const content = await this.contentRepository.findById(ContentId.fromString(contentId));
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      // Content is already QUEUED_FOR_ENGAGEMENT from RankingWorker
      // Actual automation should be triggered via AutomationOrchestrator API
      logger.warn(
        `Content ${contentId} is queued for engagement. Trigger automation via POST /api/v1/automation/execute`
      );

      if (jobEntity) {
        await this.jobRepository.save(
          jobEntity.markAsCompleted({
            contentId,
            status: ContentStatus.QUEUED_FOR_ENGAGEMENT,
            message: 'Use AutomationOrchestrator API for actual automation',
          })
        );
      }

      logger.info('Engagement job completed (no action taken - use API)', { jobId, contentId });

      return { success: true, contentId, status: ContentStatus.QUEUED_FOR_ENGAGEMENT };
    } catch (error: any) {
      logger.error('Engagement job failed', { jobId, contentId, error });

      const jobEntity = await this.jobRepository.findById(jobId);
      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsFailed(error.message));
      }

      throw error;
    }
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info('Engagement job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Engagement job failed', { jobId: job?.id, error: err.message });
    });

    this.worker.on('error', (err) => {
      logger.error('Engagement worker error', { error: err });
    });
  }

  async close() {
    await this.worker.close();
  }
}
