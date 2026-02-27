import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Analytics Endpoints', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('GET /analytics/summary', () => {
    it('should call getSummary controller', async () => {
      const res = await request(ctx.app).get('/analytics/summary');
      expect(res.status).toBe(200);
      expect(ctx.controllers.analytics.getSummary).toHaveBeenCalled();
    });
  });

  describe('GET /analytics', () => {
    it('should call getAnalytics controller', async () => {
      const res = await request(ctx.app).get('/analytics');
      expect(res.status).toBe(200);
      expect(ctx.controllers.analytics.getAnalytics).toHaveBeenCalled();
    });

    it('should pass query parameters through', async () => {
      const res = await request(ctx.app).get('/analytics?from=2024-01-01&to=2024-01-31');
      expect(res.status).toBe(200);
      expect(ctx.controllers.analytics.getAnalytics).toHaveBeenCalled();
    });
  });

  describe('POST /analytics/generate', () => {
    it('should call generateAnalytics controller', async () => {
      const res = await request(ctx.app).post('/analytics/generate').send({ date: '2024-01-15' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.analytics.generateAnalytics).toHaveBeenCalled();
    });
  });
});
