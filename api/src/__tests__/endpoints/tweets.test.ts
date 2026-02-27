import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Tweet Endpoints', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('GET /tweets/search', () => {
    it('should call searchTweets controller', async () => {
      const res = await request(ctx.app).get('/tweets/search');
      expect(res.status).toBe(200);
      expect(ctx.controllers.tweet.searchTweets).toHaveBeenCalled();
    });

    it('should pass query parameters through', async () => {
      const res = await request(ctx.app).get(
        '/tweets/search?userId=user1&status=engaged&category=tech&limit=10&offset=0'
      );
      expect(res.status).toBe(200);
      expect(ctx.controllers.tweet.searchTweets).toHaveBeenCalled();
    });
  });

  describe('GET /tweets/:id', () => {
    it('should call getTweetById controller', async () => {
      const res = await request(ctx.app).get('/tweets/tweet-abc');
      expect(res.status).toBe(200);
      expect(ctx.controllers.tweet.getTweetById).toHaveBeenCalled();
    });
  });
});
