/**
 * Image Captioning Service Factory
 * Creates appropriate captioning service based on configuration
 */

import { IImageCaptioningService } from '../../domain/services/IImageCaptioningService';
import { CaptioningProvider } from '../../core/types/ImageCaptioningProvider';
import { BLIPImageCaptioningService } from './BLIPImageCaptioningService';
import { SimpleImageCaptioningService } from './SimpleImageCaptioningService';
import { GoogleVisionCaptioningService } from './GoogleVisionCaptioningService';
import { OpenAIVisionCaptioningService } from './OpenAIVisionCaptioningService';
import { NoOpImageCaptioningService } from './NoOpImageCaptioningService';
import { config } from '../../../config/env';
import { logger } from '../../../config/logger';

/**
 * Image Captioning Service Factory
 */
export class ImageCaptioningServiceFactory {
  /**
   * Create captioning service based on provider
   */
  static create(provider: CaptioningProvider, options?: any): IImageCaptioningService {
    logger.info(`Creating image captioning service with provider: ${provider}`);

    switch (provider) {
      case CaptioningProvider.BLIP:
        return new BLIPImageCaptioningService();

      case CaptioningProvider.GOOGLE_VISION:
        if (!options?.googleVisionApiKey) {
          logger.warn('Google Vision API key not provided, falling back to BLIP');
          return new BLIPImageCaptioningService();
        }
        return new GoogleVisionCaptioningService(options.googleVisionApiKey);

      case CaptioningProvider.OPENAI_VISION:
        if (!options?.openaiApiKey) {
          logger.warn('OpenAI API key not provided, falling back to BLIP');
          return new BLIPImageCaptioningService();
        }
        return new OpenAIVisionCaptioningService(options.openaiApiKey);

      case CaptioningProvider.SIMPLE:
        return new SimpleImageCaptioningService();

      case CaptioningProvider.NONE:
      default:
        logger.info('Image captioning disabled - using NoOp service');
        return new NoOpImageCaptioningService();
    }
  }

  /**
   * Create captioning service from environment variables
   */
  static createFromEnv(): IImageCaptioningService {
    const provider = (config.imageCaptioning.provider || 'blip') as CaptioningProvider;

    logger.info(`Creating image captioning service from environment: ${provider}`);

    const options = {
      googleVisionApiKey: config.imageCaptioning.googleVision.apiKey,
      openaiApiKey: config.imageCaptioning.openai.apiKey,
    };

    return this.create(provider, options);
  }
}
