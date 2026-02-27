/**
 * Image Captioning Routes
 * Test endpoints for image captioning service
 */

import { Router } from 'express';
import { ImageCaptioningController } from '../controllers/ImageCaptioningController';

/**
 * Create image captioning routes
 */
export function createImageCaptioningRoutes(controller: ImageCaptioningController): Router {
  const router = Router();

  /**
   * GET /image-captioning/status
   * Check if image captioning service is available
   */
  router.get('/status', controller.getStatus);

  /**
   * POST /image-captioning/caption
   * Generate caption for a single image URL
   *
   * Body:
   * {
   *   "imageUrl": "https://example.com/image.jpg",
   *   "maxLength": 100,
   *   "includeLabels": true,
   *   "includeObjects": false
   * }
   */
  router.post('/caption', controller.captionFromUrl);

  /**
   * POST /image-captioning/caption-batch
   * Generate captions for multiple image URLs
   *
   * Body:
   * {
   *   "imageUrls": [
   *     "https://example.com/image1.jpg",
   *     "https://example.com/image2.jpg"
   *   ],
   *   "maxLength": 100,
   *   "includeLabels": true
   * }
   */
  router.post('/caption-batch', controller.captionFromUrls);

  return router;
}
