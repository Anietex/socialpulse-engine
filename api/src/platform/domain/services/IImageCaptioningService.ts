/**
 * Image Captioning Service Interface
 * Port for image captioning implementations
 */

import {
  ImageCaptionResult,
  ImageCaptioningOptions,
} from '../../core/types/ImageCaptioningProvider';

/**
 * Image Captioning Service Interface
 * Generates captions/descriptions for images
 */
export interface IImageCaptioningService {
  /**
   * Generate caption for a single image URL
   */
  captionImage(imageUrl: string, options?: ImageCaptioningOptions): Promise<ImageCaptionResult>;

  /**
   * Generate captions for multiple images
   */
  captionImages(
    imageUrls: string[],
    options?: ImageCaptioningOptions
  ): Promise<ImageCaptionResult[]>;

  /**
   * Generate caption from image buffer
   */
  captionImageBuffer(buffer: Buffer, options?: ImageCaptioningOptions): Promise<ImageCaptionResult>;

  /**
   * Check if service is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
