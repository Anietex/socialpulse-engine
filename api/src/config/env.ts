import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || 'localhost',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  database: {
    uri:
      process.env.NODE_ENV === 'test'
        ? process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/socialpulse-engine-test'
        : process.env.MONGODB_URI || 'mongodb://localhost:27017/socialpulse-engine',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-key',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  queue: {
    cleanup: {
      concurrency: parseInt(process.env.QUEUE_CLEANUP_CONCURRENCY || '5', 10),
    },
    ocr: {
      concurrency: parseInt(process.env.QUEUE_OCR_CONCURRENCY || '3', 10),
    },
    imageCaptioning: {
      concurrency: parseInt(process.env.QUEUE_IMAGE_CAPTIONING_CONCURRENCY || '3', 10),
    },
    categorization: {
      concurrency: parseInt(process.env.QUEUE_CATEGORIZATION_CONCURRENCY || '5', 10),
    },
    evaluation: {
      concurrency: parseInt(process.env.QUEUE_EVALUATION_CONCURRENCY || '5', 10),
    },
    automation: {
      concurrency: parseInt(process.env.QUEUE_AUTOMATION_CONCURRENCY || '2', 10),
    },
  },
  ocr: {
    provider: process.env.OCR_PROVIDER || 'tesseract', // 'tesseract' (default, local), 'google-vision' (cloud), 'none' (disabled)
    enabled: process.env.OCR_ENABLED !== 'false', // Enabled by default
    tesseract: {
      workerPoolSize: parseInt(process.env.OCR_TESSERACT_WORKERS || '2', 10),
    },
    googleVision: {
      apiKey: process.env.GOOGLE_VISION_API_KEY || '',
    },
    options: {
      language: process.env.OCR_LANGUAGE || 'eng',
      minConfidence: parseFloat(process.env.OCR_MIN_CONFIDENCE || '0.5'),
    },
  },
  imageCaptioning: {
    provider: process.env.IMAGE_CAPTIONING_PROVIDER || 'blip', // 'blip' (default, AI-powered local), 'simple' (basic local), 'google-vision', 'openai-vision', 'none' (disabled)
    enabled: process.env.IMAGE_CAPTIONING_ENABLED !== 'false', // Enabled by default
    googleVision: {
      apiKey: process.env.GOOGLE_VISION_API_KEY || '',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
    },
    options: {
      maxLength: parseInt(process.env.IMAGE_CAPTIONING_MAX_LENGTH || '100', 10),
      includeLabels: process.env.IMAGE_CAPTIONING_INCLUDE_LABELS !== 'false',
      includeObjects: process.env.IMAGE_CAPTIONING_INCLUDE_OBJECTS === 'true',
      minConfidence: parseFloat(process.env.IMAGE_CAPTIONING_MIN_CONFIDENCE || '0.5'),
    },
  },
};

export const isDevelopment = config.env === 'development';
export const isProduction = config.env === 'production';
export const isTest = config.env === 'test';
