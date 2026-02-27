import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Content Endpoints (API v1)', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('POST /api/v1/content/scrape', () => {
    it('should call scrapeContent controller', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/content/scrape')
        .send({ platform: 'twitter', url: 'https://twitter.com/user' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.content.scrapeContent).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/content/scrape-multiple', () => {
    it('should call scrapeMultiplePlatforms controller', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/content/scrape-multiple')
        .send({ platforms: ['twitter'] });
      expect(res.status).toBe(200);
      expect(ctx.controllers.content.scrapeMultiplePlatforms).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/content/:contentId', () => {
    it('should call getContentById controller', async () => {
      const res = await request(ctx.app).get('/api/v1/content/abc123');
      expect(res.status).toBe(200);
      expect(ctx.controllers.content.getContentById).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/content/by-stage/:status', () => {
    it('should call getContentByStage controller', async () => {
      const res = await request(ctx.app).get('/api/v1/content/by-stage/pending_categorization');
      expect(res.status).toBe(200);
      expect(ctx.controllers.content.getContentByStage).toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/content/status', () => {
    it('should call updateContentStatuses controller', async () => {
      const res = await request(ctx.app)
        .put('/api/v1/content/status')
        .send({ contentIds: ['id1'], status: 'engaged' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.content.updateContentStatuses).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/content/statistics', () => {
    it('should call getContentStatistics controller', async () => {
      const res = await request(ctx.app).get('/api/v1/content/statistics');
      expect(res.status).toBe(200);
      expect(ctx.controllers.content.getContentStatistics).toHaveBeenCalled();
    });
  });
});
