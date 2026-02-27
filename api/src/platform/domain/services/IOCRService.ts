/**
 * OCR Service Interface (Port)
 * Defines contract for OCR implementations
 */

import { OCRResult, OCROptions } from '../../core/types/OCRProvider';

/**
 * OCR Service Interface
 * Extracts text from images using various OCR providers
 */
export interface IOCRService {
  /**
   * Extract text from a single image URL
   */
  extractTextFromImage(imageUrl: string, options?: OCROptions): Promise<OCRResult>;

  /**
   * Extract text from multiple image URLs
   */
  extractTextFromImages(imageUrls: string[], options?: OCROptions): Promise<OCRResult[]>;

  /**
   * Extract text from image buffer
   */
  extractTextFromBuffer(buffer: Buffer, options?: OCROptions): Promise<OCRResult>;

  /**
   * Check if OCR service is available
   */
  isAvailable(): Promise<boolean>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}
