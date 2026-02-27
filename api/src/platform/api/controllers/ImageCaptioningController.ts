/**
 * Image Captioning Controller
 * Provides test endpoints for image captioning service
 */

import { Request, Response, NextFunction } from 'express';
import { IImageCaptioningService } from '../../domain/services/IImageCaptioningService';
import { logger } from '../../../config/logger';

/**
 * Image Captioning Controller
 * Test endpoints for image captioning functionality
 */
export class ImageCaptioningController {
  constructor(private readonly captioningService: IImageCaptioningService) {}

  /**
   * Get captioning service status
   */
  getStatus = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const isAvailable = await this.captioningService.isAvailable();
      const provider = this.captioningService.getProviderName();

      res.json({
        success: true,
        provider,
        available: isAvailable,
        message: `Image captioning service (${provider}) is ${isAvailable ? 'available' : 'not available'}`,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Caption single image from URL
   */
  captionFromUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { imageUrl, maxLength, includeLabels, includeObjects } = req.body;

      if (!imageUrl) {
        res.status(400).json({
          success: false,
          error: 'imageUrl is required',
        });
        return;
      }

      logger.info('Captioning image from URL', { imageUrl });

      const result = await this.captioningService.captionImage(imageUrl, {
        maxLength,
        includeLabels,
        includeObjects,
      });

      res.json({
        success: true,
        provider: this.captioningService.getProviderName(),
        result,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Caption multiple images from URLs
   */
  captionFromUrls = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { imageUrls, maxLength, includeLabels, includeObjects } = req.body;

      if (!imageUrls || !Array.isArray(imageUrls)) {
        res.status(400).json({
          success: false,
          error: 'imageUrls array is required',
        });
        return;
      }

      logger.info('Captioning multiple images', { count: imageUrls.length });

      const results = await this.captioningService.captionImages(imageUrls, {
        maxLength,
        includeLabels,
        includeObjects,
      });

      res.json({
        success: true,
        provider: this.captioningService.getProviderName(),
        count: results.length,
        results,
      });
    } catch (error) {
      next(error);
    }
  };
}
