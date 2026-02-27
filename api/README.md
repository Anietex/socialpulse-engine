# Twitter Builder API

Production-ready backend API for Twitter Builder built with Express.js and TypeScript.

## Features

- **TypeScript** - Type-safe code with full TypeScript support
- **Security** - Helmet, CORS, and rate limiting middleware
- **Logging** - Winston logger with file and console transports
- **Error Handling** - Centralized error handling middleware
- **Request Logging** - Morgan HTTP request logger
- **Compression** - Response compression for better performance
- **Environment Configuration** - Dotenv for environment variables
- **Code Quality** - ESLint and Prettier for code linting and formatting
- **Hot Reload** - Nodemon for development

## Project Structure

```
api/
├── src/
│   ├── config/          # Configuration files (env, logger)
│   ├── controllers/     # Route controllers
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic services
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── app.ts           # Express app setup
│   └── server.ts        # Server entry point
├── dist/                # Compiled JavaScript (gitignored)
├── logs/                # Log files (gitignored)
├── .env                 # Environment variables (gitignored)
├── .env.example         # Example environment variables
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

### Development

Run in development mode with hot reload:
```bash
npm run dev
```

### Production

Build the project:
```bash
npm run build
```

Start production server:
```bash
npm start
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Lint code with ESLint
- `npm run lint:fix` - Fix linting errors
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Check TypeScript types without compiling

## API Endpoints

### Health Checks

- `GET /api/health` - Application health status
- `GET /api/readiness` - Readiness probe
- `GET /api/liveness` - Liveness probe

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user (requires auth)
- `GET /api/auth/me` - Get current user (requires auth)

### Session Management

- `GET /api/session/can-start?userId=xyz` - Check if user can start a new scraping session (no auth required)
  - Returns: `canStartSession` (boolean), `lastSessionAt`, `nextSessionAt`, `minutesUntilNextSession`
  - Chrome extension polls this every 5 minutes to know when to start scraping
  - After ingesting tweets, session is locked for 30 minutes

### Tweet Ingestion

- `POST /api/ingestion/tweets` - Ingest tweets from Chrome extension (no auth required)
  - **Optimized for batch processing** - handles up to 300+ tweets per request
  - Accepts optional `userId` in request body
  - If no `userId` provided, defaults to 'anonymous'
  - Returns: `stored`, `totalUnique`, `accepted`, `skipped`, `processingTime`, `errors`
  - Uses bulk insert operations for high performance
  - Automatic deduplication based on `injectedId`
  - **Triggers 30-minute session cooldown** after ingestion
- `GET /api/ingestion/stats` - Get ingestion statistics (no auth required)
  - Accepts optional `userId` as query parameter
  - If no `userId` provided, returns stats for 'anonymous'

#### Batch Processing Performance

The ingestion endpoint is optimized for large batches:
- Single database query for duplicate detection (vs N queries)
- Bulk insert using MongoDB's `insertMany` (vs N inserts)
- Asynchronous queue job creation (non-blocking)
- Typical processing time: 100-300ms for 300 tweets

#### Session Flow (Chrome Extension Integration)

```javascript
// Chrome extension polls every 5 minutes
setInterval(async () => {
  const response = await fetch('/api/session/can-start?userId=xyz');
  const { canStartSession } = await response.json();

  if (canStartSession) {
    // Start scraping session
    const tweets = await scrapeTweets();

    // Send batch (triggers 30-min cooldown)
    await fetch('/api/ingestion/tweets', {
      method: 'POST',
      body: JSON.stringify({ tweets, userId: 'xyz' })
    });
  }
}, 5 * 60 * 1000); // Every 5 minutes
```

## Environment Variables

See `.env.example` for all available environment variables:

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 4000)
- `HOST` - Server host (default: localhost)
- `CORS_ORIGIN` - Allowed CORS origin
- `RATE_LIMIT_WINDOW_MS` - Rate limit window in milliseconds
- `RATE_LIMIT_MAX_REQUESTS` - Max requests per window
- `LOG_LEVEL` - Logging level (info/warn/error)

## Security Features

- **Helmet** - Sets various HTTP headers for security
- **CORS** - Configurable Cross-Origin Resource Sharing
- **Rate Limiting** - Prevents abuse by limiting requests per IP
- **Input Validation** - Express-validator for request validation

## Logging

The application uses Winston for logging with the following transports:

- Console (with colorized output in development)
- File (`logs/combined.log` - all logs)
- File (`logs/error.log` - error logs only)

## Error Handling

Centralized error handling with:
- Custom error middleware
- 404 handler for unknown routes
- Detailed error responses in development
- Sanitized error responses in production

## Performance

See [BATCH_PROCESSING.md](./BATCH_PROCESSING.md) for detailed information about batch processing optimizations and best practices.

## License

ISC
