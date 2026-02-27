/**
 * Google Vision Image Captioning Service
 * Uses Google Cloud Vision API for advanced image analysis
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
 * Google Vision Captioning Service
 * High-quality image analysis using Google Cloud Vision API
 */
export class GoogleVisionCaptioningService implements IImageCaptioningService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://vision.googleapis.com/v1/images:annotate';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('Google Vision API key is required');
    }
    this.apiKey = apiKey;
    logger.info('Initializing Google Vision Captioning Service');
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return CaptioningProvider.GOOGLE_VISION;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Simple check - just verify API key is set
      return this.apiKey.length > 0;
    } catch (error) {
      logger.error('Google Vision not available:', error);
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
    logger.info(`Generating caption with Google Vision: ${imageUrl}`);

    try {
      // Download image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
      });

      const buffer = Buffer.from(response.data);
      return await this.captionImageBuffer(buffer, options);
    } catch (error: any) {
      logger.error('Google Vision captioning failed:', error);
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
    logger.info(`Generating captions for ${imageUrls.length} images with Google Vision`);

    // Process in parallel
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
    logger.info('Generating caption from buffer with Google Vision');

    try {
      const base64Image = buffer.toString('base64');

      // Build feature requests
      const features = [{ type: 'LABEL_DETECTION', maxResults: 10 }, { type: 'IMAGE_PROPERTIES' }];

      if (options?.includeObjects) {
        features.push({ type: 'OBJECT_LOCALIZATION', maxResults: 10 });
      }

      // Call Google Vision API
      const response = await axios.post(
        `${this.apiUrl}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: {
                content: base64Image,
              },
              features,
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = response.data.responses[0];

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Extract labels
      const labels = result.labelAnnotations?.map((label: any) => label.description) || [];

      // Generate caption from top labels
      const topLabels = labels.slice(0, 5);
      const caption = this.generateCaptionFromLabels(topLabels);

      // Extract confidence (average of top labels)
      const avgConfidence =
        result.labelAnnotations?.length > 0
          ? result.labelAnnotations
              .slice(0, 5)
              .reduce((sum: number, label: any) => sum + label.score, 0) / 5
          : 0.5;

      // Extract objects if available
      const objects = result.localizedObjectAnnotations?.map((obj: any) => ({
        name: obj.name,
        confidence: obj.score,
      }));

      // Extract dominant colors
      const colors =
        result.imagePropertiesAnnotation?.dominantColors?.colors
          ?.slice(0, 3)
          .map((color: any) =>
            this.rgbToHex(color.color.red, color.color.green, color.color.blue)
          ) || [];

      return {
        caption,
        confidence: avgConfidence,
        labels,
        metadata: {
          objects,
          colors,
        },
      };
    } catch (error: any) {
      logger.error('Google Vision captioning failed:', error);
      throw new Error(`Image captioning failed: ${error.message}`);
    }
  }

  /**
   * Generate caption from labels
   */
  private generateCaptionFromLabels(labels: string[]): string {
    if (labels.length === 0) {
      return 'Image content';
    }

    if (labels.length === 1) {
      return `Image showing ${labels[0]}`;
    }

    if (labels.length === 2) {
      return `Image showing ${labels[0]} and ${labels[1]}`;
    }

    const mainLabels = labels.slice(0, 2).join(', ');
    return `Image showing ${mainLabels}`;
  }

  /**
   * Convert RGB to hex color
   */
  private rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.round(x).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
    );
  }
}
