import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('OCR Endpoints', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('POST /ocr/extract', () => {
    it('should call extractFromUrl controller', async () => {
      const res = await request(ctx.app)
        .post('/ocr/extract')
        .send({ imageUrl: 'https://example.com/img.png' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.ocr.extractFromUrl).toHaveBeenCalled();
    });
  });

  describe('POST /ocr/extract-batch', () => {
    it('should call extractFromUrls controller', async () => {
      const res = await request(ctx.app)
        .post('/ocr/extract-batch')
        .send({ imageUrls: ['https://example.com/a.png', 'https://example.com/b.png'] });
      expect(res.status).toBe(200);
      expect(ctx.controllers.ocr.extractFromUrls).toHaveBeenCalled();
    });
  });

  describe('GET /ocr/status', () => {
    it('should call getStatus controller', async () => {
      const res = await request(ctx.app).get('/ocr/status');
      expect(res.status).toBe(200);
      expect(ctx.controllers.ocr.getStatus).toHaveBeenCalled();
    });
  });

  describe('POST /ocr/test-content', () => {
    it('should call testContentOCR controller', async () => {
      const res = await request(ctx.app)
        .post('/ocr/test-content')
        .send({ contentId: 'content-123' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.ocr.testContentOCR).toHaveBeenCalled();
    });
  });
});
