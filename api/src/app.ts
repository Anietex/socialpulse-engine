import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { requestLogger } from './middleware/requestLogger.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes.js';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';
import { metrics } from './observability/metrics.js';
import { ApplicationContainer } from './platform/application/ApplicationContainer.js';
import { createPlatformApiRouter } from './platform/api/routes/index.js';
import { createAuthRoutes } from './platform/api/routes/auth.routes.js';
import { createIngestionRoutes } from './platform/api/routes/ingestion.routes.js';
import { createSessionRoutes } from './platform/api/routes/session.routes.js';
import { createAdminRoutes } from './platform/api/routes/admin.routes.js';
import { createAnalyticsRoutes } from './platform/api/routes/analytics.routes.js';
import { createUserRoutes } from './platform/api/routes/user.routes.js';
import { createTweetRoutes } from './platform/api/routes/tweet.routes.js';
import { createOCRRoutes } from './platform/api/routes/ocr.routes.js';
import { createImageCaptioningRoutes } from './platform/api/routes/image-captioning.routes.js';
import healthRoutes from './health/health.routes.js';

// Initialize application container
const appContainer = new ApplicationContainer();

export const createApp = (): Application => {
  const app = express();

  // Store container for cleanup
  app.set('appContainer', appContainer);

  // CRITICAL: Handle Private Network Access BEFORE any other middleware
  // This must run first to handle Chrome's PNA preflight requests
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
      'https://x.com',
      'https://twitter.com',
      'https://xbuilder.test',
      'http://localhost:3000',
      config.cors.origin,
    ];

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      // Handle Private Network Access for Chrome extensions accessing localhost
      if (req.headers['access-control-request-private-network']) {
        res.setHeader('Access-Control-Allow-Private-Network', 'true');
      }

      // Handle OPTIONS preflight requests immediately
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
    }

    next();
  });

  // Security middleware (after PNA handling)
  app.use(
    helmet({
      crossOriginResourcePolicy: false, // Disable to allow Chrome extension access
    })
  );

  // CORS configuration - Allow Chrome extension from x.com and localhost
  app.use(
    cors({
      origin: [
        'https://x.com',
        'https://twitter.com',
        'https://xbuilder.test',
        'http://localhost:3000',
        config.cors.origin,
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  app.use(requestLogger);

  // Metrics instrumentation
  app.use(metricsMiddleware);

  // Rate limiting
  app.use(rateLimiter);

  // Prometheus metrics endpoint
  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', metrics.getContentType());
    res.send(await metrics.getMetrics());
  });

  // Health check endpoints (mounted early for Kubernetes probes)
  app.use('/', healthRoutes);

  // API routes
  app.use('/api', routes);

  // Auth routes (no version prefix)
  const authRouter = createAuthRoutes(appContainer.getAuthController());
  app.use('/auth', authRouter);

  // Ingestion routes (no version prefix - for Chrome extension)
  const ingestionRouter = createIngestionRoutes(appContainer.getIngestionController());
  app.use('/ingestion', ingestionRouter);

  // Session routes (no version prefix - for Chrome extension)
  const sessionRouter = createSessionRoutes(appContainer.getSessionController());
  app.use('/session', sessionRouter);

  // Admin routes (Bull Board queue monitoring)
  const adminRouter = createAdminRoutes();
  app.use('/admin', adminRouter);

  // Analytics routes
  const analyticsRouter = createAnalyticsRoutes(appContainer.getAnalyticsController());
  app.use('/analytics', analyticsRouter);

  // User management routes (requires auth)
  const userRouter = createUserRoutes(appContainer.getUserController());
  app.use('/users', userRouter);

  // Tweet search routes
  const tweetRouter = createTweetRoutes(appContainer.getTweetController());
  app.use('/tweets', tweetRouter);

  // OCR test routes
  const ocrRouter = createOCRRoutes(appContainer.getOCRController());
  app.use('/ocr', ocrRouter);

  // Image Captioning test routes
  const imageCaptioningRouter = createImageCaptioningRoutes(
    appContainer.getImageCaptioningController()
  );
  app.use('/image-captioning', imageCaptioningRouter);

  // Platform API routes (v1)
  const platformRouter = createPlatformApiRouter(
    appContainer.getContentController(),
    appContainer.getAutomationController(),
    appContainer.getPlatformController()
  );
  app.use('/api/v1', platformRouter);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  logger.info('Express application configured successfully');
  logger.info('Health check endpoints mounted at /health, /readiness, /liveness');
  logger.info('Auth routes mounted at /auth');
  logger.info('Ingestion routes mounted at /ingestion');
  logger.info('Session routes mounted at /session');
  logger.info('Admin routes (Bull Board) mounted at /admin/queues');
  logger.info('Analytics routes mounted at /analytics');
  logger.info('User routes mounted at /users');
  logger.info('Tweet routes mounted at /tweets');
  logger.info('OCR test routes mounted at /ocr');
  logger.info('Platform API routes mounted at /api/v1');

  return app;
};

// Export application container for cleanup
export { appContainer };
