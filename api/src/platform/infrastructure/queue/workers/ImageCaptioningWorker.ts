/**
 * Image Captioning Worker
 * Processes image captioning jobs from the image-captioning queue
 * Generates descriptions for images in content to enhance categorization
 */

import { Worker, Job } from 'bullmq';
import { config } from '../../../../config/env';
import { IContentRepository } from '../../../domain/repositories/IContentRepository';
import { IJobRepository } from '../../../domain/repositories/IJobRepository';
import { IImageCaptioningService } from '../../../domain/services/IImageCaptioningService';
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
 * Image Captioning Worker
 * Generates captions and descriptions for images
 */
export class ImageCaptioningWorker {
  private worker: Worker;

  constructor(
    private readonly contentRepository: IContentRepository,
    private readonly jobRepository: IJobRepository,
    private readonly captioningService: IImageCaptioningService,
    private readonly queueService: QueueService
  ) {
    this.worker = new Worker(
      'image-captioning',
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: config.queue.imageCaptioning.concurrency, // Process 3 jobs concurrently
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process image captioning job
   */
  private async processJob(job: Job) {
    const { contentId, batchId, jobId } = job.data;

    logger.info('Processing image captioning job', { jobId, contentId, batchId });

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

      // Check if captioning service is available
      const isCaptioningAvailable = await this.captioningService.isAvailable();
      if (!isCaptioningAvailable) {
        logger.warn('Image captioning service not available, skipping captioning', { contentId });

        // Skip captioning and move to next stage
        const updatedContent = content.withStatus(ContentStatus.PENDING_CATEGORIZATION);
        await this.contentRepository.save(updatedContent);

        if (jobEntity) {
          await this.jobRepository.save(
            jobEntity.markAsCompleted({
              contentId,
              status: ContentStatus.PENDING_CATEGORIZATION,
              captioningSkipped: true,
            })
          );
        }

        // Queue categorization job
        await this.queueService.addCategorizationJob(contentId, batchId);

        logger.info('Image captioning job completed (skipped - service unavailable)', {
          jobId,
          contentId,
        });

        return {
          success: true,
          contentId,
          status: ContentStatus.PENDING_CATEGORIZATION,
          captioningSkipped: true,
        };
      }

      // Check if content has images
      const imageUrls = content.media?.filter((m) => m.type === 'image').map((m) => m.url) || [];

      if (imageUrls.length === 0) {
        logger.info('No images found in content, skipping captioning', { contentId });

        // No images, move to next stage
        const updatedContent = content.withStatus(ContentStatus.PENDING_CATEGORIZATION);
        await this.contentRepository.save(updatedContent);

        if (jobEntity) {
          await this.jobRepository.save(
            jobEntity.markAsCompleted({
              contentId,
              status: ContentStatus.PENDING_CATEGORIZATION,
              imagesCount: 0,
            })
          );
        }

        // Queue categorization job
        await this.queueService.addCategorizationJob(contentId, batchId);

        logger.info('Image captioning job completed (no images)', { jobId, contentId });

        return {
          success: true,
          contentId,
          status: ContentStatus.PENDING_CATEGORIZATION,
          imagesCount: 0,
        };
      }

      // Generate captions for all images
      logger.info(`Generating captions for ${imageUrls.length} images`, { contentId });
      const captionResults = await this.captioningService.captionImages(imageUrls, {
        maxLength: config.imageCaptioning.options.maxLength,
        includeLabels: config.imageCaptioning.options.includeLabels,
        includeObjects: config.imageCaptioning.options.includeObjects,
      });

      // Filter results by confidence threshold
      const validResults = captionResults.filter(
        (result) => result.confidence >= config.imageCaptioning.options.minConfidence
      );

      // Combine captions
      const captions = validResults
        .map((result) => result.caption)
        .filter((caption) => caption && caption.trim().length > 0)
        .join('. ');

      // Collect all labels
      const allLabels = validResults
        .flatMap((result) => result.labels || [])
        .filter((label, index, array) => array.indexOf(label) === index) // Remove duplicates
        .slice(0, 10); // Limit to 10 labels

      logger.info('Image captioning completed', {
        contentId,
        imagesCount: imageUrls.length,
        validResults: validResults.length,
        captionLength: captions.length,
        labelsCount: allLabels.length,
      });

      // Update content with enhanced text
      let updatedContent = content;
      if (captions.length > 0 || allLabels.length > 0) {
        // Append captions and labels to existing content
        let enhancedText = content.text || '';

        if (captions.length > 0) {
          enhancedText += `\n\n[Image captions: ${captions}]`;
        }

        if (allLabels.length > 0) {
          enhancedText += `\n[Image labels: ${allLabels.join(', ')}]`;
        }

        updatedContent = content
          .withTextWithDescriptions(enhancedText.trim())
          .withStatus(ContentStatus.PENDING_CATEGORIZATION);
      } else {
        // No valid captions generated, just update status
        updatedContent = content.withStatus(ContentStatus.PENDING_CATEGORIZATION);
      }

      await this.contentRepository.save(updatedContent);

      // Mark job as completed
      if (jobEntity) {
        await this.jobRepository.save(
          jobEntity.markAsCompleted({
            contentId,
            status: ContentStatus.PENDING_CATEGORIZATION,
            imagesCount: imageUrls.length,
            captionLength: captions.length,
            labelsCount: allLabels.length,
            avgConfidence:
              validResults.length > 0
                ? validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length
                : 0,
          })
        );
      }

      // Queue categorization job
      await this.queueService.addCategorizationJob(contentId, batchId);

      logger.info('Image captioning job completed', {
        jobId,
        contentId,
        imagesProcessed: imageUrls.length,
        captionsGenerated: captions.length > 0,
      });

      return {
        success: true,
        contentId,
        status: ContentStatus.PENDING_CATEGORIZATION,
        imagesCount: imageUrls.length,
        captionLength: captions.length,
        labelsCount: allLabels.length,
      };
    } catch (error: any) {
      logger.error('Image captioning job failed', { jobId, contentId, error: error.message });

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
      logger.info('Image captioning job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Image captioning job failed', { jobId: job?.id, error: err.message });
    });

    this.worker.on('error', (err) => {
      logger.error('Image captioning worker error', { error: err });
    });
  }

  /**
   * Close worker
   */
  async close() {
    await this.worker.close();
  }
}
