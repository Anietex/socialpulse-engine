import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('User Endpoints', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('GET /users', () => {
    it('should call getUsers controller (requires auth)', async () => {
      const res = await request(ctx.app).get('/users');
      expect(res.status).toBe(200);
      expect(ctx.controllers.user.getUsers).toHaveBeenCalled();
    });
  });

  describe('GET /users/:id', () => {
    it('should call getUserById controller', async () => {
      const res = await request(ctx.app).get('/users/user-123');
      expect(res.status).toBe(200);
      expect(ctx.controllers.user.getUserById).toHaveBeenCalled();
    });
  });

  describe('PUT /users/:id', () => {
    it('should call updateUser controller', async () => {
      const res = await request(ctx.app).put('/users/user-123').send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.user.updateUser).toHaveBeenCalled();
    });
  });

  describe('PUT /users/:id/settings', () => {
    it('should call updateSettings controller', async () => {
      const res = await request(ctx.app).put('/users/user-123/settings').send({ theme: 'dark' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.user.updateSettings).toHaveBeenCalled();
    });
  });

  describe('DELETE /users/:id', () => {
    it('should call deleteUser controller', async () => {
      const res = await request(ctx.app).delete('/users/user-123');
      expect(res.status).toBe(200);
      expect(ctx.controllers.user.deleteUser).toHaveBeenCalled();
    });
  });

  describe('GET /users/:id/stats', () => {
    it('should call getUserStats controller', async () => {
      const res = await request(ctx.app).get('/users/user-123/stats');
      expect(res.status).toBe(200);
      expect(ctx.controllers.user.getUserStats).toHaveBeenCalled();
    });
  });
});
