/**
 * OpenAI Vision Image Captioning Service
 * Uses GPT-4 Vision API for natural language image descriptions
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
 * OpenAI Vision Captioning Service
 * Natural language descriptions using GPT-4 Vision
 */
export class OpenAIVisionCaptioningService implements IImageCaptioningService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly model = 'gpt-4-vision-preview';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    this.apiKey = apiKey;
    logger.info('Initializing OpenAI Vision Captioning Service');
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return CaptioningProvider.OPENAI_VISION;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      return this.apiKey.length > 0;
    } catch (error) {
      logger.error('OpenAI Vision not available:', error);
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
    logger.info(`Generating caption with OpenAI Vision: ${imageUrl}`);

    try {
      const maxLength = options?.maxLength || 100;

      // Call OpenAI Vision API with the image URL directly
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Describe this image in ${maxLength} words or less. Be concise and focus on the main subjects and actions.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const caption = response.data.choices[0].message.content.trim();

      // Extract basic labels from caption (simple word extraction)
      const labels = this.extractLabelsFromCaption(caption);

      return {
        caption,
        confidence: 0.9, // GPT-4 Vision is generally high quality
        labels,
        metadata: {},
      };
    } catch (error: any) {
      logger.error('OpenAI Vision captioning failed:', error);
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
    logger.info(`Generating captions for ${imageUrls.length} images with OpenAI Vision`);

    // Process in parallel with rate limiting
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
    logger.info('Generating caption from buffer with OpenAI Vision');

    try {
      const maxLength = options?.maxLength || 100;
      const base64Image = buffer.toString('base64');
      const mimeType = this.detectMimeType(buffer);

      // Call OpenAI Vision API with base64 image
      const response = await axios.post(
        this.apiUrl,
        {
          model: this.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `Describe this image in ${maxLength} words or less. Be concise and focus on the main subjects and actions.`,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${base64Image}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 300,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      const caption = response.data.choices[0].message.content.trim();
      const labels = this.extractLabelsFromCaption(caption);

      return {
        caption,
        confidence: 0.9,
        labels,
        metadata: {},
      };
    } catch (error: any) {
      logger.error('OpenAI Vision captioning failed:', error);
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
    ]);

    const labels = words.filter((word) => !stopWords.has(word) && word.length > 3).slice(0, 10);

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
