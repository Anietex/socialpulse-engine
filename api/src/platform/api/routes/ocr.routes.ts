/**
 * OCR API Routes
 * Test endpoints for OCR functionality
 */

import { Router } from 'express';
import { OCRController } from '../controllers/OCRController';

/**
 * Create OCR routes
 */
export function createOCRRoutes(controller: OCRController): Router {
  const router = Router();

  /**
   * POST /ocr/extract
   * Extract text from a single image URL
   */
  router.post('/extract', (req, res, next) => controller.extractFromUrl(req, res, next));

  /**
   * POST /ocr/extract-batch
   * Extract text from multiple image URLs
   */
  router.post('/extract-batch', (req, res, next) => controller.extractFromUrls(req, res, next));

  /**
   * GET /ocr/status
   * Check OCR service status
   */
  router.get('/status', (req, res, next) => controller.getStatus(req, res, next));

  /**
   * POST /ocr/test-content
   * Test OCR on content entity media
   */
  router.post('/test-content', (req, res, next) => controller.testContentOCR(req, res, next));

  return router;
}
