import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Auth Endpoints', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('POST /auth/register', () => {
    const validBody = {
      email: 'user@example.com',
      password: 'Password1',
      name: 'Test User',
    };

    it('should pass valid registration to controller', async () => {
      const res = await request(ctx.app).post('/auth/register').send(validBody);
      expect(res.status).toBe(200);
      expect(ctx.controllers.auth.register).toHaveBeenCalled();
    });

    it('should reject invalid email', async () => {
      const res = await request(ctx.app)
        .post('/auth/register')
        .send({ ...validBody, email: 'not-an-email' });
      expect(res.status).toBe(422);
      expect(ctx.controllers.auth.register).not.toHaveBeenCalled();
    });

    it('should reject weak password', async () => {
      const res = await request(ctx.app)
        .post('/auth/register')
        .send({ ...validBody, password: 'weak' });
      expect(res.status).toBe(422);
    });

    it('should reject missing name', async () => {
      const res = await request(ctx.app)
        .post('/auth/register')
        .send({ email: 'user@example.com', password: 'Password1' });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /auth/login', () => {
    it('should pass valid login to controller', async () => {
      const res = await request(ctx.app)
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'password' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.auth.login).toHaveBeenCalled();
    });

    it('should reject missing password', async () => {
      const res = await request(ctx.app).post('/auth/login').send({ email: 'user@example.com' });
      expect(res.status).toBe(422);
    });

    it('should reject invalid email format', async () => {
      const res = await request(ctx.app)
        .post('/auth/login')
        .send({ email: 'bad', password: 'password' });
      expect(res.status).toBe(422);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should pass valid refresh to controller', async () => {
      const res = await request(ctx.app)
        .post('/auth/refresh')
        .send({ refreshToken: 'some-token-value' });
      expect(res.status).toBe(200);
      expect(ctx.controllers.auth.refresh).toHaveBeenCalled();
    });

    it('should reject missing refresh token', async () => {
      const res = await request(ctx.app).post('/auth/refresh').send({});
      expect(res.status).toBe(422);
    });
  });

  describe('GET /auth/me', () => {
    it('should call me controller with authenticated user', async () => {
      const res = await request(ctx.app).get('/auth/me');
      expect(res.status).toBe(200);
      expect(ctx.controllers.auth.me).toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('should call logout controller', async () => {
      const res = await request(ctx.app).post('/auth/logout');
      expect(res.status).toBe(200);
      expect(ctx.controllers.auth.logout).toHaveBeenCalled();
    });
  });
});
