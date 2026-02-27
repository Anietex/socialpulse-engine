/**
 * Application Container
 * Dependency Injection container for wiring up all platform dependencies
 */

import { MongoContentRepository } from '../infrastructure/persistence/MongoContentRepository.js';
import { MongoUserRepository } from '../infrastructure/persistence/MongoUserRepository.js';
import { MongoTweetRepository } from '../infrastructure/persistence/MongoTweetRepository.js';
import { MongoBatchRepository } from '../infrastructure/persistence/MongoBatchRepository.js';
import { MongoSessionStateRepository } from '../infrastructure/persistence/MongoSessionStateRepository.js';
import { MongoJobRepository } from '../infrastructure/persistence/MongoJobRepository.js';
import { MongoAnalyticsRepository } from '../infrastructure/persistence/MongoAnalyticsRepository.js';
import { ContentService } from '../domain/services/ContentService.js';
import { ContentOrchestrationService } from './services/ContentOrchestrationService.js';
import { PlatformService } from './services/PlatformService.js';
import { AutomationOrchestrator } from './services/AutomationOrchestrator.js';
import { AuthenticationService } from './services/AuthenticationService.js';
import { IngestionService } from './services/IngestionService.js';
import { SessionService } from './services/SessionService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import { QueueService } from '../infrastructure/queue/QueueService.js';
import { WorkerManager } from '../infrastructure/queue/WorkerManager.js';
import { LLMProvider } from '../infrastructure/llm/LLMProvider.js';
import { ILLMService } from '../core/interfaces/ILLMService.js';
import { PlatformRegistry } from '../infrastructure/registry/PlatformRegistry.js';
import { BrowserProvider } from '../infrastructure/browser/BrowserProvider.js';
import { ContentController } from '../api/controllers/ContentController.js';
import { AutomationController } from '../api/controllers/AutomationController.js';
import { PlatformController } from '../api/controllers/PlatformController.js';
import { AuthController } from '../api/controllers/AuthController.js';
import { IngestionController } from '../api/controllers/IngestionController.js';
import { SessionController } from '../api/controllers/SessionController.js';
import { AnalyticsController } from '../api/controllers/AnalyticsController.js';
import { UserController } from '../api/controllers/UserController.js';
import { TweetController } from '../api/controllers/TweetController.js';
import { OCRController } from '../api/controllers/OCRController.js';
import { IOCRService } from '../domain/services/IOCRService.js';
import { OCRServiceFactory } from '../infrastructure/ocr/OCRServiceFactory.js';
import { ImageCaptioningController } from '../api/controllers/ImageCaptioningController.js';
import { IImageCaptioningService } from '../domain/services/IImageCaptioningService.js';
import { ImageCaptioningServiceFactory } from '../infrastructure/image-captioning/ImageCaptioningServiceFactory.js';
import { logger } from '../../config/logger.js';

/**
 * Application Container
 * Initializes and wires all dependencies
 */
export class ApplicationContainer {
  // Repositories
  private contentRepository: MongoContentRepository;
  private userRepository: MongoUserRepository;
  private tweetRepository: MongoTweetRepository;
  private batchRepository: MongoBatchRepository;
  private sessionStateRepository: MongoSessionStateRepository;
  private jobRepository: MongoJobRepository;
  private analyticsRepository: MongoAnalyticsRepository;

  // Domain Services
  private contentService: ContentService;

  // Infrastructure
  private llmService: ILLMService | null = null;
  private ocrService: IOCRService;
  private imageCaptioningService: IImageCaptioningService;
  private platformRegistry: PlatformRegistry;
  private browserProvider: BrowserProvider;

  // Application Services
  private contentOrchestrationService: ContentOrchestrationService;
  private platformService: PlatformService;
  private authenticationService: AuthenticationService;
  private ingestionService: IngestionService;
  private sessionService: SessionService;
  private analyticsService: AnalyticsService;
  private queueService: QueueService;
  private automationOrchestrator: AutomationOrchestrator;

  // Workers
  private workerManager: WorkerManager;

  // Controllers
  private contentController: ContentController;
  private automationController: AutomationController;
  private platformController: PlatformController;
  private authController: AuthController;
  private ingestionController: IngestionController;
  private sessionController: SessionController;
  private analyticsController: AnalyticsController;
  private userController: UserController;
  private tweetController: TweetController;
  private ocrController: OCRController;
  private imageCaptioningController: ImageCaptioningController;

  constructor() {
    logger.info('Initializing Application Container...');

    // Initialize repositories
    this.contentRepository = new MongoContentRepository();
    this.userRepository = new MongoUserRepository();
    this.tweetRepository = new MongoTweetRepository();
    this.batchRepository = new MongoBatchRepository();
    this.sessionStateRepository = new MongoSessionStateRepository();
    this.jobRepository = new MongoJobRepository();
    this.analyticsRepository = new MongoAnalyticsRepository();

    // Initialize domain services
    this.contentService = new ContentService(this.contentRepository);

    // Initialize infrastructure
    this.platformRegistry = new PlatformRegistry();
    this.browserProvider = new BrowserProvider();

    // Initialize LLM service (optional) - auto-selects provider based on environment
    try {
      this.llmService = LLMProvider.createFromEnvironment();
      if (this.llmService) {
        logger.info('LLM service initialized successfully');
        // Check health asynchronously
        this.llmService.getHealth().then((health) => {
          logger.info('LLM service health check', health);
        });
      } else {
        logger.warn('LLM service not available - continuing without AI features');
      }
    } catch (error) {
      logger.warn('LLM service initialization failed - continuing without AI features', { error });
      this.llmService = null;
    }

    // Initialize OCR service (optional) - auto-selects provider based on environment
    this.ocrService = OCRServiceFactory.createFromEnv();
    logger.info(`OCR service initialized: ${this.ocrService.getProviderName()}`);
    // Check availability asynchronously
    this.ocrService.isAvailable().then((available) => {
      if (available) {
        logger.info(`OCR service (${this.ocrService.getProviderName()}) is available`);
      } else {
        logger.warn(`OCR service (${this.ocrService.getProviderName()}) is not available`);
      }
    });

    // Initialize Image Captioning service (optional) - auto-selects provider based on environment
    this.imageCaptioningService = ImageCaptioningServiceFactory.createFromEnv();
    logger.info(
      `Image Captioning service initialized: ${this.imageCaptioningService.getProviderName()}`
    );
    // Check availability asynchronously
    this.imageCaptioningService.isAvailable().then((available) => {
      if (available) {
        logger.info(
          `Image Captioning service (${this.imageCaptioningService.getProviderName()}) is available`
        );
      } else {
        logger.warn(
          `Image Captioning service (${this.imageCaptioningService.getProviderName()}) is not available`
        );
      }
    });

    // Initialize application services
    this.platformService = new PlatformService(this.platformRegistry, this.browserProvider);
    this.contentOrchestrationService = new ContentOrchestrationService(
      this.contentRepository,
      this.contentService
    );
    this.authenticationService = new AuthenticationService(this.userRepository);
    this.queueService = new QueueService(this.jobRepository);
    this.ingestionService = new IngestionService(
      this.contentRepository,
      this.batchRepository,
      this.queueService
    );
    this.sessionService = new SessionService(this.sessionStateRepository);
    this.analyticsService = new AnalyticsService(this.analyticsRepository, this.tweetRepository);
    this.automationOrchestrator = new AutomationOrchestrator(
      this.contentRepository,
      this.llmService || undefined
    );

    // Initialize controllers
    this.contentController = new ContentController(
      this.contentOrchestrationService,
      this.platformService
    );

    this.automationController = new AutomationController(
      this.automationOrchestrator,
      this.platformService
    );

    this.platformController = new PlatformController(this.platformService);

    this.authController = new AuthController(this.authenticationService);

    this.ingestionController = new IngestionController(this.ingestionService, this.sessionService);

    this.sessionController = new SessionController(this.sessionService);

    this.analyticsController = new AnalyticsController(this.analyticsService);

    this.userController = new UserController(this.userRepository);

    this.tweetController = new TweetController(this.tweetRepository);

    this.ocrController = new OCRController(this.ocrService);

    this.imageCaptioningController = new ImageCaptioningController(this.imageCaptioningService);

    // Initialize workers
    this.workerManager = new WorkerManager(
      this.contentRepository,
      this.jobRepository,
      this.queueService
    );

    logger.info('Application Container initialized successfully');
  }

  /**
   * Get Content Controller
   */
  getContentController(): ContentController {
    return this.contentController;
  }

  /**
   * Get Automation Controller
   */
  getAutomationController(): AutomationController {
    return this.automationController;
  }

  /**
   * Get Platform Controller
   */
  getPlatformController(): PlatformController {
    return this.platformController;
  }

  /**
   * Get Authentication Service
   */
  getAuthenticationService(): AuthenticationService {
    return this.authenticationService;
  }

  /**
   * Get Auth Controller
   */
  getAuthController(): AuthController {
    return this.authController;
  }

  /**
   * Get Ingestion Controller
   */
  getIngestionController(): IngestionController {
    return this.ingestionController;
  }

  /**
   * Get Session Controller
   */
  getSessionController(): SessionController {
    return this.sessionController;
  }

  /**
   * Get Platform Registry
   */
  getPlatformRegistry(): PlatformRegistry {
    return this.platformRegistry;
  }

  /**
   * Get Browser Provider
   */
  getBrowserProvider(): BrowserProvider {
    return this.browserProvider;
  }

  /**
   * Get Queue Service
   */
  getQueueService(): QueueService {
    return this.queueService;
  }

  /**
   * Get Analytics Controller
   */
  getAnalyticsController(): AnalyticsController {
    return this.analyticsController;
  }

  /**
   * Get User Controller
   */
  getUserController(): UserController {
    return this.userController;
  }

  /**
   * Get Tweet Controller
   */
  getTweetController(): TweetController {
    return this.tweetController;
  }

  /**
   * Get OCR Controller
   */
  getOCRController(): OCRController {
    return this.ocrController;
  }

  /**
   * Get Image Captioning Controller
   */
  getImageCaptioningController(): ImageCaptioningController {
    return this.imageCaptioningController;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    logger.info('Cleaning up Application Container...');

    // Close all workers
    await this.workerManager.close();

    // Close all browser sessions
    await this.browserProvider.closeAll();

    logger.info('Application Container cleaned up');
  }
}
