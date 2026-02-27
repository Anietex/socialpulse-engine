import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Image Captioning Endpoints', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('GET /image-captioning/status', () => {
    it('should call getStatus controller', async () => {
      const res = await request(ctx.app).get('/image-captioning/status');
      expect(res.status).toBe(200);
      expect(ctx.controllers.imageCaptioning.getStatus).toHaveBeenCalled();
    });
  });

  describe('POST /image-captioning/caption', () => {
    it('should call captionFromUrl controller', async () => {
      const res = await request(ctx.app)
        .post('/image-captioning/caption')
        .send({ imageUrl: 'https://example.com/photo.jpg' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.imageCaptioning.captionFromUrl).toHaveBeenCalled();
    });
  });

  describe('POST /image-captioning/caption-batch', () => {
    it('should call captionFromUrls controller', async () => {
      const res = await request(ctx.app)
        .post('/image-captioning/caption-batch')
        .send({
          imageUrls: ['https://example.com/a.jpg', 'https://example.com/b.jpg'],
          maxLength: 100,
        });
      expect(res.status).toBe(200);
      expect(ctx.controllers.imageCaptioning.captionFromUrls).toHaveBeenCalled();
    });
  });
});
