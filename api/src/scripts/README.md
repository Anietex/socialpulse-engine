# LLM Testing Script

Test the LLM service with real tweets from your database.

## Prerequisites

1. MongoDB running with tweets in the database
2. LLM model downloaded at the path specified in `.env`
3. Environment variables configured

## Usage

```bash
# From the api directory
npm run test:llm
```

## What It Does

1. **Connects to MongoDB** - Uses your configured database connection
2. **Fetches 12 random tweets** - Gets tweets with cleanedText from database
3. **Initializes LLM** - Loads the Qwen-4B model
4. **Tests Categorization** - Runs batch categorization on tweets
5. **Tests Evaluation** - Runs batch evaluation with hybrid scoring
6. **Displays Results** - Shows:
   - Individual tweet categorizations
   - Evaluation scores (sorted by final score)
   - Performance metrics (time per tweet)
   - Category distribution
   - Quality vs Engagement scores

## Sample Output

```
🚀 Starting LLM Test...

📦 Connecting to MongoDB...
✅ Connected to MongoDB

🧠 Initializing LLM service...
✅ LLM service initialized

📝 Fetching tweets from database...
✅ Found 12 tweets

================================================================================
📋 TWEETS TO PROCESS
================================================================================

[0] @user1
    This is a sample tweet about programming...
    Metrics: 150 likes, 25 reposts

[1] @user2
    Another tweet about AI and machine learning...
    Metrics: 300 likes, 50 reposts

...

================================================================================
🏷️  CATEGORIZATION RESULTS
================================================================================

[0] Category: Programming
    Confidence: high
    Tweet: This is a sample tweet about programming...

...

================================================================================
📊 EVALUATION RESULTS
================================================================================

[1] Final Score: 85/100
    Quality Score (LLM): 90/100
    Engagement Score: 75/100
    Category: Programming
    Tweet: High quality technical content...
    Metrics: 300 likes, 50 reposts

...

⚡ PERFORMANCE SUMMARY
================================================================================
Total tweets processed: 12
Categorization time: 12500ms (1041ms per tweet)
Evaluation time: 11800ms (983ms per tweet)
Total time: 24300ms
Average time per tweet: 2025ms
================================================================================

📈 CATEGORY DISTRIBUTION
================================================================================
Programming: 4 tweets (33.3%)
AI: 3 tweets (25.0%)
Business: 2 tweets (16.7%)
Technology: 2 tweets (16.7%)
Other: 1 tweets (8.3%)
================================================================================

✅ LLM Test completed successfully!
```

## Troubleshooting

### Error: "No tweets found in database"
- Make sure you have tweets ingested
- Check that tweets have `cleanedText` field populated
- Run the cleanup worker first if needed

### Error: "Model not found"
- Check `LLM_MODEL_PATH` in `.env`
- Ensure the model file exists at that location
- Download the model if needed

### Slow performance
- First run is slower (model loading)
- CPU inference is slower than GPU
- Expected: ~1-2 seconds per tweet on CPU

### Out of memory
- Reduce batch size in `llm.config.ts`
- Use quantized model (Q4 instead of FP16)
- Close other applications

## Configuration

Modify test parameters in `test-llm.ts`:

```typescript
// Change number of tweets to test
const tweets = await Tweet.find({
  cleanedText: { $exists: true, $ne: '' },
})
  .limit(12); // ← Change this
  // Note: Don't use .lean() if you need virtual fields like textWithDescriptions
```

## What to Look For

**Good categorization:**
- Categories match tweet content
- Appropriate confidence ratings:
  - **high**: Clear, unambiguous categorization
  - **medium**: Reasonable fit but some ambiguity
  - **low**: Difficult to categorize or multi-category
- Consistent classifications

**Good evaluation:**
- High quality tweets get high scores
- Engagement metrics properly weighted
- Viral content ranks higher

**Performance:**
- ~1-2 seconds per tweet (CPU)
- Batch processing faster than individual
- No memory leaks or crashes

## Next Steps

After successful testing:
1. Run the full API with workers
2. Ingest tweets through the extension
3. Monitor categorization in production
4. Adjust evaluation weights if needed
