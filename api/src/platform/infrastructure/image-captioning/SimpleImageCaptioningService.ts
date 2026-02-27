/**
 * Simple Image Captioning Service
 * Provides basic placeholder captions locally without AI models
 * Useful for development and when advanced captioning is not needed
 */

import { IImageCaptioningService } from '../../domain/services/IImageCaptioningService';
import {
  ImageCaptionResult,
  ImageCaptioningOptions,
  CaptioningProvider,
} from '../../core/types/ImageCaptioningProvider';
import { logger } from '../../../config/logger';
import axios from 'axios';

/**
 * Simple Image Captioning Service
 * Generates basic captions based on image metadata
 */
export class SimpleImageCaptioningService implements IImageCaptioningService {
  constructor() {
    logger.info('Initializing Simple Image Captioning Service');
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return CaptioningProvider.SIMPLE;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  /**
   * Caption single image from URL
   */
  async captionImage(
    imageUrl: string,
    options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult> {
    logger.info(`Generating simple caption for image: ${imageUrl}`);

    try {
      // Download image to get metadata
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
      });

      const buffer = Buffer.from(response.data);
      return await this.captionImageBuffer(buffer, options);
    } catch (error: any) {
      logger.error('Simple captioning failed:', error);
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
    logger.info(`Generating simple captions for ${imageUrls.length} images`);

    // Process all images in parallel
    const results = await Promise.all(imageUrls.map((url) => this.captionImage(url, options)));

    return results;
  }

  /**
   * Caption image from buffer
   */
  async captionImageBuffer(
    buffer: Buffer,
    _options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult> {
    logger.info('Generating simple caption from buffer');

    try {
      // Get basic image info
      const imageType = this.detectImageType(buffer);
      const imageSize = buffer.length;

      // Generate basic caption
      const sizeKB = Math.round(imageSize / 1024);
      const caption = `Image (${imageType}, ${sizeKB}KB)`;

      // Basic labels based on image type
      const labels = this.generateBasicLabels(imageType);

      return {
        caption,
        confidence: 0.5, // Low confidence for simple captions
        labels,
        metadata: {
          colors: [],
        },
      };
    } catch (error: any) {
      logger.error('Simple captioning failed:', error);
      throw new Error(`Image captioning failed: ${error.message}`);
    }
  }

  /**
   * Detect image type from buffer
   */
  private detectImageType(buffer: Buffer): string {
    // Check magic numbers
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'JPEG';
    if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'PNG';
    if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'GIF';
    if (buffer[0] === 0x52 && buffer[1] === 0x49) return 'WEBP';

    return 'Unknown';
  }

  /**
   * Generate basic labels
   */
  private generateBasicLabels(imageType: string): string[] {
    const labels = ['image', 'visual content'];

    switch (imageType.toLowerCase()) {
      case 'jpeg':
      case 'jpg':
        labels.push('photo');
        break;
      case 'png':
        labels.push('graphic', 'screenshot');
        break;
      case 'gif':
        labels.push('animation', 'gif');
        break;
      case 'webp':
        labels.push('web image');
        break;
    }

    return labels;
  }
}
