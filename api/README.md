# SocialPulse Engine - API

The core backend service. Built with Express.js, TypeScript, and Clean Architecture principles.

## Development

```bash
npm install
cp .env.example .env
npm run dev          # Hot reload via nodemon
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled production build |
| `npm test` | Run all tests (405 tests, 25 suites) |
| `npm run test:endpoints` | Supertest endpoint integration tests |
| `npm run test:core` | Domain/core unit tests |
| `npm run typecheck` | Type check without emitting |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Prettier formatting |

## Architecture

The codebase follows **Clean Architecture** with **DDD** tactical patterns:

```
src/
├── platform/
│   ├── core/           # Innermost ring: types, interfaces, value objects
│   ├── domain/         # Entities, repository contracts, domain services
│   ├── application/    # Use case orchestrators (no framework deps)
│   ├── infrastructure/ # MongoDB, Redis, Playwright, LLM implementations
│   ├── adapters/       # Platform-specific code (Twitter/X adapter)
│   └── api/            # Express controllers, routes, validators
├── middleware/          # Express middleware (auth, validation, rate limit)
├── health/             # Health check endpoints
├── shared/             # Cross-cutting utilities
└── __tests__/          # Endpoint integration tests
```

**Dependency rule:** Inner layers never import from outer layers. `core/` defines interfaces, `infrastructure/` implements them.

## Content Processing Pipeline

Content flows through 7 BullMQ stages, each with its own worker:

1. **OCR** - Extract text from tweet images (Tesseract.js)
2. **Image Captioning** - Generate descriptions (BLIP, Google Vision, or OpenAI Vision)
3. **Categorization** - LLM-based topic classification
4. **Ranking** - Score content by engagement potential
5. **Action Determination** - Decide engagement type (like, reply, retweet, quote)
6. **Queue** - Rate-limited engagement queue
7. **Execution** - Playwright automation with human behavior simulation

## Configuration

All configuration is via environment variables. See `.env.example` for the complete list. Key sections:

- **Server**: PORT, HOST, CORS_ORIGIN
- **Database**: MONGODB_URI, REDIS_HOST/PORT
- **Auth**: JWT_SECRET, JWT_EXPIRES_IN
- **LLM**: Provider selection (Groq, OpenRouter, Ollama, OpenAI) with model/API key config
- **OCR**: Provider selection (Tesseract, Google Vision), worker pool size
- **Image Captioning**: Provider selection (BLIP, Google Vision, OpenAI Vision)
- **Queues**: Per-stage concurrency settings

## Adding a New Platform

The adapter pattern makes platform integration straightforward. Implement these interfaces from `platform/core/interfaces/`:

1. `IContentScraper` - Fetch content from the platform
2. `IContentNormalizer` - Transform platform data to domain entities
3. `IAuthenticator` - Handle platform authentication
4. `IActionExecutor` - Execute engagement actions
5. `IRateLimitProvider` - Platform-specific rate limits

Register the adapter in `PlatformRegistry` and the pipeline handles everything else.

## Testing Strategy

- **Domain tests** (`platform/core/__tests__/`, `platform/domain/__tests__/`) - Pure unit tests for value objects, entities, domain logic
- **Service tests** (`platform/application/__tests__/`) - Orchestration tests with mocked repositories
- **Endpoint tests** (`__tests__/endpoints/`) - Supertest integration tests verifying route wiring, validation, and controller dispatch

All tests run without external dependencies (no MongoDB, Redis, or network calls required).
