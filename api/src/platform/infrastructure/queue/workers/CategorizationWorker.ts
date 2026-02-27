/**
 * Categorization Worker
 * Processes categorization jobs from the categorization queue
 * Now works with Content entities for unified pipeline
 */

import { Worker, Job } from 'bullmq';
import { IContentRepository } from '../../../domain/repositories/IContentRepository';
import { IJobRepository } from '../../../domain/repositories/IJobRepository';
import { ContentStatus } from '../../../core/types/ContentStatus';
import { ContentId } from '../../../core/value-objects/ContentId';
import { logger } from '../../../../config/logger';
import { QueueService } from '../QueueService';

const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
};

/**
 * Categorization Worker
 */
export class CategorizationWorker {
  private worker: Worker;

  constructor(
    private readonly contentRepository: IContentRepository,
    private readonly jobRepository: IJobRepository,
    private readonly queueService: QueueService
  ) {
    this.worker = new Worker(
      'categorization',
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: 3, // Process 3 jobs concurrently (LLM rate limits)
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process categorization job
   */
  private async processJob(job: Job) {
    const { contentId, batchId, jobId } = job.data;

    logger.info('Processing categorization job', { jobId, contentId, batchId });

    try {
      const jobEntity = await this.jobRepository.findById(jobId);
      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsProcessing());
      }

      const content = await this.contentRepository.findById(ContentId.fromString(contentId));
      if (!content) {
        throw new Error(`Content not found: ${contentId}`);
      }

      // Categorize content (use LLM or simple keyword matching)
      const category = await this.categorizeContent(content.text);
      const categorizedContent = content
        .withCategory(category)
        .withStatus(ContentStatus.PENDING_RANKING);
      await this.contentRepository.save(categorizedContent);

      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsCompleted({ contentId, category }));
      }

      // Queue ranking job
      await this.queueService.addRankingJob(contentId, batchId);

      logger.info('Categorization job completed', { jobId, contentId, category });

      return { success: true, contentId, category };
    } catch (error: any) {
      logger.error('Categorization job failed', { jobId, contentId, error });

      const jobEntity = await this.jobRepository.findById(jobId);
      if (jobEntity) {
        await this.jobRepository.save(jobEntity.markAsFailed(error.message));
      }

      throw error;
    }
  }

  /**
   * Categorize content text
   */
  private async categorizeContent(text: string): Promise<string> {
    // Simple keyword-based categorization
    const categories = {
      Technology: ['tech', 'ai', 'software', 'coding', 'developer', 'programming'],
      Business: ['business', 'startup', 'entrepreneur', 'company', 'market'],
      Design: ['design', 'ui', 'ux', 'visual', 'interface'],
      Marketing: ['marketing', 'brand', 'campaign', 'seo', 'content'],
      General: [],
    };

    const lowerText = text.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => lowerText.includes(keyword))) {
        return category;
      }
    }

    return 'General';
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      logger.info('Categorization job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Categorization job failed', { jobId: job?.id, error: err.message });
    });

    this.worker.on('error', (err) => {
      logger.error('Categorization worker error', { error: err });
    });
  }

  async close() {
    await this.worker.close();
  }
}
