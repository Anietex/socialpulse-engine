/**
 * No-Op OCR Service
 * Returns empty results when OCR is disabled
 */

import { IOCRService } from '../../domain/services/IOCRService';
import { OCRResult, OCROptions, OCRProvider } from '../../core/types/OCRProvider';
import { logger } from '../../../config/logger';

/**
 * No-Op OCR Service
 * Used when OCR is disabled or no provider is configured
 */
export class NoOpOCRService implements IOCRService {
  /**
   * Get provider name
   */
  getProviderName(): string {
    return OCRProvider.NONE;
  }

  /**
   * Check if service is available
   */
  async isAvailable(): Promise<boolean> {
    return true; // Always available (does nothing)
  }

  /**
   * Extract text from image URL (returns empty)
   */
  async extractTextFromImage(_imageUrl: string, _options?: OCROptions): Promise<OCRResult> {
    logger.debug('OCR is disabled - returning empty result');
    return {
      text: '',
      confidence: 0,
    };
  }

  /**
   * Extract text from multiple images (returns empty)
   */
  async extractTextFromImages(imageUrls: string[], _options?: OCROptions): Promise<OCRResult[]> {
    logger.debug(`OCR is disabled - returning ${imageUrls.length} empty results`);
    return imageUrls.map(() => ({
      text: '',
      confidence: 0,
    }));
  }

  /**
   * Extract text from buffer (returns empty)
   */
  async extractTextFromBuffer(_buffer: Buffer, _options?: OCROptions): Promise<OCRResult> {
    logger.debug('OCR is disabled - returning empty result');
    return {
      text: '',
      confidence: 0,
    };
  }
}
