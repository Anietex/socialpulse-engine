/**
 * Cleanup Worker
 * Processes cleanup jobs from the cleanup queue
 * Now works with Content entities for unified pipeline
 */

import { Worker, Job } from 'bullmq';
import { config } from '../../../../config/env';
import { IContentRepository } from '../../../domain/repositories/IContentRepository';
import { IJobRepository } from '../../../domain/repositories/IJobRepository';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { ContentId } from '../../../core/value-objects/ContentId';
import { logger } from '../../../../config/logger';
import { QueueService } from '../QueueService';

/**
 * Redis connection
 */
const redisConnection = {
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null,
};

/**
 * Cleanup Worker
 */
export class CleanupWorker {
  private worker: Worker;

  constructor(
    private readonly contentRepository: IContentRepository,
    private readonly jobRepository: IJobRepository,
    private readonly queueService: QueueService
  ) {
    this.worker = new Worker(
      'cleanup',
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 5, // Process 5 jobs concurrently
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process cleanup job
   */
  private async processJob(job: Job) {
    const { contentId, batchId, jobId } = job.data;

    logger.info('Processing cleanup job', { jobId, contentId, batchId });

    try {
      // Mark job as processing
      const jobEntity = await this.jobRepository.findById(jobId);
      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsProcessing());
      }

      // Get content
      const content = await this.contentRepository.findById(ContentId.fromString(contentId));
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      // Perform cleanup (remove duplicates, normalize text, etc.)
      // For now, just mark as ready for categorization
      const cleanedContent = content.withStatus(ContentStatus.PENDING_CATEGORIZATION);
      await this.contentRepository.save(cleanedContent);

      // Mark job as completed
      if (jobEntity) {
        await this.jobRepository.save(
          jobEntity.markAsCompleted({ contentId, status: ContentStatus.PENDING_CATEGORIZATION })
        );
      }

      // Queue categorization job
      await this.queueService.addCategorizationJob(contentId, batchId);

      logger.info('Cleanup job completed', { jobId, contentId });

      return { success: true, contentId, status: ContentStatus.PENDING_CATEGORIZATION };
    } catch (error: any) {
      logger.error('Cleanup job failed', { jobId, contentId, error });

      // Mark job as failed
      const jobEntity = await this.jobRepository.findById(jobId);
      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsFailed(error.message));
      }

      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info('Cleanup job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Cleanup job failed', { jobId: job?.id, error: err.message });
    });

    this.worker.on('error', (err) => {
      logger.error('Cleanup worker error', { error: err });
    });
  }

  /**
   * Close worker
   */
  async close() {
    await this.worker.close();
  }
}
