# Developer Guide: Twitter Builder API

**A comprehensive guide for mid-level developers joining the project**

This guide walks you through the entire codebase, explaining every concept, pattern, and feature. By the end, you'll understand how everything works and flows through the system.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Key Concepts & Patterns](#key-concepts--patterns)
3. [Project Structure](#project-structure)
4. [The Five Layers Explained](#the-five-layers-explained)
5. [Feature Walkthroughs](#feature-walkthroughs)
6. [Request Flow Examples](#request-flow-examples)
7. [Dependency Injection](#dependency-injection)
8. [Testing Strategy](#testing-strategy)
9. [Common Development Tasks](#common-development-tasks)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### What is Clean Architecture?

This codebase uses **Clean Architecture** (also called Hexagonal Architecture or Ports & Adapters).

**📚 Learn More:**
- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Hexagonal Architecture Explained](https://alistair.cockburn.us/hexagonal-architecture/)
- [Clean Architecture in Node.js](https://mannhowie.com/clean-architecture-node)

**Core Principle:** Dependencies point inward. Outer layers depend on inner layers, never the reverse.

```
┌─────────────────────────────────────────────────────────┐
│                    API Layer (5)                        │
│              Controllers, Routes, DTOs                  │
│                  (Express HTTP)                         │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│               Application Layer (4)                     │
│           Use Cases, Orchestration, Services            │
│         (Business workflows & coordination)             │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                 Domain Layer (3)                        │
│           Entities, Repositories, Services              │
│              (Core business logic)                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│             Infrastructure Layer (2)                    │
│        Database, LLM, Browser, External APIs            │
│           (Implementation details)                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                   Core Layer (1)                        │
│        Interfaces, Types, Value Objects, Errors         │
│               (Pure abstractions)                       │
└─────────────────────────────────────────────────────────┘
```

**Why This Matters:**
- ✅ **Testability**: Mock dependencies easily
- ✅ **Flexibility**: Swap implementations (e.g., MongoDB → PostgreSQL)
- ✅ **Maintainability**: Changes are localized
- ✅ **Clarity**: Clear separation of concerns

---

## Key Concepts & Patterns

### 1. SOLID Principles

Every layer follows SOLID:

**📚 Learn More:**
- [SOLID Principles Explained](https://www.digitalocean.com/community/conceptual_articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)
- [SOLID in TypeScript](https://khalilstemmler.com/articles/solid-principles/solid-typescript/)

#### S - Single Responsibility Principle
Each class has one reason to change.

```typescript
// ✅ Good: ContentController only handles HTTP
export class ContentController {
  constructor(private orchestrationService: ContentOrchestrationService) {}

  async getContent(req, res) {
    // Only HTTP logic here
    const result = await this.orchestrationService.getContent(req.params.id);
    res.json(result);
  }
}

// ✅ Good: ContentOrchestrationService only handles business workflow
export class ContentOrchestrationService {
  constructor(
    private repository: IContentRepository,
    private domainService: ContentService
  ) {}

  async getContent(id: string) {
    // Only orchestration logic here
    return await this.repository.findById(id);
  }
}
```

#### O - Open/Closed Principle
Open for extension, closed for modification.

```typescript
// Core defines interface (closed for modification)
export interface ILLMService {
  generateReply(content: Content): Promise<LLMResponse>;
}

// Infrastructure extends with implementations (open for extension)
export class OpenAILLMService implements ILLMService { ... }
export class AnthropicLLMService implements ILLMService { ... } // Can add new
```

#### L - Liskov Substitution Principle
Subtypes must be substitutable for their base types.

```typescript
// Any IContentRepository implementation works
function saveContent(repo: IContentRepository, content: Content) {
  return repo.save(content); // Works with MongoContentRepository, PostgresContentRepository, etc.
}
```

#### I - Interface Segregation Principle
Clients shouldn't depend on interfaces they don't use.

```typescript
// ✅ Good: Specific interfaces
export interface IContentReader {
  findById(id: string): Promise<Content | null>;
}

export interface IContentWriter {
  save(content: Content): Promise<Content>;
}

// ❌ Bad: One large interface
export interface IContentRepository {
  findById(...): ...;
  save(...): ...;
  delete(...): ...;
  // ... 20 more methods
}
```

#### D - Dependency Inversion Principle
Depend on abstractions, not concretions.

```typescript
// ✅ Good: Depends on interface
export class ContentController {
  constructor(private service: IContentService) {} // Interface
}

// ❌ Bad: Depends on concrete class
export class ContentController {
  constructor(private service: MongoContentService) {} // Concrete
}
```

### 2. Domain-Driven Design (DDD)

**📚 Learn More:**
- [Domain-Driven Design Fundamentals](https://www.domainlanguage.com/ddd/)
- [DDD in Node.js](https://khalilstemmler.com/articles/domain-driven-design-intro/)
- [Entities vs Value Objects](https://enterprisecraftsmanship.com/posts/entity-vs-value-object-the-ultimate-list-of-differences/)

**Key DDD Concepts Used:**

#### Entities
Objects with identity that persist over time.

```typescript
// Content is an Entity - has identity (id) and lifecycle
export class Content {
  constructor(
    public readonly id: ContentId,  // ← Identity
    public readonly text: string,
    // ... more properties
  ) {}
}

// Two Content instances with same id are the SAME content
const content1 = new Content(id1, "text");
const content2 = new Content(id1, "different text");
// content1.equals(content2) === true (same id)
```

#### Value Objects
Objects defined by their attributes, not identity.

```typescript
// Metrics is a Value Object - no identity, defined by values
export class Metrics {
  constructor(
    public readonly likes: number,
    public readonly comments: number,
    public readonly shares: number,
    public readonly views: number
  ) {}
}

// Two Metrics with same values are IDENTICAL
const metrics1 = new Metrics(10, 5, 2, 100);
const metrics2 = new Metrics(10, 5, 2, 100);
// metrics1.equals(metrics2) === true (same values)
```

#### Aggregates
Cluster of entities and value objects with a root entity.

```typescript
// Content is an Aggregate Root
export class Content {
  constructor(
    public readonly id: ContentId,        // Root entity
    public readonly author: Author,       // Value object part of aggregate
    public readonly metrics: Metrics,     // Value object part of aggregate
    public readonly media: MediaItem[]    // Value objects part of aggregate
  ) {}

  // Aggregate ensures consistency
  updateMetrics(newMetrics: Metrics): Content {
    // Business rules enforced here
    return new Content(this.id, this.author, newMetrics, this.media);
  }
}
```

#### Repositories
Abstraction for data access.

```typescript
// Repository pattern: collection-like interface
export interface IContentRepository {
  findById(id: string): Promise<Content | null>;
  save(content: Content): Promise<Content>;
  delete(id: string): Promise<void>;
}

// Usage: Client doesn't know about MongoDB
async function getContent(id: string, repo: IContentRepository) {
  return await repo.findById(id); // Could be Mongo, Postgres, in-memory, etc.
}
```

### 3. Dependency Injection

**📚 Learn More:**
- [Dependency Injection Explained](https://www.freecodecamp.org/news/a-quick-intro-to-dependency-injection-what-it-is-and-when-to-use-it-7578c84fa88f/)
- [DI in TypeScript](https://nehalist.io/dependency-injection-in-typescript/)

We use **Constructor Injection**:

```typescript
// Dependencies injected via constructor
export class ContentController {
  constructor(
    private readonly orchestrationService: ContentOrchestrationService, // Injected
    private readonly platformService: PlatformService                   // Injected
  ) {}
}

// ApplicationContainer wires everything
export class ApplicationContainer {
  constructor() {
    // Create dependencies
    const contentRepo = new MongoContentRepository();
    const contentService = new ContentService(contentRepo);

    // Inject dependencies
    const controller = new ContentController(
      contentService,
      platformService
    );
  }
}
```

**Benefits:**
- Easy to test (inject mocks)
- Loose coupling
- Explicit dependencies

---

## Project Structure

```
api/
├── src/
│   ├── platform/              # Main application (Clean Architecture)
│   │   ├── core/             # Layer 1: Abstractions
│   │   ├── domain/           # Layer 2: Business logic
│   │   ├── infrastructure/   # Layer 3: External dependencies
│   │   ├── application/      # Layer 4: Use cases
│   │   ├── api/              # Layer 5: HTTP interface
│   │   └── adapters/         # Platform-specific implementations
│   │
│   ├── middleware/           # Express middleware
│   ├── config/               # Configuration
│   ├── shared/               # Shared utilities
│   ├── examples/             # Usage examples
│   ├── app.ts                # Express app setup
│   └── server.ts             # Server entry point
│
├── docs/                     # Documentation
├── deprecated/               # Old code (for reference)
├── tests/                    # Test files
├── package.json
└── tsconfig.json
```

---

## The Five Layers Explained

### Layer 1: Core (`src/platform/core/`)

**Purpose:** Pure abstractions - interfaces, types, value objects, errors

**What Lives Here:**
- Interfaces (contracts)
- TypeScript types and enums
- Value objects (immutable data structures)
- Custom error classes

**Key Files:**

#### `core/interfaces/IContentRepository.ts`
```typescript
// Contract that infrastructure must implement
export interface IContentRepository {
  findById(id: string): Promise<Content | null>;
  findByPlatform(platformId: string): Promise<Content[]>;
  save(content: Content): Promise<Content>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}
```

**Why:** Domain layer depends on this interface, not concrete MongoDB implementation.

#### `core/types/ContentStatus.ts`
```typescript
// Status lifecycle for content
export enum ContentStatus {
  PENDING_CATEGORIZATION = 'PENDING_CATEGORIZATION',
  CATEGORIZED = 'CATEGORIZED',
  RANKED = 'RANKED',
  QUEUED_FOR_ENGAGEMENT = 'QUEUED_FOR_ENGAGEMENT',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

// Utility functions
export class ContentStatusUtils {
  static canCategorize(status: ContentStatus): boolean {
    return status === ContentStatus.PENDING_CATEGORIZATION;
  }

  static canRank(status: ContentStatus): boolean {
    return status === ContentStatus.CATEGORIZED;
  }
}
```

**Why:** Business rules about status are in core, not scattered throughout.

#### `core/value-objects/Metrics.ts`
```typescript
// Immutable value object
export class Metrics {
  constructor(
    public readonly likes: number,
    public readonly comments: number,
    public readonly shares: number,
    public readonly views: number
  ) {
    // Validation in constructor
    if (likes < 0 || comments < 0 || shares < 0 || views < 0) {
      throw new Error('Metrics cannot be negative');
    }
  }

  // Business logic methods
  getTotalEngagement(): number {
    return this.likes + this.comments + this.shares;
  }

  getEngagementRate(): number {
    return this.views > 0 ? this.getTotalEngagement() / this.views : 0;
  }

  // Immutability: return new instance
  withUpdatedLikes(likes: number): Metrics {
    return new Metrics(likes, this.comments, this.shares, this.views);
  }
}
```

**Why:** Encapsulates engagement logic. Immutability prevents bugs.

#### `core/errors/PlatformErrors.ts`
```typescript
// Specific error types
export class ScrapingError extends PlatformError {
  constructor(
    public readonly platformId: string,
    message: string,
    public readonly originalError?: Error
  ) {
    super(message, 'SCRAPING_ERROR');
  }

  // Factory method
  static timeout(platformId: string): ScrapingError {
    return new ScrapingError(platformId, 'Scraping timeout');
  }
}
```

**Why:** Type-safe error handling. Easier to handle specific errors.

**📚 Learn More:**
- [Value Objects Explained](https://martinfowler.com/bliki/ValueObject.html)
- [TypeScript Interfaces vs Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)

---

### Layer 2: Domain (`src/platform/domain/`)

**Purpose:** Business logic and rules

**What Lives Here:**
- Entities (objects with identity)
- Domain services (complex business logic)
- Repository interfaces (defined here, implemented in infrastructure)

**Key Files:**

#### `domain/entities/Content.ts`
```typescript
// Rich domain entity
export class Content {
  // Private constructor enforces builder pattern
  private constructor(
    public readonly id: ContentId,
    public readonly text: string,
    public readonly author: Author,
    public readonly metrics: Metrics,
    public readonly status: ContentStatus,
    // ... more properties
  ) {}

  // Builder pattern for complex construction
  static builder(): ContentBuilder {
    return new ContentBuilder();
  }

  // Business logic methods
  canBeCategorized(): boolean {
    return this.status === ContentStatus.PENDING_CATEGORIZATION;
  }

  categorize(category: string): Content {
    if (!this.canBeCategorized()) {
      throw new Error('Content cannot be categorized in current status');
    }
    // Return new instance (immutability)
    return Content.builder()
      .fromExisting(this)
      .category(category)
      .status(ContentStatus.CATEGORIZED)
      .build();
  }

  // Convert to plain object (for persistence)
  toPlain(): ContentPlainObject {
    return {
      id: this.id.toString(),
      text: this.text,
      author: this.author.toPlain(),
      // ...
    };
  }
}
```

**Why:**
- Encapsulates business rules
- Ensures valid state transitions
- Immutability prevents bugs

#### `domain/entities/User.ts`
```typescript
export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly password: string, // Hashed
    public readonly name: string,
    public readonly role: UserRole,
    public readonly status: UserStatus,
    public readonly settings: UserSettings,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  // Business logic
  isActive(): boolean {
    return this.status === UserStatus.ACTIVE;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  canAccessContent(content: Content): boolean {
    return this.isActive() && (this.isAdmin() || content.isPublic);
  }

  // Safe public representation
  toPublic() {
    const { password, ...safe } = this.toPlain();
    return safe; // Never expose password
  }
}
```

#### `domain/services/ContentService.ts`
```typescript
// Domain service: complex business logic spanning multiple entities
export class ContentService {
  constructor(private readonly repository: IContentRepository) {}

  // Business logic that doesn't belong to a single entity
  async validateAndEnrichContent(content: Content): Promise<Content> {
    // Validation
    if (!content.text || content.text.length < 10) {
      throw new ValidationError('Content text too short');
    }

    // Enrichment
    const metrics = await this.calculateEngagementScore(content);

    return content.withUpdatedMetrics(metrics);
  }

  // Domain calculation
  private calculateEngagementScore(content: Content): number {
    const metrics = content.metrics;
    return metrics.likes * 1 +
           metrics.comments * 2 +
           metrics.shares * 3;
  }
}
```

**Why Domain Services:**
- Logic spans multiple entities
- Doesn't naturally fit in one entity
- Remains in business logic layer

**📚 Learn More:**
- [Domain Services vs Application Services](https://enterprisecraftsmanship.com/posts/domain-vs-application-services/)
- [Builder Pattern](https://refactoring.guru/design-patterns/builder)

---

### Layer 3: Infrastructure (`src/platform/infrastructure/`)

**Purpose:** Implementation of external dependencies

**What Lives Here:**
- Database implementations (MongoDB)
- External API clients (OpenAI, Twitter)
- Browser automation (Playwright)
- Message queues, caching, etc.

**Key Files:**

#### `infrastructure/persistence/MongoContentRepository.ts`
```typescript
// Implements IContentRepository interface from core
export class MongoContentRepository implements IContentRepository {

  async findById(id: string): Promise<Content | null> {
    try {
      // MongoDB-specific code
      const doc = await ContentModel.findById(id);
      if (!doc) return null;

      // Map from MongoDB document to domain entity
      return ContentMapper.toDomain(doc);
    } catch (error) {
      logger.error('Error finding content', { id, error });
      throw error;
    }
  }

  async save(content: Content): Promise<Content> {
    // Map from domain entity to MongoDB document
    const persistence = ContentMapper.toPersistence(content);

    // Check if exists
    const existing = await ContentModel.findById(content.id.toString());

    let doc: ContentDocument;
    if (existing) {
      // Update
      Object.assign(existing, persistence);
      doc = await existing.save();
    } else {
      // Create
      doc = await ContentModel.create(persistence);
    }

    // Map back to domain
    return ContentMapper.toDomain(doc);
  }
}
```

**Why:**
- Domain doesn't know about MongoDB
- Easy to swap to PostgreSQL or in-memory
- Testable with mock repositories

#### `infrastructure/persistence/mappers/ContentMapper.ts`
```typescript
// Translates between domain and persistence
export class ContentMapper {
  // MongoDB document → Domain entity
  static toDomain(doc: ContentDocument): Content {
    return Content.builder()
      .id(doc._id.toString())
      .text(doc.text)
      .author(Author.fromPlain(doc.author))
      .metrics(Metrics.fromObject(doc.metrics))
      .status(doc.status)
      .createdAt(doc.createdAt)
      .build();
  }

  // Domain entity → MongoDB document
  static toPersistence(content: Content): Partial<ContentDocument> {
    return {
      _id: content.id.toString(),
      text: content.text,
      author: content.author.toPlain(),
      metrics: {
        likes: content.metrics.likes,
        comments: content.metrics.comments,
        shares: content.metrics.shares,
        views: content.metrics.views,
      },
      status: content.status,
    };
  }
}
```

**Why:**
- Separates domain model from database schema
- Domain stays pure (no Mongoose types)
- Easy to change database structure

#### `infrastructure/llm/OpenAILLMService.ts`
```typescript
// Implements ILLMService interface
export class OpenAILLMService implements ILLMService {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateReply(content: Content): Promise<LLMResponse> {
    try {
      // Build prompt from domain entity
      const prompt = LLMConfig.buildReplyPrompt(content);

      // Call OpenAI API
      const completion = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
        temperature: 0.7,
        max_tokens: 150,
      });

      // Return domain response
      return {
        text: completion.choices[0].message.content,
        model: completion.model,
        tokensUsed: completion.usage?.total_tokens,
        generatedAt: new Date(),
        isFallback: false,
      };
    } catch (error) {
      // Fallback on error
      logger.error('LLM generation failed', { error });
      return this.createFallbackResponse('reply');
    }
  }

  private createFallbackResponse(type: 'reply' | 'quote'): LLMResponse {
    return {
      text: LLMConfig.getRandomFallback(type),
      model: 'fallback',
      tokensUsed: 0,
      generatedAt: new Date(),
      isFallback: true,
    };
  }
}
```

**Why:**
- Easy to swap to Anthropic, Gemini, etc.
- Fallback logic ensures reliability
- Domain doesn't know about OpenAI API

**📚 Learn More:**
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)
- [Mapper Pattern](https://martinfowler.com/eaaCatalog/dataMapper.html)

---

### Layer 4: Application (`src/platform/application/`)

**Purpose:** Use cases and orchestration

**What Lives Here:**
- Application services (orchestrate domain logic)
- Use case implementations
- DTOs for service communication
- Application container (dependency injection)

**Key Files:**

#### `application/services/ContentOrchestrationService.ts`
```typescript
// Orchestrates domain services and repositories
export class ContentOrchestrationService {
  constructor(
    private readonly repository: IContentRepository,
    private readonly domainService: ContentService
  ) {}

  // Use case: Create and validate content
  async createContent(data: CreateContentDTO): Promise<Content> {
    // 1. Create domain entity
    const content = Content.builder()
      .id(this.generateId())
      .text(data.text)
      .author(data.author)
      .status(ContentStatus.PENDING_CATEGORIZATION)
      .createdAt(new Date())
      .build();

    // 2. Domain validation
    const validated = await this.domainService.validateAndEnrichContent(content);

    // 3. Persist
    const saved = await this.repository.save(validated);

    logger.info('Content created', { contentId: saved.id.toString() });

    return saved;
  }

  // Use case: Get content with enrichment
  async getContentWithStats(id: string): Promise<ContentWithStats> {
    // 1. Fetch from repository
    const content = await this.repository.findById(id);
    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // 2. Calculate stats (domain logic)
    const stats = this.domainService.calculateStats(content);

    // 3. Return enriched data
    return {
      content,
      stats,
    };
  }
}
```

**Why:**
- Coordinates multiple domain services
- Implements use cases
- Transaction boundaries
- No business rules (delegates to domain)

#### `application/services/AutomationOrchestrator.ts`
```typescript
// Orchestrates complex automation workflow
export class AutomationOrchestrator {
  constructor(
    private readonly repository: IContentRepository,
    private readonly llmService?: ILLMService // Optional dependency
  ) {}

  // Complex use case: Execute automation
  async executeAutomation(options?: AutomationOptions): Promise<AutomationResult> {
    // 1. Find content ready for automation
    const contents = await this.repository.findByStatus(
      ContentStatus.QUEUED_FOR_ENGAGEMENT
    );

    logger.info('Starting automation', { count: contents.length });

    const results: ActionResult[] = [];

    // 2. Process each content
    for (const content of contents) {
      try {
        // 3. Generate engagement text (if LLM available)
        const engagementText = await this.generateEngagementText(content);

        // 4. Execute action
        const result = await this.executeAction(content, engagementText);

        results.push(result);

        // 5. Update status
        await this.repository.updateStatus(
          content.id.toString(),
          ContentStatus.COMPLETED
        );

        // 6. Rate limiting
        await this.delay(1000);
      } catch (error) {
        logger.error('Action failed', { contentId: content.id, error });
      }
    }

    return { results, totalProcessed: contents.length };
  }

  private async generateEngagementText(content: Content): Promise<string> {
    if (!this.llmService) {
      return 'Great insights! Thanks for sharing.'; // Fallback
    }

    const response = await this.llmService.generateReply(content);
    return response.text;
  }
}
```

**Why:**
- Orchestrates multiple steps
- Handles infrastructure concerns (rate limiting)
- Graceful degradation (LLM optional)
- Clear workflow

#### `application/ApplicationContainer.ts`
```typescript
// Dependency injection container
export class ApplicationContainer {
  private contentRepository: MongoContentRepository;
  private userRepository: MongoUserRepository;
  private llmService: OpenAILLMService | null;

  // ... all services

  private contentController: ContentController;
  private automationController: AutomationController;
  private platformController: PlatformController;

  constructor() {
    // 1. Initialize repositories
    this.contentRepository = new MongoContentRepository();
    this.userRepository = new MongoUserRepository();

    // 2. Initialize infrastructure
    try {
      this.llmService = new OpenAILLMService();
    } catch {
      this.llmService = null; // Graceful degradation
    }

    // 3. Initialize domain services
    const contentService = new ContentService(this.contentRepository);

    // 4. Initialize application services
    const orchestrationService = new ContentOrchestrationService(
      this.contentRepository,
      contentService
    );

    // 5. Initialize controllers
    this.contentController = new ContentController(
      orchestrationService,
      platformService
    );

    // All dependencies wired!
  }

  // Getters for controllers
  getContentController(): ContentController {
    return this.contentController;
  }
}
```

**Why:**
- Single place to wire dependencies
- Easy to see full dependency graph
- Testable (can create with mocks)

**📚 Learn More:**
- [Application Services](https://enterprisecraftsmanship.com/posts/application-services-or-controllers/)
- [Use Case Driven Development](https://herbertograca.com/2017/07/03/the-software-architecture-chronicles/)

---

### Layer 5: API (`src/platform/api/`)

**Purpose:** HTTP interface (controllers, routes, DTOs)

**What Lives Here:**
- Controllers (handle HTTP requests)
- Routes (define endpoints)
- DTOs (data transfer objects for validation)
- Middleware

**Key Files:**

#### `api/controllers/ContentController.ts`
```typescript
export class ContentController {
  constructor(
    private readonly orchestrationService: ContentOrchestrationService,
    private readonly platformService: PlatformService
  ) {}

  // GET /api/v1/content
  async listContent(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Parse query params
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      // 2. Call application service
      const contents = await this.orchestrationService.listContent({
        page,
        limit,
      });

      // 3. Return HTTP response
      res.json({
        success: true,
        data: contents.map(c => c.toPlain()),
        pagination: {
          page,
          limit,
          total: contents.length,
        },
      });
    } catch (error) {
      // 4. Pass errors to error handler
      next(error);
    }
  }

  // POST /api/v1/content
  async createContent(req: Request, res: Response, next: NextFunction) {
    try {
      // 1. Validate request body
      const dto: CreateContentDTO = {
        text: req.body.text,
        author: req.body.author,
        platformId: req.body.platformId,
      };

      // 2. Call application service
      const content = await this.orchestrationService.createContent(dto);

      // 3. Return HTTP response
      res.status(201).json({
        success: true,
        data: content.toPlain(),
      });
    } catch (error) {
      next(error);
    }
  }
}
```

**Why:**
- Thin controllers (no business logic)
- HTTP concerns only (request/response)
- Delegates to application services

#### `api/routes/content.routes.ts`
```typescript
export function createContentRoutes(controller: ContentController): Router {
  const router = Router();

  /**
   * GET /api/v1/content
   * List all content with pagination
   */
  router.get('/', (req, res, next) => controller.listContent(req, res, next));

  /**
   * POST /api/v1/content
   * Create new content
   */
  router.post('/', (req, res, next) => controller.createContent(req, res, next));

  /**
   * GET /api/v1/content/:id
   * Get content by ID
   */
  router.get('/:id', (req, res, next) => controller.getContent(req, res, next));

  /**
   * PUT /api/v1/content/:id
   * Update content
   */
  router.put('/:id', (req, res, next) => controller.updateContent(req, res, next));

  /**
   * DELETE /api/v1/content/:id
   * Delete content
   */
  router.delete('/:id', (req, res, next) => controller.deleteContent(req, res, next));

  return router;
}
```

**Why:**
- Clear endpoint definitions
- Dependency injection (controller passed in)
- Documented endpoints

#### `api/dto/ContentDTOs.ts`
```typescript
// Request DTOs (validation)
export interface CreateContentDTO {
  text: string;
  author: AuthorDTO;
  platformId: string;
}

export interface UpdateContentDTO {
  text?: string;
  category?: string;
  status?: ContentStatus;
}

// Response DTOs (serialization)
export interface ContentResponseDTO {
  id: string;
  text: string;
  author: AuthorDTO;
  metrics: MetricsDTO;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}
```

**Why:**
- API contract definition
- Input validation
- Output formatting
- Decoupled from domain entities

**📚 Learn More:**
- [DTO Pattern](https://martinfowler.com/eaaCatalog/dataTransferObject.html)
- [REST API Best Practices](https://stackoverflow.blog/2020/03/02/best-practices-for-rest-api-design/)

---

## Feature Walkthroughs

Let's walk through complete features from entry point to database.

### Feature 1: Create Content

**User Story:** As a user, I want to create new content via the API.

**Entry Point:** `POST /api/v1/content`

**Flow:**

```
1. HTTP Request
   ↓
2. Express Router (api/routes/content.routes.ts)
   ↓
3. ContentController.createContent() (api/controllers/)
   ↓
4. ContentOrchestrationService.createContent() (application/services/)
   ↓
5. ContentService.validateAndEnrichContent() (domain/services/)
   ↓
6. Content entity validation (domain/entities/)
   ↓
7. MongoContentRepository.save() (infrastructure/persistence/)
   ↓
8. ContentMapper.toPersistence() (infrastructure/mappers/)
   ↓
9. MongoDB (database)
   ↓
10. ContentMapper.toDomain() (infrastructure/mappers/)
    ↓
11. Return Content entity up the chain
    ↓
12. HTTP Response
```

**Code Trace:**

```typescript
// 1. Request hits route
router.post('/', (req, res, next) => controller.createContent(req, res, next));

// 2. Controller receives request
async createContent(req: Request, res: Response, next: NextFunction) {
  const dto = { text: req.body.text, author: req.body.author };

  // 3. Calls application service
  const content = await this.orchestrationService.createContent(dto);

  res.status(201).json({ success: true, data: content.toPlain() });
}

// 4. Application service orchestrates
async createContent(data: CreateContentDTO): Promise<Content> {
  // 5. Create domain entity
  const content = Content.builder()
    .text(data.text)
    .status(ContentStatus.PENDING_CATEGORIZATION)
    .build();

  // 6. Domain validation
  const validated = await this.domainService.validateAndEnrichContent(content);

  // 7. Save via repository
  return await this.repository.save(validated);
}

// 8. Repository saves to database
async save(content: Content): Promise<Content> {
  // 9. Map to MongoDB document
  const doc = ContentMapper.toPersistence(content);

  // 10. Save to MongoDB
  const saved = await ContentModel.create(doc);

  // 11. Map back to domain
  return ContentMapper.toDomain(saved);
}
```

### Feature 2: Execute Automation

**User Story:** As the system, I want to automatically engage with queued content.

**Entry Point:** `GET /api/v1/automation/start`

**Flow:**

```
1. HTTP Request
   ↓
2. AutomationController.startAutomation()
   ↓
3. AutomationOrchestrator.executeAutomation()
   ↓
4. Find content: ContentRepository.findByStatus()
   ↓
5. For each content:
   ├─→ Generate text: LLMService.generateReply()
   ├─→ Execute action: ActionExecutor.executeAction()
   ├─→ Update status: ContentRepository.updateStatus()
   └─→ Rate limit delay
   ↓
6. Return results
```

**Code Trace:**

```typescript
// 1. Request hits route
router.get('/start', (req, res, next) => controller.startAutomation(req, res, next));

// 2. Controller delegates
async startAutomation(req: Request, res: Response) {
  // 3. Call orchestrator
  const result = await this.orchestrator.executeAutomation();
  res.json({ success: true, data: result });
}

// 4. Orchestrator coordinates workflow
async executeAutomation(): Promise<AutomationResult> {
  // 5. Find queued content
  const contents = await this.repository.findByStatus(
    ContentStatus.QUEUED_FOR_ENGAGEMENT
  );

  const results = [];

  // 6. Process each
  for (const content of contents) {
    // 7. Generate engagement text with LLM
    let text = 'Default reply';
    if (this.llmService) {
      const response = await this.llmService.generateReply(content);
      text = response.text;
    }

    // 8. Execute action (like, comment, etc.)
    const actionResult = await this.executeAction(content, text);
    results.push(actionResult);

    // 9. Update status
    await this.repository.updateStatus(
      content.id.toString(),
      ContentStatus.COMPLETED
    );

    // 10. Rate limiting
    await this.delay(1000);
  }

  return { results, totalProcessed: contents.length };
}
```

### Feature 3: User Authentication

**User Story:** As a user, I want to log in and receive a JWT token.

**Entry Point:** `POST /api/v1/auth/login` (if implemented)

**Current Flow:** Via middleware for protected routes

```
1. HTTP Request with Bearer token
   ↓
2. authenticate middleware (middleware/authenticate.ts)
   ↓
3. Extract JWT token from header
   ↓
4. AuthenticationService.verifyToken()
   ↓
5. MongoUserRepository.findById()
   ↓
6. User.isActive() check
   ↓
7. Attach user to req.user
   ↓
8. Continue to protected route
```

**Code Trace:**

```typescript
// 1. Middleware intercepts request
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  // 2. Extract token
  const authHeader = req.headers.authorization;
  const token = authHeader.substring(7); // Remove "Bearer "

  // 3. Verify token
  const decoded = authService.verifyToken(token); // { userId, email, role }

  // 4. Fetch user
  const user = await userRepository.findById(decoded.userId);

  // 5. Check active
  if (!user.isActive()) {
    throw new UnauthorizedError('Account suspended');
  }

  // 6. Attach to request
  req.user = {
    _id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  next(); // Continue to route handler
};

// Usage in routes
router.get('/protected', authenticate, (req, res) => {
  // req.user is now available
  res.json({ user: req.user });
});
```

### Feature 4: LLM Reply Generation

**User Story:** As the system, I want to generate intelligent replies using AI.

**Entry Point:** `AutomationOrchestrator` or direct service call

**Flow:**

```
1. Content entity
   ↓
2. OpenAILLMService.generateReply()
   ↓
3. LLMConfig.buildReplyPrompt()
   ↓
4. OpenAI API call
   ↓
5. Parse response
   ↓
6. Return LLMResponse (with fallback on error)
```

**Code Trace:**

```typescript
// 1. Called with content
async generateReply(content: Content): Promise<LLMResponse> {
  try {
    // 2. Build prompt from content
    const prompt = LLMConfig.buildReplyPrompt(content);
    // prompt.system = "You are a helpful assistant..."
    // prompt.user = "Generate a reply to: {content.text}"

    // 3. Call OpenAI API
    const completion = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    // 4. Parse and return
    return {
      text: completion.choices[0].message.content,
      model: completion.model,
      tokensUsed: completion.usage?.total_tokens,
      isFallback: false,
    };
  } catch (error) {
    // 5. Fallback on error
    logger.error('LLM failed, using fallback', { error });
    return {
      text: 'Great insights! Thanks for sharing.',
      model: 'fallback',
      tokensUsed: 0,
      isFallback: true,
    };
  }
}
```

**Why Fallback:**
- API might be down
- Rate limits hit
- Network issues
- **System remains functional** even without AI

---

## Request Flow Examples

### Example 1: Full Create Content Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Client: POST /api/v1/content                                 │
│ Body: { text: "Hello world", author: {...} }                │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Express Middleware Chain                                      │
│ 1. CORS                                                       │
│ 2. Body Parser (parses JSON)                                 │
│ 3. Request Logger                                             │
│ 4. Rate Limiter                                               │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Router: /api/v1/content                                       │
│ Route: POST /                                                 │
│ Handler: contentController.createContent                      │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ ContentController (API Layer)                                 │
│ - Extract DTO from req.body                                   │
│ - Validate basic HTTP concerns                                │
│ - Call orchestrationService.createContent(dto)                │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ ContentOrchestrationService (Application Layer)               │
│ - Build Content entity using builder                          │
│ - Set status = PENDING_CATEGORIZATION                         │
│ - Call domainService.validateAndEnrichContent()               │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ ContentService (Domain Layer)                                 │
│ - Validate: text length, content rules                        │
│ - Enrich: calculate initial metrics                           │
│ - Apply business rules                                        │
│ - Return validated Content entity                             │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ MongoContentRepository (Infrastructure Layer)                 │
│ - Call ContentMapper.toPersistence(content)                   │
│ - Save to MongoDB via Mongoose                                │
│ - Get saved document back                                     │
│ - Call ContentMapper.toDomain(doc)                            │
│ - Return Content entity                                       │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Response flows back up                                        │
│ - ContentOrchestrationService returns Content                 │
│ - ContentController calls content.toPlain()                   │
│ - Wraps in API response format                                │
│ - res.json({ success: true, data: {...} })                   │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Client receives: 201 Created                                  │
│ {                                                             │
│   "success": true,                                            │
│   "data": {                                                   │
│     "id": "twitter:123",                                      │
│     "text": "Hello world",                                    │
│     ...                                                       │
│   }                                                           │
│ }                                                             │
└──────────────────────────────────────────────────────────────┘
```

### Example 2: Authentication Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Client: GET /api/v1/content                                   │
│ Header: Authorization: Bearer eyJhbGc...                      │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ authenticate middleware (middleware/authenticate.ts)          │
│ 1. Extract token from Authorization header                    │
│ 2. Remove "Bearer " prefix                                    │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ AuthenticationService.verifyToken()                           │
│ - jwt.verify(token, JWT_SECRET)                              │
│ - Returns payload: { userId, email, role }                    │
│ - Throws if invalid/expired                                   │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ MongoUserRepository.findById(userId)                          │
│ - Query MongoDB for user                                      │
│ - Map document to User entity                                 │
│ - Return User or null                                         │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ User validation                                               │
│ - Check if user exists                                        │
│ - Check user.isActive()                                       │
│ - Throw UnauthorizedError if not active                       │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ Attach user to request                                        │
│ req.user = {                                                  │
│   _id: user.id,                                               │
│   email: user.email,                                          │
│   name: user.name,                                            │
│   role: user.role                                             │
│ }                                                             │
└──────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────┐
│ next() - Continue to route handler                            │
│ ContentController.listContent()                               │
│ - req.user is available                                       │
│ - Can check permissions: if (req.user.role === 'admin')       │
└──────────────────────────────────────────────────────────────┘
```

---

## Dependency Injection

### How It Works

**Without DI (bad):**
```typescript
export class ContentController {
  private service: ContentOrchestrationService;

  constructor() {
    // Tightly coupled - can't test or swap
    const repo = new MongoContentRepository();
    const domainService = new ContentService(repo);
    this.service = new ContentOrchestrationService(repo, domainService);
  }
}
```

**With DI (good):**
```typescript
export class ContentController {
  constructor(
    private readonly service: ContentOrchestrationService // Injected
  ) {}
}

// ApplicationContainer wires it
const repo = new MongoContentRepository();
const domainService = new ContentService(repo);
const service = new ContentOrchestrationService(repo, domainService);
const controller = new ContentController(service); // Inject
```

**Benefits:**
1. **Testability**: Inject mocks
   ```typescript
   const mockService = {
     createContent: jest.fn().mockResolvedValue(mockContent),
   };
   const controller = new ContentController(mockService);
   ```

2. **Flexibility**: Swap implementations
   ```typescript
   // Development
   const controller = new ContentController(new InMemoryService());

   // Production
   const controller = new ContentController(new MongoService());
   ```

3. **Clarity**: See all dependencies
   ```typescript
   constructor(
     private readonly serviceA: ServiceA,
     private readonly serviceB: ServiceB,
     private readonly serviceC: ServiceC
   ) {}
   // Clear what this class needs
   ```

### ApplicationContainer

The container wires everything:

```typescript
export class ApplicationContainer {
  constructor() {
    // Bottom-up construction

    // 1. Lowest level: repositories
    const contentRepo = new MongoContentRepository();
    const userRepo = new MongoUserRepository();

    // 2. Domain services (depend on repositories)
    const contentService = new ContentService(contentRepo);

    // 3. Infrastructure services
    const llmService = new OpenAILLMService();
    const platformRegistry = new PlatformRegistry();

    // 4. Application services (depend on domain + infrastructure)
    const orchestrationService = new ContentOrchestrationService(
      contentRepo,
      contentService
    );
    const platformService = new PlatformService(platformRegistry);

    // 5. Controllers (depend on application services)
    this.contentController = new ContentController(
      orchestrationService,
      platformService
    );
  }

  // Expose controllers for routing
  getContentController(): ContentController {
    return this.contentController;
  }
}
```

### Usage in app.ts

```typescript
// Create container once at startup
const appContainer = new ApplicationContainer();

export const createApp = (): Application => {
  const app = express();

  // ... middleware setup ...

  // Get controllers from container
  const contentController = appContainer.getContentController();
  const automationController = appContainer.getAutomationController();

  // Create routes with injected controllers
  const platformRouter = createPlatformApiRouter(
    contentController,
    automationController,
    platformController
  );

  // Mount routes
  app.use('/api/v1', platformRouter);

  return app;
};
```

---

## Testing Strategy

### Test Pyramid

```
        ┌──────────┐
       ╱  E2E (5%)  ╲
      ╱──────────────╲
     ╱  Integration   ╲
    ╱   Tests (25%)    ╲
   ╱────────────────────╲
  ╱    Unit Tests (70%)  ╲
 ╱────────────────────────╲
```

### Unit Tests

Test individual classes in isolation.

```typescript
// domain/services/__tests__/ContentService.test.ts
describe('ContentService', () => {
  let service: ContentService;
  let mockRepository: jest.Mocked<IContentRepository>;

  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      // ... other methods
    };

    // Inject mock
    service = new ContentService(mockRepository);
  });

  it('should validate content text length', async () => {
    // Arrange
    const content = Content.builder()
      .text('Too short') // Less than 10 chars
      .build();

    // Act & Assert
    await expect(
      service.validateAndEnrichContent(content)
    ).rejects.toThrow('Content text too short');
  });

  it('should enrich content with metrics', async () => {
    // Arrange
    const content = Content.builder()
      .text('Valid content here')
      .metrics(Metrics.zero())
      .build();

    // Act
    const result = await service.validateAndEnrichContent(content);

    // Assert
    expect(result.metrics.getTotalEngagement()).toBeGreaterThan(0);
  });
});
```

**Why Mock:**
- Fast (no database)
- Isolated (tests only ContentService)
- Predictable (control mock behavior)

### Integration Tests

Test layer interactions.

```typescript
// infrastructure/__tests__/MongoContentRepository.test.ts
describe('MongoContentRepository', () => {
  let repository: MongoContentRepository;

  beforeAll(async () => {
    // Connect to test database
    await connectDatabase(TEST_DB_URI);
    repository = new MongoContentRepository();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  beforeEach(async () => {
    // Clean database before each test
    await ContentModel.deleteMany({});
  });

  it('should save and retrieve content', async () => {
    // Arrange
    const content = Content.builder()
      .id('test-1')
      .text('Test content')
      .build();

    // Act
    await repository.save(content);
    const retrieved = await repository.findById('test-1');

    // Assert
    expect(retrieved).not.toBeNull();
    expect(retrieved!.text).toBe('Test content');
  });

  it('should map domain entity to MongoDB correctly', async () => {
    // Arrange
    const content = Content.builder()
      .text('Test')
      .metrics(new Metrics(10, 5, 2, 100))
      .build();

    // Act
    await repository.save(content);

    // Assert - check MongoDB directly
    const doc = await ContentModel.findById(content.id.toString());
    expect(doc!.metrics.likes).toBe(10);
    expect(doc!.metrics.comments).toBe(5);
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Specific suite
npm test -- ContentService.test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

**📚 Learn More:**
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [Test Pyramid Explained](https://martinfowler.com/articles/practical-test-pyramid.html)

---

## Common Development Tasks

### Task 1: Add a New Entity

**Example:** Add a "Comment" entity

**Steps:**

1. **Create domain entity** (`domain/entities/Comment.ts`):
```typescript
export class Comment {
  constructor(
    public readonly id: string,
    public readonly text: string,
    public readonly author: Author,
    public readonly contentId: string,
    public readonly createdAt: Date
  ) {}

  static builder(): CommentBuilder {
    return new CommentBuilder();
  }

  toPlain() {
    return { /* ... */ };
  }
}
```

2. **Create repository interface** (`domain/repositories/ICommentRepository.ts`):
```typescript
export interface ICommentRepository {
  findById(id: string): Promise<Comment | null>;
  findByContentId(contentId: string): Promise<Comment[]>;
  save(comment: Comment): Promise<Comment>;
  delete(id: string): Promise<void>;
}
```

3. **Create MongoDB schema** (`infrastructure/persistence/schemas/CommentSchema.ts`):
```typescript
const CommentSchema = new Schema({
  text: { type: String, required: true },
  authorId: { type: String, required: true },
  contentId: { type: String, required: true, index: true },
}, { timestamps: true });

export const CommentModel = model('Comment', CommentSchema);
```

4. **Create mapper** (`infrastructure/persistence/mappers/CommentMapper.ts`):
```typescript
export class CommentMapper {
  static toDomain(doc: CommentDocument): Comment { /* ... */ }
  static toPersistence(comment: Comment): Partial<CommentDocument> { /* ... */ }
}
```

5. **Implement repository** (`infrastructure/persistence/MongoCommentRepository.ts`):
```typescript
export class MongoCommentRepository implements ICommentRepository {
  async findById(id: string): Promise<Comment | null> { /* ... */ }
  async save(comment: Comment): Promise<Comment> { /* ... */ }
}
```

6. **Create application service** (`application/services/CommentService.ts`):
```typescript
export class CommentService {
  constructor(private readonly repository: ICommentRepository) {}

  async createComment(data: CreateCommentDTO): Promise<Comment> { /* ... */ }
  async getCommentsForContent(contentId: string): Promise<Comment[]> { /* ... */ }
}
```

7. **Create controller** (`api/controllers/CommentController.ts`):
```typescript
export class CommentController {
  constructor(private readonly service: CommentService) {}

  async createComment(req: Request, res: Response) { /* ... */ }
  async listComments(req: Request, res: Response) { /* ... */ }
}
```

8. **Add routes** (`api/routes/comment.routes.ts`):
```typescript
export function createCommentRoutes(controller: CommentController): Router {
  const router = Router();
  router.post('/', (req, res, next) => controller.createComment(req, res, next));
  router.get('/content/:contentId', (req, res, next) => controller.listComments(req, res, next));
  return router;
}
```

9. **Wire in container** (`application/ApplicationContainer.ts`):
```typescript
constructor() {
  // Add to container
  this.commentRepository = new MongoCommentRepository();
  this.commentService = new CommentService(this.commentRepository);
  this.commentController = new CommentController(this.commentService);
}
```

10. **Add tests**:
- Unit test for Comment entity
- Unit test for CommentService
- Integration test for MongoCommentRepository
- Unit test for CommentController

### Task 2: Add a New API Endpoint

**Example:** Add `GET /api/v1/content/:id/stats`

1. **Add method to service** (`application/services/ContentOrchestrationService.ts`):
```typescript
async getContentStats(id: string): Promise<ContentStats> {
  const content = await this.repository.findById(id);
  if (!content) throw new NotFoundError('Content not found');

  return {
    totalEngagement: content.metrics.getTotalEngagement(),
    engagementRate: content.metrics.getEngagementRate(),
    isViral: content.metrics.isViral(),
  };
}
```

2. **Add controller method** (`api/controllers/ContentController.ts`):
```typescript
async getContentStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await this.orchestrationService.getContentStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}
```

3. **Add route** (`api/routes/content.routes.ts`):
```typescript
router.get('/:id/stats', (req, res, next) => controller.getContentStats(req, res, next));
```

4. **Test it**:
```bash
curl http://localhost:4000/api/v1/content/twitter:123/stats
```

### Task 3: Swap Database from MongoDB to PostgreSQL

Thanks to Clean Architecture, this is straightforward:

1. **Create PostgreSQL schema** (infrastructure/persistence/schemas/):
```typescript
// Use TypeORM, Prisma, or raw SQL
```

2. **Implement IContentRepository** (infrastructure/persistence/):
```typescript
export class PostgresContentRepository implements IContentRepository {
  async findById(id: string): Promise<Content | null> {
    // PostgreSQL query here
  }
  // ... implement all methods
}
```

3. **Update ApplicationContainer**:
```typescript
constructor() {
  // OLD: this.contentRepository = new MongoContentRepository();
  this.contentRepository = new PostgresContentRepository();

  // Everything else stays the same!
}
```

4. **That's it!** Domain, application, and API layers unchanged.

### Task 4: Add Authentication to a Route

1. **Import middleware**:
```typescript
import { authenticate } from '../../../middleware/authenticate';
```

2. **Add to route**:
```typescript
// Before: anyone can access
router.post('/', (req, res, next) => controller.createContent(req, res, next));

// After: requires authentication
router.post('/', authenticate, (req, res, next) => controller.createContent(req, res, next));
```

3. **Use req.user in controller**:
```typescript
async createContent(req: Request, res: Response) {
  const userId = req.user!._id; // Available after authenticate
  // ... use userId in DTO
}
```

---

## Troubleshooting

### "Cannot find module" errors

**Problem:** TypeScript can't find imports

**Solutions:**
```bash
# Rebuild
npm run build

# Check tsconfig.json paths
{
  "compilerOptions": {
    "moduleResolution": "node",
    "baseUrl": "./src"
  }
}

# Check file extensions (.ts vs .js in imports)
import { Foo } from './Foo'; // Should be './Foo.js' for ESM
```

### "Circular dependency detected"

**Problem:** Two files import each other

**Solution:** Extract to a third file or use interfaces

```typescript
// ❌ Bad: Circular
// A.ts imports B.ts
// B.ts imports A.ts

// ✅ Good: Use interface
// IService.ts (interface)
// ServiceA.ts implements IService
// ServiceB.ts imports IService (not ServiceA)
```

### Database connection errors

```bash
# Check MongoDB is running
mongosh mongodb://localhost:27017

# Check connection string
MONGODB_URI=mongodb://localhost:27017/twitter-builder

# Check network
ping localhost
```

### LLM errors (OpenAI)

```bash
# Check API key
echo $OPENAI_API_KEY

# Check .env file
cat .env | grep OPENAI

# Test connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Tests failing

```bash
# Clear jest cache
npx jest --clearCache

# Run specific test
npm test -- ContentService.test.ts

# Run in verbose mode
npm test -- --verbose

# Check test database
MONGODB_URI=mongodb://localhost:27017/test npm test
```

---

## Additional Resources

### Books
- [Clean Architecture by Robert C. Martin](https://www.amazon.com/Clean-Architecture-Craftsmans-Software-Structure/dp/0134494164)
- [Domain-Driven Design by Eric Evans](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [Patterns of Enterprise Application Architecture by Martin Fowler](https://www.amazon.com/Patterns-Enterprise-Application-Architecture-Martin/dp/0321127420)

### Articles
- [Clean Architecture in Node.js](https://khalilstemmler.com/articles/software-design-architecture/organizing-app-logic/)
- [DDD, Hexagonal, Onion Architecture](https://herbertograca.com/2017/11/16/explicit-architecture-01-ddd-hexagonal-onion-clean-cqrs-how-i-put-it-all-together/)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

### Videos
- [Clean Architecture by Uncle Bob](https://www.youtube.com/watch?v=2dKZ-dWaCiU)
- [SOLID Principles Explained](https://www.youtube.com/watch?v=pTB30aXS77U)
- [Domain-Driven Design](https://www.youtube.com/watch?v=dnUFEg68ESM)

### Our Documentation
- [SETUP_GUIDE.md](./SETUP_GUIDE.md) - Setup instructions
- [DEPRECATED.md](./DEPRECATED.md) - Old code reference
- [TESTING.md](./TESTING.md) - Testing guide
- Phase Summaries in `docs/phase-summaries/`
- Code Reviews in `docs/phase-reviews/`

---

## Next Steps

Now that you understand the architecture:

1. **Set up locally**: Follow [SETUP_GUIDE.md](./SETUP_GUIDE.md)
2. **Run the app**: `npm run dev`
3. **Explore the code**: Start with `src/platform/core/`
4. **Run tests**: `npm test`
5. **Try examples**: `node --loader ts-node/esm src/examples/llm-integration-example.ts`
6. **Make a change**: Add a simple endpoint (Task 2 above)
7. **Read phase summaries**: Understand implementation history

**Welcome to the team! 🚀**

---

**Questions?** Check the troubleshooting section or review the phase documentation.

**Last Updated:** 2024-11-21
**Version:** 2.0.0
