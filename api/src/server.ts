import { createApp, appContainer } from './app.js';
import { config } from './config/env.js';
import { logger } from './config/logger.js';
import { connectDatabase, disconnectDatabase } from './shared/database/mongodb.js';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase(config.database.uri);
    logger.info('MongoDB connected successfully');

    // Create Express app (with ApplicationContainer)
    const app = createApp();

    // Start server
    const server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on http://${config.host}:${config.port}`);
      logger.info(`Health check available at http://${config.host}:${config.port}/api/health`);
      logger.info(`Platform API available at http://${config.host}:${config.port}/api/v1`);
      logger.info(`\nPlatform API Endpoints:`);
      logger.info(`  - GET  /api/v1/content`);
      logger.info(`  - POST /api/v1/content`);
      logger.info(`  - GET  /api/v1/automation/start`);
      logger.info(`  - GET  /api/v1/platforms`);
      logger.info(`  - GET  /api/v1/platforms/health`);
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

const server = await startServer();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`);

  // Close server
  server.close(async () => {
    logger.info('HTTP server closed');

    // Cleanup application container
    await appContainer.cleanup();

    // Disconnect from MongoDB
    await disconnectDatabase();

    logger.info('All connections closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1);
});

export default server;
