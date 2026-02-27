/**
 * No-Op Image Captioning Service
 * Used when image captioning is disabled
 */

import { IImageCaptioningService } from '../../domain/services/IImageCaptioningService';
import {
  ImageCaptionResult,
  ImageCaptioningOptions,
  CaptioningProvider,
} from '../../core/types/ImageCaptioningProvider';
import { logger } from '../../../config/logger';

/**
 * No-Op Image Captioning Service
 * Returns empty captions when captioning is disabled
 */
export class NoOpImageCaptioningService implements IImageCaptioningService {
  constructor() {
    logger.info('Image captioning is disabled (NoOp service)');
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return CaptioningProvider.NONE;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    return false;
  }

  /**
   * Caption single image (no-op)
   */
  async captionImage(
    _imageUrl: string,
    _options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult> {
    logger.warn('Image captioning is disabled');

    return {
      caption: '',
      confidence: 0,
      labels: [],
    };
  }

  /**
   * Caption multiple images (no-op)
   */
  async captionImages(
    imageUrls: string[],
    _options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult[]> {
    logger.warn('Image captioning is disabled');

    return imageUrls.map(() => ({
      caption: '',
      confidence: 0,
      labels: [],
    }));
  }

  /**
   * Caption image from buffer (no-op)
   */
  async captionImageBuffer(
    _buffer: Buffer,
    _options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult> {
    logger.warn('Image captioning is disabled');

    return {
      caption: '',
      confidence: 0,
      labels: [],
    };
  }
}
