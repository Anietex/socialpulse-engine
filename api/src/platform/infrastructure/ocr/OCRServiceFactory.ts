/**
 * OCR Service Factory
 * Creates appropriate OCR service based on configuration
 */

import { IOCRService } from '../../domain/services/IOCRService';
import { OCRProvider } from '../../core/types/OCRProvider';
import { GoogleVisionOCRService } from './GoogleVisionOCRService';
import { TesseractOCRService } from './TesseractOCRService';
import { NoOpOCRService } from './NoOpOCRService';
import { config } from '../../../config/env';
import { logger } from '../../../config/logger';

/**
 * OCR Service Factory
 */
export class OCRServiceFactory {
  /**
   * Create OCR service based on provider
   */
  static create(provider: OCRProvider, options?: any): IOCRService {
    logger.info(`Creating OCR service with provider: ${provider}`);

    switch (provider) {
      case OCRProvider.GOOGLE_VISION:
        if (!options?.apiKey) {
          logger.warn('Google Vision API key not provided, falling back to Tesseract');
          return new TesseractOCRService(options?.workerPoolSize);
        }
        return new GoogleVisionOCRService(options.apiKey);

      case OCRProvider.TESSERACT:
        return new TesseractOCRService(options?.workerPoolSize);

      case OCRProvider.NONE:
      default:
        logger.info('OCR disabled - using NoOp service');
        return new NoOpOCRService();
    }
  }

  /**
   * Create OCR service from environment variables
   */
  static createFromEnv(): IOCRService {
    const provider = (config.ocr.provider || 'tesseract') as OCRProvider;

    logger.info(`Creating OCR service from environment: ${provider}`);

    const options = {
      apiKey: config.ocr.googleVision.apiKey,
      workerPoolSize: config.ocr.tesseract.workerPoolSize,
    };

    return this.create(provider, options);
  }
}
