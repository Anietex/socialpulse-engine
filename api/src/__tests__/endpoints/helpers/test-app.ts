/**
 * Test App Factory
 * Creates a lightweight Express app for endpoint testing.
 * Avoids ApplicationContainer (MongoDB), health routes (Redis),
 * and admin routes (BullMQ) - instead uses mock controllers.
 *
 * Routes that use `authenticate` middleware (auth, users) are defined
 * inline here with a passthrough auth mock, avoiding the module-scope
 * MongoUserRepository import in the real authenticate middleware.
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import { validate } from '../../../middleware/validation';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
} from '../../../platform/api/validators/auth.validation';
import { ingestTweetsSchema } from '../../../platform/api/validators/ingestion.validation';
import type { MockControllerMap } from './mock-controllers';
import {
  createMockAuthController,
  createMockIngestionController,
  createMockSessionController,
  createMockAnalyticsController,
  createMockUserController,
  createMockTweetController,
  createMockContentController,
  createMockAutomationController,
  createMockPlatformController,
  createMockOCRController,
  createMockImageCaptioningController,
} from './mock-controllers';

/**
 * Passthrough auth middleware for tests
 */
const mockAuthenticate = (req: Request, _res: Response, next: NextFunction) => {
  req.user = {
    _id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    status: 'active',
  };
  next();
};

export interface TestAppContext {
  app: Application;
  controllers: {
    auth: MockControllerMap;
    ingestion: MockControllerMap;
    session: MockControllerMap;
    analytics: MockControllerMap;
    user: MockControllerMap;
    tweet: MockControllerMap;
    content: MockControllerMap;
    automation: MockControllerMap;
    platform: MockControllerMap;
    ocr: MockControllerMap;
    imageCaptioning: MockControllerMap;
  };
}

export function createTestApp(): TestAppContext {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const controllers = {
    auth: createMockAuthController(),
    ingestion: createMockIngestionController(),
    session: createMockSessionController(),
    analytics: createMockAnalyticsController(),
    user: createMockUserController(),
    tweet: createMockTweetController(),
    content: createMockContentController(),
    automation: createMockAutomationController(),
    platform: createMockPlatformController(),
    ocr: createMockOCRController(),
    imageCaptioning: createMockImageCaptioningController(),
  };

  // === Auth routes (inline to avoid importing authenticate middleware) ===
  const authRouter = express.Router();
  authRouter.post('/register', validate(registerSchema), (req, res, next) =>
    controllers.auth.register(req, res, next)
  );
  authRouter.post('/login', validate(loginSchema), (req, res, next) =>
    controllers.auth.login(req, res, next)
  );
  authRouter.post('/refresh', validate(refreshTokenSchema), (req, res, next) =>
    controllers.auth.refresh(req, res, next)
  );
  authRouter.get('/me', mockAuthenticate, (req, res, next) => controllers.auth.me(req, res, next));
  authRouter.post('/logout', mockAuthenticate, (req, res, next) =>
    controllers.auth.logout(req, res, next)
  );
  app.use('/auth', authRouter);

  // === Ingestion routes (inline for validation) ===
  const ingestionRouter = express.Router();
  ingestionRouter.post('/tweets', validate(ingestTweetsSchema), (req, res, next) =>
    controllers.ingestion.ingestTweets(req, res, next)
  );
  ingestionRouter.get('/stats', (req, res, next) => controllers.ingestion.getStats(req, res, next));
  app.use('/ingestion', ingestionRouter);

  // === Session routes ===
  const sessionRouter = express.Router();
  sessionRouter.get('/can-start', (req, res, next) =>
    controllers.session.canStartSession(req, res, next)
  );
  sessionRouter.post('/reset', (req, res, next) =>
    controllers.session.resetSession(req, res, next)
  );
  app.use('/session', sessionRouter);

  // === Analytics routes ===
  const analyticsRouter = express.Router();
  analyticsRouter.get('/summary', (req, res, next) =>
    controllers.analytics.getSummary(req, res, next)
  );
  analyticsRouter.get('/', (req, res, next) => controllers.analytics.getAnalytics(req, res, next));
  analyticsRouter.post('/generate', (req, res, next) =>
    controllers.analytics.generateAnalytics(req, res, next)
  );
  app.use('/analytics', analyticsRouter);

  // === User routes (inline to avoid importing authenticate middleware) ===
  const userRouter = express.Router();
  userRouter.use(mockAuthenticate);
  userRouter.get('/', (req, res, next) => controllers.user.getUsers(req, res, next));
  userRouter.get('/:id', (req, res, next) => controllers.user.getUserById(req, res, next));
  userRouter.put('/:id', (req, res, next) => controllers.user.updateUser(req, res, next));
  userRouter.put('/:id/settings', (req, res, next) =>
    controllers.user.updateSettings(req, res, next)
  );
  userRouter.delete('/:id', (req, res, next) => controllers.user.deleteUser(req, res, next));
  userRouter.get('/:id/stats', (req, res, next) => controllers.user.getUserStats(req, res, next));
  app.use('/users', userRouter);

  // === Tweet routes ===
  const tweetRouter = express.Router();
  tweetRouter.get('/search', (req, res, next) => controllers.tweet.searchTweets(req, res, next));
  tweetRouter.get('/:id', (req, res, next) => controllers.tweet.getTweetById(req, res, next));
  app.use('/tweets', tweetRouter);

  // === OCR routes ===
  const ocrRouter = express.Router();
  ocrRouter.post('/extract', (req, res, next) => controllers.ocr.extractFromUrl(req, res, next));
  ocrRouter.post('/extract-batch', (req, res, next) =>
    controllers.ocr.extractFromUrls(req, res, next)
  );
  ocrRouter.get('/status', (req, res, next) => controllers.ocr.getStatus(req, res, next));
  ocrRouter.post('/test-content', (req, res, next) =>
    controllers.ocr.testContentOCR(req, res, next)
  );
  app.use('/ocr', ocrRouter);

  // === Image captioning routes ===
  const imageCaptioningRouter = express.Router();
  imageCaptioningRouter.get('/status', (req, res, next) =>
    controllers.imageCaptioning.getStatus(req, res, next)
  );
  imageCaptioningRouter.post('/caption', (req, res, next) =>
    controllers.imageCaptioning.captionFromUrl(req, res, next)
  );
  imageCaptioningRouter.post('/caption-batch', (req, res, next) =>
    controllers.imageCaptioning.captionFromUrls(req, res, next)
  );
  app.use('/image-captioning', imageCaptioningRouter);

  // === Platform API (v1) sub-routers ===
  const platformApiRouter = express.Router();

  // Content routes
  const contentRouter = express.Router();
  contentRouter.post('/scrape', (req, res, next) =>
    controllers.content.scrapeContent(req, res, next)
  );
  contentRouter.post('/scrape-multiple', (req, res, next) =>
    controllers.content.scrapeMultiplePlatforms(req, res, next)
  );
  contentRouter.get('/statistics', (req, res, next) =>
    controllers.content.getContentStatistics(req, res, next)
  );
  contentRouter.get('/by-stage/:status', (req, res, next) =>
    controllers.content.getContentByStage(req, res, next)
  );
  contentRouter.put('/status', (req, res, next) =>
    controllers.content.updateContentStatuses(req, res, next)
  );
  contentRouter.get('/:contentId', (req, res, next) =>
    controllers.content.getContentById(req, res, next)
  );
  platformApiRouter.use('/content', contentRouter);

  // Automation routes
  const automationRouter = express.Router();
  automationRouter.post('/execute', (req, res, next) =>
    controllers.automation.executeAutomation(req, res, next)
  );
  automationRouter.post('/execute-multiple', (req, res, next) =>
    controllers.automation.executeMultiPlatformAutomation(req, res, next)
  );
  automationRouter.post('/execute-action', (req, res, next) =>
    controllers.automation.executeActionBatch(req, res, next)
  );
  automationRouter.get('/preview', (req, res, next) =>
    controllers.automation.previewAutomation(req, res, next)
  );
  platformApiRouter.use('/automation', automationRouter);

  // Platform routes
  const platformRouter = express.Router();
  platformRouter.get('/', (req, res, next) =>
    controllers.platform.getRegisteredPlatforms(req, res, next)
  );
  platformRouter.get('/health', (req, res, next) =>
    controllers.platform.checkPlatformHealth(req, res, next)
  );
  platformRouter.get('/capabilities', (req, res, next) =>
    controllers.platform.getAllPlatformCapabilities(req, res, next)
  );
  platformRouter.get('/statistics', (req, res, next) =>
    controllers.platform.getPlatformStatistics(req, res, next)
  );
  platformRouter.post('/:platformId/browser/init', (req, res, next) =>
    controllers.platform.initializeBrowserSession(req, res, next)
  );
  platformRouter.post('/:platformId/browser/close', (req, res, next) =>
    controllers.platform.closeBrowserSession(req, res, next)
  );
  platformRouter.post('/browser/close-all', (req, res, next) =>
    controllers.platform.closeAllBrowserSessions(req, res, next)
  );
  platformRouter.post('/:platformId/browser/restart', (req, res, next) =>
    controllers.platform.restartBrowserSession(req, res, next)
  );
  platformRouter.post('/:platformId/auth/authenticate', (req, res, next) =>
    controllers.platform.authenticatePlatform(req, res, next)
  );
  platformRouter.get('/:platformId/auth/status', (req, res, next) =>
    controllers.platform.checkAuthenticationStatus(req, res, next)
  );
  platformRouter.post('/:platformId/auth/logout', (req, res, next) =>
    controllers.platform.logoutPlatform(req, res, next)
  );
  platformRouter.post('/:platformId/auth/save', (req, res, next) =>
    controllers.platform.saveAuthenticationState(req, res, next)
  );
  platformRouter.post('/:platformId/auth/load', (req, res, next) =>
    controllers.platform.loadAuthenticationState(req, res, next)
  );
  platformApiRouter.use('/platforms', platformRouter);

  app.use('/api/v1', platformApiRouter);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: { message: 'Route not found', status: 404, path: req.path },
    });
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.statusCode || 500;
    res.status(status).json({
      success: false,
      error: { message: err.message, code: err.code, status },
    });
  });

  return { app, controllers };
}
