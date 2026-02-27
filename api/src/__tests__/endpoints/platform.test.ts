import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Platform Endpoints (API v1)', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('GET /api/v1/platforms', () => {
    it('should call getRegisteredPlatforms controller', async () => {
      const res = await request(ctx.app).get('/api/v1/platforms');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.getRegisteredPlatforms).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/platforms/health', () => {
    it('should call checkPlatformHealth controller', async () => {
      const res = await request(ctx.app).get('/api/v1/platforms/health');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.checkPlatformHealth).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/platforms/capabilities', () => {
    it('should call getAllPlatformCapabilities controller', async () => {
      const res = await request(ctx.app).get('/api/v1/platforms/capabilities');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.getAllPlatformCapabilities).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/platforms/statistics', () => {
    it('should call getPlatformStatistics controller', async () => {
      const res = await request(ctx.app).get('/api/v1/platforms/statistics');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.getPlatformStatistics).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/platforms/:platformId/browser/init', () => {
    it('should call initializeBrowserSession controller', async () => {
      const res = await request(ctx.app).post('/api/v1/platforms/twitter/browser/init');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.initializeBrowserSession).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/platforms/:platformId/browser/close', () => {
    it('should call closeBrowserSession controller', async () => {
      const res = await request(ctx.app).post('/api/v1/platforms/twitter/browser/close');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.closeBrowserSession).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/platforms/browser/close-all', () => {
    it('should call closeAllBrowserSessions controller', async () => {
      const res = await request(ctx.app).post('/api/v1/platforms/browser/close-all');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.closeAllBrowserSessions).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/platforms/:platformId/browser/restart', () => {
    it('should call restartBrowserSession controller', async () => {
      const res = await request(ctx.app).post('/api/v1/platforms/twitter/browser/restart');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.restartBrowserSession).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/platforms/:platformId/auth/authenticate', () => {
    it('should call authenticatePlatform controller', async () => {
      const res = await request(ctx.app).post('/api/v1/platforms/twitter/auth/authenticate');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.authenticatePlatform).toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/platforms/:platformId/auth/status', () => {
    it('should call checkAuthenticationStatus controller', async () => {
      const res = await request(ctx.app).get('/api/v1/platforms/twitter/auth/status');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.checkAuthenticationStatus).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/platforms/:platformId/auth/logout', () => {
    it('should call logoutPlatform controller', async () => {
      const res = await request(ctx.app).post('/api/v1/platforms/twitter/auth/logout');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.logoutPlatform).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/platforms/:platformId/auth/save', () => {
    it('should call saveAuthenticationState controller', async () => {
      const res = await request(ctx.app).post('/api/v1/platforms/twitter/auth/save');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.saveAuthenticationState).toHaveBeenCalled();
    });
  });

  describe('POST /api/v1/platforms/:platformId/auth/load', () => {
    it('should call loadAuthenticationState controller', async () => {
      const res = await request(ctx.app).post('/api/v1/platforms/twitter/auth/load');
      expect(res.status).toBe(200);
      expect(ctx.controllers.platform.loadAuthenticationState).toHaveBeenCalled();
    });
  });
});
