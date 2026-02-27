/**
 * BLIP Image Captioning Service
 * Uses Transformers.js with BLIP model for 100% local AI-powered image captioning
 * No external API calls - everything runs on your server
 */

import { IImageCaptioningService } from '../../domain/services/IImageCaptioningService';
import {
  ImageCaptionResult,
  ImageCaptioningOptions,
  CaptioningProvider,
} from '../../core/types/ImageCaptioningProvider';
import { logger } from '../../../config/logger';
import axios from 'axios';
import { pipeline, env as transformersEnv } from '@xenova/transformers';

// Configure Transformers.js to cache models locally
transformersEnv.cacheDir = './.cache/transformers';

/**
 * BLIP Image Captioning Service
 * 100% local AI-powered image captioning using BLIP model
 */
export class BLIPImageCaptioningService implements IImageCaptioningService {
  private captioner: any = null;
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    logger.info('Initializing BLIP Image Captioning Service (Transformers.js)');
  }

  /**
   * Lazy-load the BLIP model
   * First time: Downloads ~400MB model (cached for future use)
   * Subsequent runs: Loads from cache instantly
   */
  private async initializeModel(): Promise<void> {
    // If already initialized, return immediately
    if (this.isInitialized) {
      return;
    }

    // If initialization is in progress, wait for it
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // Start initialization
    this.initializationPromise = (async () => {
      try {
        logger.info('Loading BLIP model (this may take a moment on first run)...');
        const startTime = Date.now();

        // Load BLIP image-to-text model
        this.captioner = await pipeline('image-to-text', 'Xenova/blip-image-captioning-base');

        const loadTime = Date.now() - startTime;
        logger.info(`BLIP model loaded successfully in ${loadTime}ms`);

        this.isInitialized = true;
      } catch (error: any) {
        logger.error('Failed to initialize BLIP model:', error);
        throw new Error(`BLIP model initialization failed: ${error.message}`);
      }
    })();

    return this.initializationPromise;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return CaptioningProvider.BLIP;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this.initializeModel();
      return true;
    } catch (error) {
      logger.error('BLIP service not available:', error);
      return false;
    }
  }

  /**
   * Caption single image from URL
   */
  async captionImage(
    imageUrl: string,
    options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult> {
    logger.info(`Generating caption with BLIP: ${imageUrl}`);

    try {
      // Ensure model is loaded
      await this.initializeModel();

      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
      });

      const buffer = Buffer.from(response.data);
      return await this.captionImageBuffer(buffer, options);
    } catch (error: any) {
      logger.error('BLIP captioning failed:', error);
      throw new Error(`Image captioning failed: ${error.message}`);
    }
  }

  /**
   * Caption multiple images
   */
  async captionImages(
    imageUrls: string[],
    options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult[]> {
    logger.info(`Generating captions for ${imageUrls.length} images with BLIP`);

    // Ensure model is loaded once before processing all images
    await this.initializeModel();

    // Process all images in parallel
    const results = await Promise.all(imageUrls.map((url) => this.captionImage(url, options)));

    return results;
  }

  /**
   * Caption image from buffer
   */
  async captionImageBuffer(
    buffer: Buffer,
    options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult> {
    logger.info('Generating caption from buffer with BLIP');

    try {
      // Ensure model is loaded
      await this.initializeModel();

      if (!this.captioner) {
        throw new Error('BLIP model not initialized');
      }

      // Convert buffer to base64 data URL
      const mimeType = this.detectMimeType(buffer);
      const base64Image = buffer.toString('base64');
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // Generate caption using BLIP
      const result = await this.captioner(dataUrl, {
        max_new_tokens: options?.maxLength || 50,
      });

      // Extract caption from result
      const caption = result[0]?.generated_text || '';

      // Extract labels from caption (simple word extraction)
      const labels = options?.includeLabels ? this.extractLabelsFromCaption(caption) : [];

      logger.info('BLIP caption generated', {
        captionLength: caption.length,
        labelsCount: labels.length,
      });

      return {
        caption,
        confidence: 0.85, // BLIP is generally high quality
        labels,
        metadata: {},
      };
    } catch (error: any) {
      logger.error('BLIP captioning failed:', error);
      throw new Error(`Image captioning failed: ${error.message}`);
    }
  }

  /**
   * Extract labels from caption text
   */
  private extractLabelsFromCaption(caption: string): string[] {
    // Simple extraction: get nouns and key phrases
    const words = caption.toLowerCase().match(/\b[a-z]+\b/g) || [];

    // Filter out common words and keep potential labels
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'in',
      'on',
      'at',
      'to',
      'of',
      'with',
      'and',
      'or',
      'this',
      'that',
      'there',
      'here',
    ]);

    const labels = words.filter((word) => !stopWords.has(word) && word.length > 2).slice(0, 10);

    return [...new Set(labels)]; // Remove duplicates
  }

  /**
   * Detect MIME type from buffer
   */
  private detectMimeType(buffer: Buffer): string {
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'image/png';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'image/gif';
    if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'image/webp';

    return 'image/jpeg'; // Default
  }
}
