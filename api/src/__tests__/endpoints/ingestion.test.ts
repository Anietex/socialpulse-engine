import request from 'supertest';
import { createTestApp, TestAppContext } from './helpers/test-app';

describe('Ingestion Endpoints', () => {
  let ctx: TestAppContext;

  beforeEach(() => {
    ctx = createTestApp();
  });

  describe('POST /ingestion/tweets', () => {
    const validBody = {
      tweets: [
        {
          injectedId: 'tweet-123',
          text: 'Hello world',
          user: { name: 'John', handle: '@john' },
        },
      ],
    };

    it('should pass valid tweet ingestion to controller', async () => {
      const res = await request(ctx.app).post('/ingestion/tweets').send(validBody);
      expect(res.status).toBe(200);
      expect(ctx.controllers.ingestion.ingestTweets).toHaveBeenCalled();
    });

    it('should accept tweets with full media payload', async () => {
      const body = {
        tweets: [
          {
            injectedId: 'tweet-456',
            text: 'Media tweet',
            user: { name: 'Jane', handle: '@jane', avatar: 'https://example.com/avatar.jpg' },
            url: 'https://twitter.com/jane/status/456',
            media: {
              images: [
                'https://example.com/img.jpg',
                { url: 'https://example.com/img2.jpg', alt: 'alt text' },
              ],
              videos: ['https://example.com/video.mp4'],
            },
            metrics: { likes: 10, replies: 2, reposts: 5, views: 100 },
            scrapedAt: new Date().toISOString(),
          },
        ],
        userId: 'user-123',
      };
      const res = await request(ctx.app).post('/ingestion/tweets').send(body);
      expect(res.status).toBe(200);
    });

    it('should reject empty tweets array is allowed (empty array)', async () => {
      const res = await request(ctx.app).post('/ingestion/tweets').send({ tweets: [] });
      expect(res.status).toBe(200);
    });

    it('should reject tweet without injectedId', async () => {
      const body = {
        tweets: [{ text: 'no id', user: { name: 'A', handle: '@a' } }],
      };
      const res = await request(ctx.app).post('/ingestion/tweets').send(body);
      expect(res.status).toBe(422);
    });

    it('should reject tweet without user handle', async () => {
      const body = {
        tweets: [{ injectedId: 'x', text: 'test', user: { name: 'A' } }],
      };
      const res = await request(ctx.app).post('/ingestion/tweets').send(body);
      expect(res.status).toBe(422);
    });
  });

  describe('GET /ingestion/stats', () => {
    it('should call getStats controller', async () => {
      const res = await request(ctx.app).get('/ingestion/stats');
      expect(res.status).toBe(200);
      expect(ctx.controllers.ingestion.getStats).toHaveBeenCalled();
    });
  });
});
