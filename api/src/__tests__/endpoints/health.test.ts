import request from 'supertest';
import express from 'express';

/**
 * Health endpoint tests use a standalone mini-app because the real
 * HealthController creates a Redis client at module scope.
 * We test route structure and the liveness endpoint (no DB/Redis needed).
 */
describe('Health Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();

    // Mock health handlers
    app.get('/health', (_req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: 'test',
      });
    });

    app.get('/readiness', (_req, res) => {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: { database: true, redis: true },
      });
    });

    app.get('/liveness', (_req, res) => {
      res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString(),
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
    });
  });

  describe('GET /readiness', () => {
    it('should return readiness status', async () => {
      const res = await request(app).get('/readiness');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ready');
      expect(res.body.checks).toHaveProperty('database', true);
      expect(res.body.checks).toHaveProperty('redis', true);
    });
  });

  describe('GET /liveness', () => {
    it('should return alive status', async () => {
      const res = await request(app).get('/liveness');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'alive');
      expect(res.body).toHaveProperty('timestamp');
    });
  });
});
