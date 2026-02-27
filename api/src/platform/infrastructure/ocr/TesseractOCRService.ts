/**
 * Tesseract OCR Service
 * Uses Tesseract.js for 100% local OCR processing
 * No third-party API calls - everything runs on your server
 */

import { IOCRService } from '../../domain/services/IOCRService';
import { OCRResult, OCROptions, OCRProvider, TextBlock } from '../../core/types/OCRProvider';
import { logger } from '../../../config/logger';
import axios from 'axios';
import * as Tesseract from 'tesseract.js';

/**
 * Tesseract OCR Service Implementation
 * Completely local - no external API dependencies
 */
export class TesseractOCRService implements IOCRService {
  private workerPool: Tesseract.Scheduler | null = null;
  private readonly poolSize: number;

  constructor(poolSize: number = 2) {
    this.poolSize = poolSize;
    logger.info(`Initializing Tesseract OCR Service with ${poolSize} workers`);
  }

  /**
   * Initialize worker pool for better performance
   */
  private async initializeWorkerPool(): Promise<void> {
    if (this.workerPool) return;

    try {
      logger.info('Creating Tesseract worker pool...');
      this.workerPool = Tesseract.createScheduler();

      // Create multiple workers for parallel processing
      const workers = [];
      for (let i = 0; i < this.poolSize; i++) {
        const worker = await Tesseract.createWorker('eng', 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.debug(`Tesseract worker ${i}: ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        this.workerPool.addWorker(worker);
        workers.push(worker);
      }

      logger.info(`Tesseract worker pool initialized with ${this.poolSize} workers`);
    } catch (error) {
      logger.error('Failed to initialize Tesseract worker pool:', error);
      this.workerPool = null;
      throw error;
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return OCRProvider.TESSERACT;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Try to initialize worker pool
      await this.initializeWorkerPool();
      return this.workerPool !== null;
    } catch (error) {
      logger.error('Tesseract not available:', error);
      return false;
    }
  }

  /**
   * Extract text from image URL
   */
  async extractTextFromImage(imageUrl: string, options?: OCROptions): Promise<OCRResult> {
    logger.info(`Extracting text from image using Tesseract: ${imageUrl}`);

    try {
      // Download image
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);

      return await this.extractTextFromBuffer(buffer, options);
    } catch (error: any) {
      logger.error('Tesseract OCR failed:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from multiple images using worker pool
   */
  async extractTextFromImages(imageUrls: string[], options?: OCROptions): Promise<OCRResult[]> {
    logger.info(`Extracting text from ${imageUrls.length} images using Tesseract (parallel)`);

    // Ensure worker pool is initialized
    await this.initializeWorkerPool();

    // Process all images in parallel using worker pool
    const results = await Promise.all(
      imageUrls.map((url) => this.extractTextFromImage(url, options))
    );

    return results;
  }

  /**
   * Extract text from image buffer
   */
  async extractTextFromBuffer(buffer: Buffer, options?: OCROptions): Promise<OCRResult> {
    logger.info('Extracting text from image buffer using Tesseract');

    // Ensure worker pool is initialized
    await this.initializeWorkerPool();

    if (!this.workerPool) {
      throw new Error('Tesseract worker pool not initialized');
    }

    try {
      const result = await this.workerPool.addJob('recognize', buffer);

      // Parse text blocks
      const blocks: TextBlock[] = [];
      if (result.data.words) {
        for (const word of result.data.words) {
          blocks.push({
            text: word.text,
            confidence: word.confidence / 100,
            boundingBox: {
              x: word.bbox.x0,
              y: word.bbox.y0,
              width: word.bbox.x1 - word.bbox.x0,
              height: word.bbox.y1 - word.bbox.y0,
            },
            type: 'WORD',
          });
        }
      }

      return {
        text: result.data.text.trim(),
        confidence: result.data.confidence / 100, // Tesseract returns 0-100
        language: options?.language || 'eng',
        blocks,
      };
    } catch (error: any) {
      logger.error('Tesseract OCR failed:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Cleanup worker pool
   */
  async terminate(): Promise<void> {
    if (this.workerPool) {
      logger.info('Terminating Tesseract worker pool...');
      await this.workerPool.terminate();
      this.workerPool = null;
      logger.info('Tesseract worker pool terminated');
    }
  }
}
