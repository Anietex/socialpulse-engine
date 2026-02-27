/**
 * OCR Worker
 * Processes OCR jobs from the ocr queue
 * Extracts text from images in content for enhanced categorization
 */

import { Worker, Job } from 'bullmq';
import { config } from '../../../../config/env';
import { IContentRepository } from '../../../domain/repositories/IContentRepository';
import { IJobRepository } from '../../../domain/repositories/IJobRepository';
import { IOCRService } from '../../../domain/services/IOCRService';
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
 * OCR Worker
 * Extracts text from images and enhances content
 */
export class OCRWorker {
  private worker: Worker;

  constructor(
    private readonly contentRepository: IContentRepository,
    private readonly jobRepository: IJobRepository,
    private readonly ocrService: IOCRService,
    private readonly queueService: QueueService
  ) {
    this.worker = new Worker(
      'ocr',
      async (job: Job) => {
        return this.processJob(job);
      },
      {
        connection: redisConnection,
        concurrency: config.queue.ocr.concurrency, // Process 3 jobs concurrently
      }
    );

    this.setupEventHandlers();
  }

  /**
   * Process OCR job
   */
  private async processJob(job: Job) {
    const { contentId, batchId, jobId } = job.data;

    logger.info('Processing OCR job', { jobId, contentId, batchId });

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

      // Check if OCR service is available
      const isOCRAvailable = await this.ocrService.isAvailable();
      if (!isOCRAvailable) {
        logger.warn('OCR service not available, skipping OCR', { contentId });

        // Skip OCR and move to next stage
        const updatedContent = content.withStatus(ContentStatus.PENDING_CATEGORIZATION);
        await this.contentRepository.save(updatedContent);

        if (jobEntity) {
          await this.jobRepository.save(
            jobEntity.markAsCompleted({
              contentId,
              status: ContentStatus.PENDING_CATEGORIZATION,
              ocrSkipped: true,
            })
          );
        }

        // Queue categorization job
        await this.queueService.addCategorizationJob(contentId, batchId);

        logger.info('OCR job completed (skipped - service unavailable)', { jobId, contentId });

        return {
          success: true,
          contentId,
          status: ContentStatus.PENDING_CATEGORIZATION,
          ocrSkipped: true,
        };
      }

      // Check if content has images
      const imageUrls = content.media?.filter((m) => m.type === 'image').map((m) => m.url) || [];

      if (imageUrls.length === 0) {
        logger.info('No images found in content, skipping OCR', { contentId });

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

        logger.info('OCR job completed (no images)', { jobId, contentId });

        return {
          success: true,
          contentId,
          status: ContentStatus.PENDING_CATEGORIZATION,
          imagesCount: 0,
        };
      }

      // Extract text from all images
      logger.info(`Extracting text from ${imageUrls.length} images`, { contentId });
      const ocrResults = await this.ocrService.extractTextFromImages(imageUrls, {
        language: config.ocr.options.language,
      });

      // Filter results by confidence threshold
      const validResults = ocrResults.filter(
        (result) => result.confidence >= config.ocr.options.minConfidence
      );

      // Combine extracted text
      const extractedText = validResults
        .map((result) => result.text)
        .filter((text) => text && text.trim().length > 0)
        .join(' ');

      logger.info('OCR extraction completed', {
        contentId,
        imagesCount: imageUrls.length,
        validResults: validResults.length,
        extractedLength: extractedText.length,
      });

      // Update content with enhanced text
      let updatedContent = content;
      if (extractedText.length > 0) {
        // Append extracted text to existing content
        const enhancedText = content.text
          ? `${content.text}\n\n[Image text: ${extractedText}]`
          : `[Image text: ${extractedText}]`;

        updatedContent = content
          .withTextWithDescriptions(enhancedText)
          .withStatus(ContentStatus.PENDING_CATEGORIZATION);
      } else {
        // No valid text extracted, just update status
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
            extractedLength: extractedText.length,
            avgConfidence:
              validResults.length > 0
                ? validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length
                : 0,
          })
        );
      }

      // Queue categorization job
      await this.queueService.addCategorizationJob(contentId, batchId);

      logger.info('OCR job completed', {
        jobId,
        contentId,
        imagesProcessed: imageUrls.length,
        textExtracted: extractedText.length > 0,
      });

      return {
        success: true,
        contentId,
        status: ContentStatus.PENDING_CATEGORIZATION,
        imagesCount: imageUrls.length,
        extractedLength: extractedText.length,
      };
    } catch (error: any) {
      logger.error('OCR job failed', { jobId, contentId, error: error.message });

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
      logger.info('OCR job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('OCR job failed', { jobId: job?.id, error: err.message });
    });

    this.worker.on('error', (err) => {
      logger.error('OCR worker error', { error: err });
    });
  }

  /**
   * Close worker
   */
  async close() {
    await this.worker.close();
  }
}
