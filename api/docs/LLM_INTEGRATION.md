# LLM Integration Guide

The Twitter Builder API supports multiple LLM providers for generating automated engagement content (replies and quotes).

## Supported Providers

### 1. OpenAI (Cloud-based)
- Uses OpenAI's GPT models
- Requires API key
- Best for: Production use with high quality requirements

### 2. Ollama (Local)
- Uses locally-hosted LLM models
- No API key required
- Best for: Development, privacy, cost savings

## Configuration

### Environment Variables

#### Choosing Provider

```bash
# Provider selection (openai or ollama)
LLM_PROVIDER=ollama  # or 'openai'
```

If `LLM_PROVIDER` is not set:
- Defaults to **OpenAI** if `OPENAI_API_KEY` is found
- Otherwise defaults to **Ollama**

#### OpenAI Configuration

```bash
# OpenAI API Key (required for OpenAI provider)
OPENAI_API_KEY=sk-...

# Optional: Override default model (default: gpt-4o-mini)
LLM_MODEL=gpt-4o-mini

# Optional: Temperature (0-1, default: 0.7)
LLM_TEMPERATURE=0.7

# Optional: Max tokens (default: 150)
LLM_MAX_TOKENS=150

# Optional: Request timeout in ms (default: 30000)
LLM_TIMEOUT=30000
```

#### Ollama Configuration

```bash
# Ollama Base URL (default: http://localhost:11434)
OLLAMA_BASE_URL=http://localhost:11434

# Ollama Model (default: llama3.2)
OLLAMA_MODEL=llama3.2

# Optional: Temperature (0-1, default: 0.7)
OLLAMA_TEMPERATURE=0.7

# Optional: Max tokens (default: 500)
OLLAMA_MAX_TOKENS=500

# Optional: Request timeout in ms (default: 60000)
OLLAMA_TIMEOUT=60000
```

## Using Ollama

### 1. Install Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Or download from https://ollama.com/download
```

### 2. Pull a Model

```bash
# Default model (recommended)
ollama pull llama3.2

# Or other models:
ollama pull llama3.1
ollama pull mistral
ollama pull codellama
ollama pull gemma2
```

### 3. Start Ollama

```bash
# Ollama runs as a background service
ollama serve

# Verify it's running
curl http://localhost:11434/api/tags
```

### 4. Configure Environment

```bash
# .env file
LLM_PROVIDER=ollama
OLLAMA_MODEL=llama3.2
```

### 5. Start API

```bash
npm run dev
```

You should see:
```
INFO: Creating Ollama LLM service
INFO: Ollama LLM Service initialized
INFO: LLM service initialized successfully
INFO: LLM service health check { available: true, provider: 'ollama' }
```

## How It Works

### Architecture

```
ApplicationContainer
    ↓
LLMProvider.createFromEnvironment()
    ↓
├── OpenAILLMService (if LLM_PROVIDER=openai)
│   └── Calls OpenAI API
│
└── OllamaLLMService (if LLM_PROVIDER=ollama)
    └── Calls local Ollama instance
```

Both services implement the same `ILLMService` interface:
- `generateReply(content)` - Generate reply text
- `generateQuote(content)` - Generate quote text
- `generateForAction(actionType, content)` - Generate for specific action
- `isAvailable()` - Check service health
- `getHealth()` - Get health status

### Automatic Fallback

If LLM generation fails, both providers automatically fall back to pre-written templates:

**Reply fallbacks:**
- "Great insights! Thanks for sharing."
- "This is really interesting, thanks for posting!"
- "Appreciate you sharing this perspective."
- ...

**Quote fallbacks:**
- "Interesting perspective on this topic!"
- "Worth reading and considering!"
- "Great points made here."
- ...

## Usage in Code

The LLM service is available through the ApplicationContainer:

```typescript
// Get LLM service from container
const llmService = appContainer.getAutomationOrchestrator().llmService;

// Generate reply
const reply = await llmService.generateReply(content);
console.log(reply.text);
console.log(reply.isFallback); // false if LLM succeeded

// Generate quote
const quote = await llmService.generateQuote(content);
console.log(quote.text);
```

## Switching Providers

You can switch providers without code changes:

```bash
# Use OpenAI
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...

# Or use Ollama
export LLM_PROVIDER=ollama
ollama serve
```

Restart the API and the new provider will be used automatically.

## Performance Comparison

### OpenAI
- **Latency**: ~1-3 seconds per generation
- **Quality**: Excellent
- **Cost**: ~$0.0001-0.0005 per generation
- **Availability**: Requires internet

### Ollama (llama3.2)
- **Latency**: ~2-10 seconds per generation (depends on hardware)
- **Quality**: Good to excellent (model-dependent)
- **Cost**: Free
- **Availability**: Works offline

## Recommended Models

### For Production (OpenAI)
- `gpt-4o-mini` - Best balance of cost/quality
- `gpt-4o` - Highest quality (more expensive)

### For Development (Ollama)
- `llama3.2` - Fast, good quality (recommended)
- `llama3.1` - Better quality, slower
- `mistral` - Fast, efficient
- `gemma2` - Good for social media tasks

## Troubleshooting

### Ollama: "Service not available"

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not, start it
ollama serve

# Verify model is pulled
ollama list
```

### Ollama: "Model not found"

```bash
# Pull the model
ollama pull llama3.2

# Verify it's available
ollama list
```

### OpenAI: "Invalid API key"

```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Test with curl
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

### Generation taking too long

```bash
# Reduce max tokens
export OLLAMA_MAX_TOKENS=200  # or LLM_MAX_TOKENS for OpenAI

# Increase temperature for faster but less careful responses
export OLLAMA_TEMPERATURE=0.9
```

## Advanced: Custom Provider

You can also programmatically create a provider:

```typescript
import { LLMProvider, LLMProviderType } from './infrastructure/llm/LLMProvider';

// Create OpenAI service
const openai = LLMProvider.create({
  provider: LLMProviderType.OPENAI,
  openai: {
    apiKey: 'sk-...',
    model: 'gpt-4o',
    temperature: 0.7,
  },
});

// Create Ollama service
const ollama = LLMProvider.create({
  provider: LLMProviderType.OLLAMA,
  ollama: {
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2',
    temperature: 0.7,
  },
});
```

## Health Checks

The API performs automatic health checks on startup and logs the result:

```
INFO: Creating Ollama LLM service
INFO: Ollama LLM Service initialized
INFO: LLM service initialized successfully
INFO: LLM service health check { available: true, provider: 'ollama' }
```

If the provider is unavailable, the service will fall back to templates for all generations.

## Best Practices

1. **Development**: Use Ollama to save costs and work offline
2. **Production**: Use OpenAI for consistency and quality
3. **Testing**: Both providers work identically - tests don't need to change
4. **Monitoring**: Check logs for fallback usage (indicates LLM issues)
5. **Rate Limiting**: Both providers respect configured timeouts and handle errors gracefully
