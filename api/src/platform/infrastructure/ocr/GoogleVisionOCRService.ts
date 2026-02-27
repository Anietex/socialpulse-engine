/**
 * Google Vision OCR Service
 * Uses Google Cloud Vision API for text extraction
 */

import { IOCRService } from '../../domain/services/IOCRService';
import { OCRResult, OCROptions, TextBlock, OCRProvider } from '../../core/types/OCRProvider';
import { logger } from '../../../config/logger';
import axios from 'axios';

/**
 * Google Vision OCR Service Implementation
 */
export class GoogleVisionOCRService implements IOCRService {
  private apiKey: string;
  private endpoint = 'https://vision.googleapis.com/v1/images:annotate';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return OCRProvider.GOOGLE_VISION;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    if (!this.apiKey || this.apiKey === '') {
      return false;
    }

    try {
      // Simple test with a minimal request
      const response = await axios.post(
        `${this.endpoint}?key=${this.apiKey}`,
        {
          requests: [
            {
              image: { content: Buffer.from('test').toString('base64') },
              features: [{ type: 'TEXT_DETECTION', maxResults: 1 }],
            },
          ],
        },
        { timeout: 5000 }
      );

      return response.status === 200;
    } catch (error) {
      logger.warn('Google Vision API not available:', error);
      return false;
    }
  }

  /**
   * Extract text from image URL
   */
  async extractTextFromImage(imageUrl: string, options?: OCROptions): Promise<OCRResult> {
    logger.info(`Extracting text from image: ${imageUrl}`);

    try {
      const response = await axios.post(`${this.endpoint}?key=${this.apiKey}`, {
        requests: [
          {
            image: { source: { imageUri: imageUrl } },
            features: [{ type: 'TEXT_DETECTION' }],
            imageContext: options?.language ? { languageHints: [options.language] } : undefined,
          },
        ],
      });

      const result = response.data.responses[0];

      if (result.error) {
        throw new Error(`Google Vision API error: ${result.error.message}`);
      }

      return this.parseGoogleVisionResponse(result);
    } catch (error: any) {
      logger.error('Google Vision OCR failed:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from multiple images
   */
  async extractTextFromImages(imageUrls: string[], options?: OCROptions): Promise<OCRResult[]> {
    logger.info(`Extracting text from ${imageUrls.length} images`);

    const requests = imageUrls.map((url) => ({
      image: { source: { imageUri: url } },
      features: [{ type: 'TEXT_DETECTION' }],
      imageContext: options?.language ? { languageHints: [options.language] } : undefined,
    }));

    try {
      const response = await axios.post(`${this.endpoint}?key=${this.apiKey}`, {
        requests,
      });

      return response.data.responses.map((result: any) => {
        if (result.error) {
          logger.warn(`Google Vision error for image:`, result.error);
          return { text: '', confidence: 0 };
        }
        return this.parseGoogleVisionResponse(result);
      });
    } catch (error: any) {
      logger.error('Batch OCR extraction failed:', error);
      throw new Error(`Batch OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from image buffer
   */
  async extractTextFromBuffer(buffer: Buffer, options?: OCROptions): Promise<OCRResult> {
    logger.info('Extracting text from image buffer');

    try {
      const base64Image = buffer.toString('base64');

      const response = await axios.post(`${this.endpoint}?key=${this.apiKey}`, {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION' }],
            imageContext: options?.language ? { languageHints: [options.language] } : undefined,
          },
        ],
      });

      const result = response.data.responses[0];

      if (result.error) {
        throw new Error(`Google Vision API error: ${result.error.message}`);
      }

      return this.parseGoogleVisionResponse(result);
    } catch (error: any) {
      logger.error('Google Vision OCR failed:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Parse Google Vision API response
   */
  private parseGoogleVisionResponse(response: any): OCRResult {
    if (!response.textAnnotations || response.textAnnotations.length === 0) {
      return {
        text: '',
        confidence: 0,
      };
    }

    // First annotation is the full text
    const fullText = response.textAnnotations[0];

    // Remaining annotations are individual blocks/words
    const blocks: TextBlock[] = response.textAnnotations.slice(1).map((annotation: any) => ({
      text: annotation.description,
      confidence: annotation.confidence || 0.9, // Google Vision doesn't always provide confidence
      boundingBox: this.parseBoundingBox(annotation.boundingPoly),
      type: this.determineBlockType(annotation.description),
    }));

    return {
      text: fullText.description,
      confidence: fullText.confidence || 0.9,
      language: response.textAnnotations[0].locale,
      blocks,
    };
  }

  /**
   * Parse bounding box from Google Vision polygon
   */
  private parseBoundingBox(boundingPoly: any): any {
    if (!boundingPoly || !boundingPoly.vertices) {
      return undefined;
    }

    const vertices = boundingPoly.vertices;
    const x = Math.min(...vertices.map((v: any) => v.x || 0));
    const y = Math.min(...vertices.map((v: any) => v.y || 0));
    const maxX = Math.max(...vertices.map((v: any) => v.x || 0));
    const maxY = Math.max(...vertices.map((v: any) => v.y || 0));

    return {
      x,
      y,
      width: maxX - x,
      height: maxY - y,
    };
  }

  /**
   * Determine block type based on text content
   */
  private determineBlockType(text: string): 'LINE' | 'WORD' | 'PARAGRAPH' {
    if (text.includes(' ') && text.length > 50) {
      return 'PARAGRAPH';
    } else if (text.includes(' ')) {
      return 'LINE';
    } else {
      return 'WORD';
    }
  }
}
