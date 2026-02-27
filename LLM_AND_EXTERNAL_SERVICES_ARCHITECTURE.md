# LLM and External Services Architecture

## 🎯 Overview

This document explains where LLM services and third-party API calls fit in the platform-agnostic architecture.

## 🏗️ Architectural Layers

```
┌──────────────────────────────────────────────────────────────┐
│                     Application Layer                         │
│  Orchestrates business workflows                             │
│  - AutomationOrchestrator                                    │
│  - ContentWorkflowService                                    │
│  - CategorizationService (orchestration)                     │
└────────────────────────┬─────────────────────────────────────┘
                         │ depends on ↓
┌────────────────────────▼─────────────────────────────────────┐
│                      Domain Layer                             │
│  Business logic and domain models                            │
│  - Content, Author (entities)                                │
│  - ContentService (domain logic)                             │
│  - IContentRepository (interface)                            │
│  - ILLMService (interface - defines what we need)            │
│  - IOCRService (interface)                                   │
│  - IRankingStrategy (interface)                              │
└────────────────────────┬─────────────────────────────────────┘
                         │ implements ↓
┌────────────────────────▼─────────────────────────────────────┐
│                   Infrastructure Layer                        │
│  External I/O and third-party integrations                   │
│  - MongoContentRepository (implements IContentRepository)    │
│  - OpenAILLMProvider (implements ILLMService)                │
│  - GroqLLMProvider (implements ILLMService)                  │
│  - PlaywrightBrowserProvider                                 │
│  - VisionAPIProvider (implements IOCRService)                │
└──────────────────────────────────────────────────────────────┘
```

## 📂 Detailed File Structure

```
api/src/platform/

├── domain/                              # Domain Layer (Business Logic)
│   ├── entities/
│   │   ├── Content.ts
│   │   └── Author.ts
│   ├── repositories/
│   │   └── IContentRepository.ts        # Interface only
│   ├── services/
│   │   ├── ContentService.ts            # Domain logic (scoring, validation)
│   │   ├── ILLMService.ts               # Interface for LLM operations
│   │   ├── IOCRService.ts               # Interface for OCR operations
│   │   └── IRankingStrategy.ts          # Interface for ranking algorithms
│   └── value-objects/
│       └── LLMPrompt.ts                 # Domain concept

├── infrastructure/                      # Infrastructure Layer (External I/O)
│   ├── persistence/
│   │   ├── MongoContentRepository.ts    # MongoDB implementation
│   │   └── RedisCache.ts                # Redis for caching
│   │
│   ├── llm/                             # LLM Provider Implementations
│   │   ├── providers/
│   │   │   ├── OpenAIProvider.ts        # OpenAI API implementation
│   │   │   ├── GroqProvider.ts          # Groq API implementation
│   │   │   ├── OpenRouterProvider.ts    # OpenRouter API implementation
│   │   │   └── AnthropicProvider.ts     # Anthropic API implementation
│   │   ├── LLMProviderFactory.ts        # Factory for selecting provider
│   │   ├── LLMRateLimiter.ts            # Rate limiting for API calls
│   │   └── PromptBuilder.ts             # Build prompts from templates
│   │
│   ├── ocr/                             # OCR Service Implementations
│   │   ├── VisionAPIProvider.ts         # Google Vision API
│   │   ├── TesseractProvider.ts         # Tesseract OCR
│   │   └── OCRProviderFactory.ts
│   │
│   ├── browser/                         # Browser Automation
│   │   ├── PlaywrightBrowserManager.ts  # Manages browser instances
│   │   └── BrowserSessionPool.ts        # Connection pooling
│   │
│   └── http/                            # HTTP Infrastructure
│       ├── HttpClient.ts                # Reusable HTTP client
│       ├── RetryPolicy.ts               # Retry logic for failed requests
│       └── RateLimiter.ts               # Generic rate limiting
│
└── application/                         # Application Layer (Orchestration)
    ├── services/
    │   ├── ContentWorkflowService.ts    # Orchestrates content pipeline
    │   ├── CategorizationService.ts     # Orchestrates categorization
    │   ├── RankingService.ts            # Orchestrates ranking
    │   └── AutomationOrchestrator.ts    # Orchestrates automation
    └── PlatformRegistry.ts
```

## 🎯 Where Does Each Service Go?

### 1. **LLM Service (OpenAI, Groq, OpenRouter)**

#### **Domain Interface** (Business Contract):

```typescript
// api/src/platform/domain/services/ILLMService.ts

export interface ILLMService {
  /**
   * Categorize content into predefined categories
   */
  categorize(content: Content[]): Promise<CategoryResult[]>;

  /**
   * Rank content for engagement potential
   */
  rank(content: Content[]): Promise<RankingResult[]>;

  /**
   * Determine engagement action for content
   */
  determineEngagement(content: Content[]): Promise<EngagementResult[]>;

  /**
   * Generate reply/comment text
   */
  generateText(content: Content, action: ActionType): Promise<string>;
}

export interface CategoryResult {
  contentId: string;
  category: string;
  confidence: number;
}

export interface RankingResult {
  contentId: string;
  qualityScore: number;
  engagementScore: number;
  growthPotentialScore: number;
  finalScore: number;
}

export interface EngagementResult {
  contentId: string;
  action: ActionType;
  reasoning: string;
}
```

#### **Infrastructure Implementations**:

```typescript
// api/src/platform/infrastructure/llm/providers/OpenAIProvider.ts

import { ILLMService } from '../../../domain/services/ILLMService';
import OpenAI from 'openai';

export class OpenAIProvider implements ILLMService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async categorize(content: Content[]): Promise<CategoryResult[]> {
    const prompt = this.buildCategorizationPrompt(content);

    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return this.parseCategorizationResponse(response);
  }

  async rank(content: Content[]): Promise<RankingResult[]> {
    // Implementation using OpenAI
  }

  async determineEngagement(content: Content[]): Promise<EngagementResult[]> {
    // Implementation using OpenAI
  }

  async generateText(content: Content, action: ActionType): Promise<string> {
    // Implementation using OpenAI
  }

  private buildCategorizationPrompt(content: Content[]): string {
    // Prompt building logic
  }

  private parseCategorizationResponse(response: any): CategoryResult[] {
    // Response parsing logic
  }
}
```

```typescript
// api/src/platform/infrastructure/llm/providers/GroqProvider.ts

import { ILLMService } from '../../../domain/services/ILLMService';
import Groq from 'groq-sdk';

export class GroqProvider implements ILLMService {
  private client: Groq;

  constructor(apiKey: string) {
    this.client = new Groq({ apiKey });
  }

  async categorize(content: Content[]): Promise<CategoryResult[]> {
    // Implementation using Groq (faster, cheaper)
  }

  // ... other methods
}
```

```typescript
// api/src/platform/infrastructure/llm/providers/OpenRouterProvider.ts

import { ILLMService } from '../../../domain/services/ILLMService';
import axios from 'axios';

export class OpenRouterProvider implements ILLMService {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async categorize(content: Content[]): Promise<CategoryResult[]> {
    // Implementation using OpenRouter (multi-model access)
  }

  // ... other methods
}
```

#### **Factory Pattern** (Selects Provider):

```typescript
// api/src/platform/infrastructure/llm/LLMProviderFactory.ts

import { ILLMService } from '../../domain/services/ILLMService';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { GroqProvider } from './providers/GroqProvider';
import { OpenRouterProvider } from './providers/OpenRouterProvider';

export enum LLMProviderType {
  OPENAI = 'openai',
  GROQ = 'groq',
  OPENROUTER = 'openrouter',
  ANTHROPIC = 'anthropic',
}

export class LLMProviderFactory {
  /**
   * Create LLM provider based on configuration
   */
  static create(type: LLMProviderType, apiKey: string): ILLMService {
    switch (type) {
      case LLMProviderType.OPENAI:
        return new OpenAIProvider(apiKey);

      case LLMProviderType.GROQ:
        return new GroqProvider(apiKey);

      case LLMProviderType.OPENROUTER:
        return new OpenRouterProvider(apiKey);

      case LLMProviderType.ANTHROPIC:
        return new AnthropicProvider(apiKey);

      default:
        throw new Error(`Unsupported LLM provider: ${type}`);
    }
  }

  /**
   * Create provider from environment variable
   */
  static createFromEnv(): ILLMService {
    const providerType = (process.env.LLM_PROVIDER || 'groq') as LLMProviderType;
    const apiKey = this.getApiKeyForProvider(providerType);

    return this.create(providerType, apiKey);
  }

  private static getApiKeyForProvider(type: LLMProviderType): string {
    const keyMap = {
      [LLMProviderType.OPENAI]: process.env.OPENAI_API_KEY,
      [LLMProviderType.GROQ]: process.env.GROQ_API_KEY,
      [LLMProviderType.OPENROUTER]: process.env.OPENROUTER_API_KEY,
      [LLMProviderType.ANTHROPIC]: process.env.ANTHROPIC_API_KEY,
    };

    const apiKey = keyMap[type];
    if (!apiKey) {
      throw new Error(`API key not found for provider: ${type}`);
    }

    return apiKey;
  }
}
```

#### **Application Service** (Orchestration):

```typescript
// api/src/platform/application/services/CategorizationService.ts

import { ILLMService } from '../../domain/services/ILLMService';
import { IContentRepository } from '../../domain/repositories/IContentRepository';
import { ContentStatus } from '../../core/types/ContentStatus';
import { LLMProviderFactory } from '../../infrastructure/llm/LLMProviderFactory';

/**
 * Application service for categorization workflow
 * Orchestrates between domain and infrastructure
 */
export class CategorizationService {
  private llmService: ILLMService;
  private contentRepo: IContentRepository;

  constructor(
    contentRepo: IContentRepository,
    llmService?: ILLMService,
  ) {
    this.contentRepo = contentRepo;
    this.llmService = llmService || LLMProviderFactory.createFromEnv();
  }

  /**
   * Categorize batch of content
   */
  async categorizeBatch(batchId: string): Promise<void> {
    // 1. Get content ready for categorization (Repository)
    const contents = await this.contentRepo.findByStatus(
      ContentStatus.CLEANED,
      100
    );

    if (contents.length === 0) {
      return;
    }

    // 2. Categorize using LLM (Infrastructure)
    const results = await this.llmService.categorize(contents);

    // 3. Update content with categories (Repository)
    for (const result of results) {
      const content = contents.find(c => c.id.toString() === result.contentId);
      if (content) {
        // Create new content with updated category (immutable)
        const updated = Content.builder()
          .fromExisting(content)
          .category(result.category)
          .status(ContentStatus.CATEGORIZED)
          .build();

        await this.contentRepo.save(updated);
      }
    }
  }
}
```

---

### 2. **OCR Service (Image Recognition)**

#### **Domain Interface**:

```typescript
// api/src/platform/domain/services/IOCRService.ts

export interface IOCRService {
  /**
   * Extract text from image
   */
  extractText(imageUrl: string): Promise<OCRResult>;

  /**
   * Extract text from multiple images
   */
  extractTextBatch(imageUrls: string[]): Promise<OCRResult[]>;

  /**
   * Check if service is available
   */
  isAvailable(): Promise<boolean>;
}

export interface OCRResult {
  imageUrl: string;
  text: string;
  confidence: number;
  language?: string;
  error?: string;
}
```

#### **Infrastructure Implementations**:

```typescript
// api/src/platform/infrastructure/ocr/VisionAPIProvider.ts

import { IOCRService, OCRResult } from '../../domain/services/IOCRService';
import vision from '@google-cloud/vision';

export class VisionAPIProvider implements IOCRService {
  private client: vision.ImageAnnotatorClient;

  constructor(credentials?: any) {
    this.client = new vision.ImageAnnotatorClient(credentials);
  }

  async extractText(imageUrl: string): Promise<OCRResult> {
    try {
      const [result] = await this.client.textDetection(imageUrl);
      const detections = result.textAnnotations;

      if (!detections || detections.length === 0) {
        return {
          imageUrl,
          text: '',
          confidence: 0,
        };
      }

      return {
        imageUrl,
        text: detections[0].description || '',
        confidence: detections[0].confidence || 0,
      };
    } catch (error) {
      return {
        imageUrl,
        text: '',
        confidence: 0,
        error: (error as Error).message,
      };
    }
  }

  async extractTextBatch(imageUrls: string[]): Promise<OCRResult[]> {
    return Promise.all(imageUrls.map(url => this.extractText(url)));
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test API availability
      return true;
    } catch {
      return false;
    }
  }
}
```

```typescript
// api/src/platform/infrastructure/ocr/TesseractProvider.ts

import { IOCRService, OCRResult } from '../../domain/services/IOCRService';
import Tesseract from 'tesseract.js';

/**
 * Tesseract OCR provider (free, open-source alternative)
 */
export class TesseractProvider implements IOCRService {
  async extractText(imageUrl: string): Promise<OCRResult> {
    try {
      const result = await Tesseract.recognize(imageUrl, 'eng');

      return {
        imageUrl,
        text: result.data.text,
        confidence: result.data.confidence / 100,
      };
    } catch (error) {
      return {
        imageUrl,
        text: '',
        confidence: 0,
        error: (error as Error).message,
      };
    }
  }

  async extractTextBatch(imageUrls: string[]): Promise<OCRResult[]> {
    return Promise.all(imageUrls.map(url => this.extractText(url)));
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available (local)
  }
}
```

---

### 3. **Browser Automation (Playwright)**

#### **Infrastructure Implementation**:

```typescript
// api/src/platform/infrastructure/browser/PlaywrightBrowserManager.ts

import { Browser, Page, chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { logger } from '../../../config/logger';

const chromiumStealth = chromium.use(StealthPlugin());

/**
 * Manages Playwright browser instances
 * Infrastructure concern - hidden from domain
 */
export class PlaywrightBrowserManager {
  private browser: Browser | null = null;
  private launching: Promise<Browser> | null = null;

  async getBrowser(): Promise<Browser> {
    if (this.browser) {
      return this.browser;
    }

    if (this.launching) {
      return this.launching;
    }

    this.launching = this.launchBrowser();
    return this.launching;
  }

  private async launchBrowser(): Promise<Browser> {
    const headless = process.env.PLAYWRIGHT_HEADLESS !== 'false';

    logger.info('Launching Playwright browser', { headless });

    const browser = await chromiumStealth.launch({
      headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    this.browser = browser;
    this.launching = null;

    return browser;
  }

  async createPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    });

    return context.newPage();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const browserManager = new PlaywrightBrowserManager();
```

---

### 4. **HTTP Client (Generic)**

#### **Infrastructure Implementation**:

```typescript
// api/src/platform/infrastructure/http/HttpClient.ts

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { RetryPolicy } from './RetryPolicy';
import { logger } from '../../../config/logger';

/**
 * Generic HTTP client with retry logic and error handling
 */
export class HttpClient {
  private client: AxiosInstance;
  private retryPolicy: RetryPolicy;

  constructor(config?: AxiosRequestConfig) {
    this.client = axios.create(config);
    this.retryPolicy = new RetryPolicy();

    // Add request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.debug('HTTP Request', { url: config.url, method: config.method });
        return config;
      },
      (error) => {
        logger.error('HTTP Request Error', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.debug('HTTP Response', { url: response.config.url, status: response.status });
        return response;
      },
      (error) => {
        logger.error('HTTP Response Error', { url: error.config?.url, error: error.message });
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.retryPolicy.execute(async () => {
      const response = await this.client.get<T>(url, config);
      return response.data;
    });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryPolicy.execute(async () => {
      const response = await this.client.post<T>(url, data, config);
      return response.data;
    });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.retryPolicy.execute(async () => {
      const response = await this.client.put<T>(url, data, config);
      return response.data;
    });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.retryPolicy.execute(async () => {
      const response = await this.client.delete<T>(url, config);
      return response.data;
    });
  }
}
```

```typescript
// api/src/platform/infrastructure/http/RetryPolicy.ts

import { logger } from '../../../config/logger';

export class RetryPolicy {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.maxRetries - 1) {
          const delay = this.calculateDelay(attempt);
          logger.warn(`Request failed, retrying in ${delay}ms`, { attempt: attempt + 1, error: lastError.message });
          await this.sleep(delay);
        }
      }
    }

    logger.error('Request failed after all retries', { error: lastError! });
    throw lastError!;
  }

  private calculateDelay(attempt: number): number {
    // Exponential backoff with jitter
    const exponentialDelay = this.baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 1000;
    return exponentialDelay + jitter;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

---

## 🔄 Dependency Injection

### Setup in Application Bootstrap:

```typescript
// api/src/index.ts

import { MongoContentRepository } from './platform/infrastructure/persistence/MongoContentRepository';
import { LLMProviderFactory } from './platform/infrastructure/llm/LLMProviderFactory';
import { CategorizationService } from './platform/application/services/CategorizationService';

// Bootstrap application with dependency injection
async function bootstrap() {
  // Infrastructure layer
  const contentRepo = new MongoContentRepository();
  const llmService = LLMProviderFactory.createFromEnv();

  // Application layer
  const categorizationService = new CategorizationService(contentRepo, llmService);

  // Start workers
  startCategorizationWorker(categorizationService);
}
```

---

## 🎯 Key Principles:

### ✅ **Dependency Inversion Principle**

Workers depend on **interfaces**, not concrete implementations:

```typescript
// ❌ Bad - depends on concrete class
import { OpenAIProvider } from '../../infrastructure/llm/OpenAIProvider';

class CategorizationWorker {
  private llm = new OpenAIProvider(apiKey); // Tight coupling!
}

// ✅ Good - depends on interface
import { ILLMService } from '../../domain/services/ILLMService';

class CategorizationWorker {
  constructor(private llm: ILLMService) {} // Loose coupling!
}
```

### ✅ **Easy to Swap Implementations**

```typescript
// Switch from OpenAI to Groq - just change env variable!
// .env
LLM_PROVIDER=groq  // was: openai

// Code doesn't change at all
const llmService = LLMProviderFactory.createFromEnv();
```

### ✅ **Easy to Test**

```typescript
// Create mock LLM service for testing
class MockLLMService implements ILLMService {
  async categorize(content: Content[]): Promise<CategoryResult[]> {
    return content.map(c => ({
      contentId: c.id.toString(),
      category: 'Technology',
      confidence: 1.0,
    }));
  }
  // ... other methods
}

// Test without real API calls
const mockLLM = new MockLLMService();
const service = new CategorizationService(contentRepo, mockLLM);
```

---

## 📊 Summary Table:

| Service | Layer | Location | Interface | Implementations |
|---------|-------|----------|-----------|-----------------|
| **LLM** | Infrastructure | `infrastructure/llm/providers/` | `ILLMService` | OpenAI, Groq, OpenRouter, Anthropic |
| **OCR** | Infrastructure | `infrastructure/ocr/` | `IOCRService` | VisionAPI, Tesseract |
| **Browser** | Infrastructure | `infrastructure/browser/` | N/A (internal) | PlaywrightBrowserManager |
| **HTTP** | Infrastructure | `infrastructure/http/` | N/A (utility) | HttpClient, RetryPolicy |
| **Categorization** | Application | `application/services/` | N/A | CategorizationService |
| **Content Repo** | Infrastructure | `infrastructure/persistence/` | `IContentRepository` | MongoContentRepository |

---

## 🚀 Migration Path:

### Current State:
```
api/src/modules/llm/llm.service.ts  (single file, tightly coupled)
```

### Target State:
```
api/src/platform/
├── domain/services/ILLMService.ts            (interface)
├── infrastructure/llm/providers/
│   ├── OpenAIProvider.ts                     (implementation)
│   ├── GroqProvider.ts                       (implementation)
│   └── OpenRouterProvider.ts                 (implementation)
├── infrastructure/llm/LLMProviderFactory.ts  (factory)
└── application/services/CategorizationService.ts (orchestration)
```

---

This architecture gives you:
- ✅ **Testability**: Mock any external service
- ✅ **Flexibility**: Swap providers easily
- ✅ **Maintainability**: Clear separation of concerns
- ✅ **Scalability**: Add new providers without changing domain logic
