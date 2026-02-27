# SocialPulse Engine

A production-grade social media engagement engine built with Clean Architecture, Domain-Driven Design, and a multi-stage content processing pipeline.

## Architecture Overview

```
Chrome Extension ──► Ingestion API ──► Processing Pipeline ──► Automation Engine
                         │                    │                       │
                    Zod Validation      OCR → Captioning →      Playwright
                    Batch Dedup        Categorize → Rank →     Human-like
                    MongoDB             Evaluate → Queue       Stealth Actions
```

| Layer | Purpose | Key Patterns |
|-------|---------|-------------|
| **Core** | Domain types, interfaces, value objects | Value Objects, Commands, Strategy |
| **Domain** | Entities, repository contracts, domain services | DDD Aggregates, Repository Pattern |
| **Application** | Orchestration, use cases, service coordination | CQRS-inspired, Dependency Injection |
| **Infrastructure** | MongoDB, Redis/BullMQ, Playwright, LLM providers | Adapter Pattern, Factory Pattern |
| **API** | Controllers, routes, validation, DTOs | RESTful, Zod schemas |
| **Adapters** | Platform-specific implementations (Twitter/X) | Strategy, Template Method |

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Runtime** | Node.js 20+, TypeScript 5, Express 4 |
| **Database** | MongoDB (Mongoose 8), Redis (ioredis) |
| **Queue** | BullMQ with dedicated workers per pipeline stage |
| **AI/ML** | Tesseract.js (OCR), BLIP (image captioning), Groq/OpenRouter LLMs |
| **Automation** | Playwright with stealth plugins, human behavior simulation |
| **Auth** | JWT (access + refresh tokens), bcrypt, role-based access |
| **Observability** | Winston logging, Prometheus metrics (prom-client) |
| **Validation** | Zod schemas with Express middleware |
| **Testing** | Jest 29, Supertest, ts-jest (ESM) |

## Project Structure

```
socialpulse-engine/
├── api/                              # Main application
│   ├── src/
│   │   ├── config/                   # Environment, logger configuration
│   │   ├── health/                   # Health/readiness/liveness endpoints
│   │   ├── middleware/               # Auth, validation, rate limiting, error handling
│   │   ├── observability/            # Prometheus metrics
│   │   ├── platform/
│   │   │   ├── core/                 # Domain types, interfaces, value objects
│   │   │   │   ├── commands/         # Command objects (ScrapeContent, ExecuteAction)
│   │   │   │   ├── errors/           # Domain-specific error types
│   │   │   │   ├── interfaces/       # Port definitions (IScraper, IActionExecutor, etc.)
│   │   │   │   ├── types/            # ContentStatus, ActionType, OCR/Captioning enums
│   │   │   │   └── value-objects/    # ContentId, PlatformId, Metrics
│   │   │   ├── domain/              # Business entities and repository contracts
│   │   │   │   ├── entities/         # Content, Author, Tweet, User, Batch, Job
│   │   │   │   ├── repositories/     # Repository interfaces (IContentRepo, ITweetRepo)
│   │   │   │   └── services/         # Domain services, OCR/captioning interfaces
│   │   │   ├── application/          # Use cases and orchestration
│   │   │   │   └── services/         # ContentOrchestration, AutomationOrchestrator, etc.
│   │   │   ├── infrastructure/       # External service implementations
│   │   │   │   ├── automation/       # Human behavior simulation (mouse, typing)
│   │   │   │   ├── browser/          # Playwright provider with stealth
│   │   │   │   ├── image-captioning/ # BLIP, Google Vision, OpenAI Vision adapters
│   │   │   │   ├── llm/             # Groq, OpenRouter, Ollama, OpenAI providers
│   │   │   │   ├── ocr/             # Tesseract, Google Vision adapters
│   │   │   │   ├── persistence/      # MongoDB repositories, schemas, mappers
│   │   │   │   ├── queue/           # BullMQ queues and stage-specific workers
│   │   │   │   └── registry/        # Platform registry (adapter discovery)
│   │   │   ├── adapters/            # Platform-specific implementations
│   │   │   │   └── twitter/          # Scraper, authenticator, action executor, selectors
│   │   │   └── api/                  # REST layer
│   │   │       ├── controllers/      # 11 controllers
│   │   │       ├── routes/           # Route factories with DI
│   │   │       ├── validators/       # Zod request schemas
│   │   │       └── dto/             # Data transfer objects
│   │   ├── shared/                   # Cross-cutting concerns
│   │   └── __tests__/               # Endpoint integration tests (Supertest)
│   ├── docs/                         # Technical documentation
│   └── jest.config.js
└── chrome-extension/                 # Manifest V3 content scraper
    └── src/                          # Content script, background worker
```

## API Endpoints

### Health & Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Service health with DB/Redis status |
| GET | `/readiness` | Kubernetes readiness probe |
| GET | `/liveness` | Kubernetes liveness probe |
| GET | `/metrics` | Prometheus metrics |

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | - | Register new user |
| POST | `/auth/login` | - | Login, returns JWT pair |
| POST | `/auth/refresh` | - | Refresh access token |
| GET | `/auth/me` | JWT | Get current user profile |
| POST | `/auth/logout` | JWT | Logout |

### Content Ingestion (Chrome Extension)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ingestion/tweets` | Batch ingest tweets (Zod validated) |
| GET | `/ingestion/stats` | Ingestion statistics |
| GET | `/session/can-start` | Check session cooldown |
| POST | `/session/reset` | Reset session lock |

### Content Pipeline (API v1)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/content/scrape` | Scrape single platform |
| POST | `/api/v1/content/scrape-multiple` | Scrape multiple platforms |
| GET | `/api/v1/content/:id` | Get content by ID |
| GET | `/api/v1/content/by-stage/:status` | Filter by pipeline stage |
| PUT | `/api/v1/content/status` | Batch update statuses |
| GET | `/api/v1/content/statistics` | Pipeline statistics |

### Automation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/automation/execute` | Execute engagement actions |
| POST | `/api/v1/automation/execute-multiple` | Multi-platform execution |
| POST | `/api/v1/automation/execute-action` | Execute specific action type |
| GET | `/api/v1/automation/preview` | Dry run preview |

### Platform Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/platforms` | List registered platforms |
| GET | `/api/v1/platforms/health` | Platform health checks |
| GET | `/api/v1/platforms/capabilities` | Platform capabilities |
| POST | `/api/v1/platforms/:id/browser/init` | Initialize browser session |
| POST | `/api/v1/platforms/:id/auth/authenticate` | Platform authentication |

*Plus 21 additional endpoints for users, tweets, analytics, OCR, image captioning, and browser session management.*

## Content Processing Pipeline

```
Ingestion ──► OCR ──► Image Captioning ──► Categorization ──► Ranking ──► Action ──► Engagement
   │           │            │                    │              │           │            │
 Batch      Tesseract    BLIP/GPT-4V         LLM-based      Scoring    Determine    Playwright
 Dedup      on media     on images           classification   algorithm  like/reply   with stealth
 MongoDB    images       alt-text                                        /retweet    human behavior
```

Each stage is a BullMQ worker with configurable concurrency. Content moves through statuses:
`pending_ocr` → `pending_image_captioning` → `pending_categorization` → `pending_ranking` → `pending_action` → `queued_for_engagement` → `engaging` → `engaged`

## Getting Started

### Prerequisites
- Node.js >= 20.0.0
- MongoDB (local or Atlas)
- Redis

### Quick Start
```bash
cd api
npm install
cp .env.example .env    # Configure your environment
npm run dev             # Start with hot reload
```

### Environment Setup
See `api/.env.example` for all configuration options including:
- MongoDB/Redis connection strings
- JWT secrets
- LLM provider configuration (Groq, OpenRouter, Ollama, OpenAI)
- OCR and image captioning provider selection
- Queue concurrency settings

## Testing

```bash
cd api
npm test                # Run all 405 tests
npm run test:endpoints  # Run 66 endpoint integration tests
npm run test:core       # Run domain/core unit tests
npm run typecheck       # TypeScript type checking (0 errors)
```

**Test coverage:** 405 tests across 25 suites covering domain logic, value objects, service orchestration, and HTTP endpoint integration.

## Key Technical Decisions

- **Clean Architecture layering** enforces dependency inversion - infrastructure depends on domain, never the reverse
- **Platform Adapter pattern** makes adding new social platforms a matter of implementing 5 interfaces (scraper, normalizer, authenticator, action executor, rate limiter)
- **BullMQ pipeline** with per-stage workers allows independent scaling and retry policies for each processing step
- **Zod validation** at API boundaries with typed DTOs provides runtime safety without runtime overhead in domain logic
- **Stealth automation** uses Playwright with human behavior simulation (mouse curves, typing delays, scroll patterns) to avoid detection
- **Multi-provider LLM support** with factory pattern allows switching between Groq, OpenRouter, Ollama, and OpenAI without code changes
- **JWT dual-token auth** with access/refresh token rotation for secure session management

## License

MIT
