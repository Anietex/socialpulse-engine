# Twitter Builder API - Setup Guide

Complete setup guide for the Twitter Builder API with Phase 7 LLM Integration.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Configuration](#environment-configuration)
4. [Database Setup](#database-setup)
5. [LLM Integration Setup](#llm-integration-setup)
6. [Running the Application](#running-the-application)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v20.x or higher
- **MongoDB**: v6.0 or higher
- **Redis**: v7.0 or higher (for queues)
- **npm** or **yarn**: Latest version

### Optional

- **Docker** & **Docker Compose**: For containerized deployment
- **OpenAI API Key**: For LLM-powered reply/quote generation (Phase 7)

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd twitter-builder/api
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Express.js (API framework)
- Mongoose (MongoDB ODM)
- BullMQ (Queue management)
- OpenAI SDK (LLM integration)
- Playwright (Browser automation)
- And more...

---

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Required Variables

Edit `.env` and set the following **required** variables:

```bash
# Server
PORT=4000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/twitter-builder

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
JWT_SECRET=your-secret-key-change-in-production
```

### 3. Configure LLM Integration (Phase 7)

**For OpenAI-powered replies/quotes** (recommended):

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your-actual-api-key-here
LLM_MODEL=gpt-4o-mini
LLM_TEMPERATURE=0.7
LLM_MAX_TOKENS=150
```

**Get an OpenAI API Key**:
1. Visit https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys
4. Create a new secret key
5. Copy and paste into `.env`

**Without OpenAI** (fallback mode):
- Leave `OPENAI_API_KEY` empty or comment it out
- System will use predefined fallback texts
- No AI-generated content, but fully functional

### 4. Optional Twitter/X Configuration

```bash
TWITTER_USERNAME=your_twitter_username
TWITTER_PASSWORD=your_twitter_password
TWITTER_EMAIL=your_email@example.com
```

---

## Database Setup

### 1. Start MongoDB

**Using Docker**:
```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:latest
```

**Using Local Installation**:
```bash
mongod --dbpath /path/to/data
```

### 2. Verify Connection

```bash
mongosh mongodb://localhost:27017/twitter-builder
```

### 3. Start Redis

**Using Docker**:
```bash
docker run -d \
  --name redis \
  -p 6379:6379 \
  redis:latest
```

**Using Local Installation**:
```bash
redis-server
```

---

## LLM Integration Setup

### Option 1: OpenAI (Recommended)

**Step 1**: Get API Key
- Visit https://platform.openai.com/api-keys
- Create new secret key

**Step 2**: Configure
```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
LLM_MODEL=gpt-4o-mini  # Cost-effective, fast
LLM_TEMPERATURE=0.7     # Creativity level (0-1)
LLM_MAX_TOKENS=150      # Max response length
```

**Step 3**: Test
```bash
npm run test:llm
```

### Option 2: Fallback Mode (No API Key)

- No configuration needed
- Uses predefined reply/quote texts
- Fully functional automation
- No costs

**Fallback texts used**:
- Replies: "Great insights! Thanks for sharing." (+ 4 more variations)
- Quotes: "Interesting perspective on this topic!" (+ 4 more variations)

### Costs & Usage

**OpenAI gpt-4o-mini pricing** (as of 2024):
- Input: $0.15 / 1M tokens
- Output: $0.60 / 1M tokens

**Estimated costs**:
- Per reply/quote: ~$0.00003 (3 cents per 1000 generations)
- 100 engagements/day: ~$0.10/month
- 1000 engagements/day: ~$1.00/month

---

## Running the Application

### Development Mode

```bash
npm run dev
```

This starts:
- API server on port 4000
- Auto-reload on file changes
- Verbose logging

### Production Mode

```bash
npm run build
npm start
```

### Running Example Scripts

**LLM Integration Example**:
```bash
node --loader ts-node/esm src/examples/llm-integration-example.ts
```

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Core tests
npm run test:core

# LLM integration tests
npm run test -- LLMConfig

# Coverage report
npm run test:coverage
```

### Test LLM Integration

```bash
# Direct LLM test (requires OPENAI_API_KEY)
npm run test:llm

# Test automation with LLM
npm run test -- AutomationOrchestrator
```

---

## Deployment

### Docker Deployment

**Step 1**: Build image
```bash
docker build -t twitter-builder-api .
```

**Step 2**: Run container
```bash
docker run -d \
  --name api \
  -p 4000:4000 \
  --env-file .env \
  twitter-builder-api
```

### Docker Compose

```bash
docker-compose up -d
```

Starts:
- API service
- MongoDB
- Redis
- (Optional) Monitoring tools

### Environment Variables in Production

**Security**:
- ✅ Use strong JWT_SECRET
- ✅ Set NODE_ENV=production
- ✅ Use environment variable management (AWS Secrets Manager, etc.)
- ✅ Never commit .env file

**LLM Configuration**:
- ✅ Protect OPENAI_API_KEY
- ✅ Monitor token usage
- ✅ Set appropriate rate limits

---

## Troubleshooting

### Issue: "OPENAI_API_KEY environment variable is required"

**Solution**:
1. Check `.env` file has `OPENAI_API_KEY=sk-...`
2. Restart application after adding key
3. Or: Remove/comment out key to use fallback mode

### Issue: "LLM service unavailable"

**Diagnosis**:
```bash
# Check health endpoint
curl http://localhost:4000/api/health
```

**Solutions**:
- Verify API key is valid
- Check network connectivity
- Review OpenAI service status
- System will automatically use fallbacks

### Issue: "MongoDB connection failed"

**Solution**:
```bash
# Check MongoDB is running
docker ps | grep mongodb
# or
mongosh mongodb://localhost:27017
```

### Issue: "Redis connection failed"

**Solution**:
```bash
# Check Redis is running
docker ps | grep redis
# or
redis-cli ping
```

### Issue: High OpenAI costs

**Solutions**:
1. Reduce `LLM_MAX_TOKENS` (default: 150)
2. Use more specific prompts
3. Cache similar content responses
4. Switch to fallback mode for less important content
5. Monitor usage in OpenAI dashboard

### Issue: TypeScript compilation errors

**Solution**:
```bash
# Clean build
rm -rf dist
npm run build

# Check for errors
npm run typecheck
```

---

## Monitoring & Logs

### View Logs

```bash
# Application logs
tail -f logs/app.log

# Error logs
tail -f logs/error.log

# LLM logs
grep "LLM" logs/app.log
```

### Health Check

```bash
curl http://localhost:4000/api/health
```

### Metrics

```bash
# Prometheus metrics (if enabled)
curl http://localhost:9090/metrics
```

---

## Configuration Reference

### Core Settings

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment |
| `PORT` | Yes | 4000 | API port |
| `MONGODB_URI` | Yes | - | MongoDB connection |
| `REDIS_HOST` | Yes | localhost | Redis host |

### LLM Settings (Phase 7)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | No* | - | OpenAI API key |
| `LLM_MODEL` | No | gpt-4o-mini | Model to use |
| `LLM_TEMPERATURE` | No | 0.7 | Creativity (0-1) |
| `LLM_MAX_TOKENS` | No | 150 | Max response length |
| `LLM_TIMEOUT` | No | 30000 | Timeout (ms) |

*Required for AI-generated content, optional if using fallback mode

### Rate Limiting

| Variable | Default | Description |
|----------|---------|-------------|
| `TWITTER_LIKE_LIMIT` | 50 | Likes per hour |
| `TWITTER_RETWEET_LIMIT` | 30 | Retweets per hour |
| `TWITTER_COMMENT_LIMIT` | 20 | Comments per hour |
| `TWITTER_QUOTE_LIMIT` | 15 | Quotes per hour |

---

## Next Steps

1. ✅ Complete environment setup
2. ✅ Test LLM integration
3. ✅ Configure Twitter credentials
4. ✅ Run example scripts
5. ✅ Deploy to production
6. Monitor and optimize

---

## Support

For issues or questions:
- Check [Troubleshooting](#troubleshooting)
- Review logs
- Check OpenAI service status
- Review application documentation

---

## Version Information

- **Platform Module**: Phases 1-7 Complete
- **LLM Integration**: Phase 7
- **Testing & Setup**: Phase 8
- **Status**: Production Ready

Last Updated: 2024-11-21
