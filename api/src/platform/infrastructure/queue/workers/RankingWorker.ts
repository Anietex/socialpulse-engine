/**
 * Ranking Worker
 * Processes ranking jobs from the ranking queue
 * Now works with Content entities for unified pipeline
 */

import { Worker, Job } from 'bullmq';
import { IContentRepository } from '../../../domain/repositories/IContentRepository';
import { IJobRepository } from '../../../domain/repositories/IJobRepository';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { ContentId } from '../../../core/value-objects/ContentId';
import { ActionType } from '../../../core/types/ActionType';
import { logger } from '../../../../config/logger';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

/**
 * Ranking Worker
 */
export class RankingWorker {
  private worker: Worker;

  constructor(
    private readonly contentRepository: IContentRepository,
    private readonly jobRepository: IJobRepository
  ) {
    this.worker = new Worker(
      'ranking',
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 10, // Process 10 jobs concurrently
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process ranking job
   */
  private async processJob(job: Job) {
    const { contentId, batchId, jobId } = job.data;

    logger.info('Processing ranking job', { jobId, contentId, batchId });

    try {
      const jobEntity = await this.jobRepository.findById(jobId);
      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsProcessing());
      }

      const content = await this.contentRepository.findById(ContentId.fromString(contentId));
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      // Calculate rank based on metrics
      const rank = this.calculateRank(content.metrics);

      // Determine engagement action based on rank
      const action = this.determineAction(rank);

      // Update content with rank score and engagement action
      let rankedContent = content.withRankScore(rank);

      if (action) {
        rankedContent = rankedContent
          .withEngagementAction(action)
          .withStatus(ContentStatus.QUEUED_FOR_ENGAGEMENT);
      } else {
        rankedContent = rankedContent.withStatus(ContentStatus.SKIPPED);
      }

      await this.contentRepository.save(rankedContent);

      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsCompleted({ contentId, rank, action }));
      }

      logger.info('Ranking job completed', { jobId, contentId, rank, action });

      return { success: true, contentId, rank, action };
    } catch (error: any) {
      logger.error('Ranking job failed', { jobId, contentId, error });

      const jobEntity = await this.jobRepository.findById(jobId);
      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsFailed(error.message));
      }

      throw error;
    }
  }

  /**
   * Calculate content rank (0-100)
   */
  private calculateRank(metrics: any): number {
    // Simple ranking algorithm
    const engagement = metrics.getLikes() + metrics.getComments() * 2 + metrics.getShares() * 3;
    const viewRatio = metrics.getViews() > 0 ? engagement / metrics.getViews() : 0;

    // Normalize to 0-100 scale
    const rank = Math.min(100, Math.max(0, viewRatio * 1000));

    return Math.round(rank);
  }

  /**
   * Determine engagement action based on rank score
   */
  private determineAction(rank: number): ActionType | undefined {
    if (rank >= 80) {
      return ActionType.QUOTE; // High value content - quote it
    } else if (rank >= 60) {
      return ActionType.COMMENT; // Good content - add a comment
    } else if (rank >= 40) {
      return ActionType.LIKE; // Decent content - like it
    } else {
      return undefined; // Skip low-ranked content
    }
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info('Ranking job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Ranking job failed', { jobId: job?.id, error: err.message });
    });

    this.worker.on('error', (err) => {
      logger.error('Ranking worker error', { error: err });
    });
  }

  async close() {
    await this.worker.close();
  }
}
