import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Session Endpoints', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('GET /session/can-start', () => {
    it('should call canStartSession controller', async () => {
      const res = await request(ctx.app).get('/session/can-start');
      expect(res.status).toBe(200);
      expect(ctx.controllers.session.canStartSession).toHaveBeenCalled();
    });
  });

  describe('POST /session/reset', () => {
    it('should call resetSession controller', async () => {
      const res = await request(ctx.app).post('/session/reset');
      expect(res.status).toBe(200);
      expect(ctx.controllers.session.resetSession).toHaveBeenCalled();
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for GET /session/unknown', async () => {
      const res = await request(ctx.app).get('/session/unknown');
      expect(res.status).toBe(404);
    });
  });
});
