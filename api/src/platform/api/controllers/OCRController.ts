/**
 * OCR Controller
 * Handles OCR test endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { IOCRService } from '../../domain/services/IOCRService';
import { logger } from '../../../config/logger';

/**
 * OCR Controller
 * Provides endpoints for testing OCR functionality
 */
export class OCRController {
  constructor(private readonly ocrService: IOCRService) {}

  /**
   * Test OCR on a single image URL
   * POST /ocr/extract
   */
  extractFromUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { imageUrl, language } = req.body;

      if (!imageUrl) {
        res.status(400).json({ error: 'imageUrl is required' });
        return;
      }

      logger.info(`OCR extraction requested for: ${imageUrl}`);

      const result = await this.ocrService.extractTextFromImage(imageUrl, {
        language,
      });

      res.json({
        success: true,
        provider: this.ocrService.getProviderName(),
        result,
      });
    } catch (error: any) {
      logger.error('OCR extraction failed:', error);
      next(error);
    }
  };

  /**
   * Test OCR on multiple image URLs
   * POST /ocr/extract-batch
   */
  extractFromUrls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { imageUrls, language } = req.body;

      if (!imageUrls || !Array.isArray(imageUrls)) {
        res.status(400).json({ error: 'imageUrls array is required' });
        return;
      }

      logger.info(`OCR batch extraction requested for ${imageUrls.length} images`);

      const results = await this.ocrService.extractTextFromImages(imageUrls, {
        language,
      });

      res.json({
        success: true,
        provider: this.ocrService.getProviderName(),
        count: results.length,
        results,
      });
    } catch (error: any) {
      logger.error('OCR batch extraction failed:', error);
      next(error);
    }
  };

  /**
   * Check OCR service status
   * GET /ocr/status
   */
  getStatus = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isAvailable = await this.ocrService.isAvailable();
      const provider = this.ocrService.getProviderName();

      res.json({
        success: true,
        provider,
        available: isAvailable,
        message: isAvailable
          ? `OCR service (${provider}) is available`
          : `OCR service (${provider}) is not available`,
      });
    } catch (error: any) {
      logger.error('OCR status check failed:', error);
      next(error);
    }
  };

  /**
   * Test OCR on content media
   * POST /ocr/test-content
   * Extracts text from all images in a content entity
   */
  testContentOCR = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // This would fetch content from repository and extract from its media
      // For now, just a placeholder
      res.json({
        success: true,
        message: 'Content OCR extraction not yet implemented in pipeline',
      });
    } catch (error: any) {
      logger.error('Content OCR test failed:', error);
      next(error);
    }
  };
}
