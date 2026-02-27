import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Automation Endpoints (API v1)', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('POST /api/v1/automation/execute', () => {
    it('should call executeAutomation controller', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/automation/execute')
        .send({ platform: 'twitter' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.automation.executeAutomation).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/automation/execute-multiple', () => {
    it('should call executeMultiPlatformAutomation controller', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/automation/execute-multiple')
        .send({ platforms: ['twitter'] });
      expect(res.status).toBe(200);
      expect(ctx.controllers.automation.executeMultiPlatformAutomation).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/automation/execute-action', () => {
    it('should call executeActionBatch controller', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/automation/execute-action')
        .send({ actionType: 'LIKE' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.automation.executeActionBatch).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/automation/preview', () => {
    it('should call previewAutomation controller', async () => {
      const res = await request(ctx.app).get('/api/v1/automation/preview');
      expect(res.status).toBe(200);
      expect(ctx.controllers.automation.previewAutomation).toHaveBeenCalled();
    });
  });
});
