/**
 * Queue Service
 * Service for adding jobs to queues
 */

import { queues, QueueName } from './queues';
import { JobType } from '../../domain/entities/Job';
import { IJobRepository } from '../../domain/repositories/IJobRepository';
import { Job as JobEntity } from '../../domain/entities/Job';
import { logger } from '../../../config/logger';
import { nanoid } from 'nanoid';

/**
 * Job data interface
 */
export interface JobData {
  tweetId: string;
  batchId?: string;
  userId?: string;
}

/**
 * Queue Service
 * Handles job queuing and tracking
 */
export class QueueService {
  constructor(private readonly jobRepository: IJobRepository) {}

  /**
   * Add cleanup job
   */
  async addCleanupJob(tweetId: string, batchId: string): Promise<void> {
    await this.addJob('cleanup', JobType.CLEANUP, { tweetId, batchId });
  }

  /**
   * Add OCR job
   */
  async addOCRJob(tweetId: string, batchId: string): Promise<void> {
    await this.addJob('ocr', JobType.OCR, { tweetId, batchId });
  }

  /**
   * Add image captioning job
   */
  async addImageCaptioningJob(tweetId: string, batchId: string): Promise<void> {
    await this.addJob('image-captioning', JobType.IMAGE_CAPTIONING, { tweetId, batchId });
  }

  /**
   * Add categorization job
   */
  async addCategorizationJob(tweetId: string, batchId: string): Promise<void> {
    await this.addJob('categorization', JobType.CATEGORIZATION, { tweetId, batchId });
  }

  /**
   * Add ranking job
   */
  async addRankingJob(tweetId: string, batchId: string): Promise<void> {
    await this.addJob('ranking', JobType.RANKING, { tweetId, batchId });
  }

  /**
   * Add engagement job
   */
  async addEngagementJob(tweetId: string, batchId: string): Promise<void> {
    await this.addJob('engagement', JobType.ENGAGEMENT, { tweetId, batchId });
  }

  /**
   * Add job to queue
   */
  private async addJob(queueName: QueueName, jobType: JobType, data: JobData): Promise<void> {
    try {
      const queue = queues[queueName];

      // Create job tracking entity
      const jobEntity = JobEntity.builder()
        .id(`job_${Date.now()}_${nanoid(8)}`)
        .tweetId(data.tweetId)
        .type(jobType)
        .createdAt(new Date())
        .updatedAt(new Date())
        .build();

      // Save to database
      await this.jobRepository.save(jobEntity);

      // Add to queue
      await queue.add(queueName, {
        ...data,
        jobId: jobEntity.id,
      });

      logger.info(`Added ${jobType} job to queue`, {
        jobId: jobEntity.id,
        tweetId: data.tweetId,
        batchId: data.batchId,
      });
    } catch (error) {
      logger.error(`Failed to add ${jobType} job to queue`, {
        tweetId: data.tweetId,
        error,
      });
      throw error;
    }
  }

  /**
   * Get queue stats
   */
  async getQueueStats(queueName: QueueName) {
    const queue = queues[queueName];

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queue: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get all queue stats
   */
  async getAllQueueStats() {
    const stats = await Promise.all(
      Object.keys(queues).map((name) => this.getQueueStats(name as QueueName))
    );

    return stats;
  }
}
