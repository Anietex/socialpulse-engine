# Batch Processing in Twitter Builder API

## Overview

The tweet ingestion endpoint is designed to handle large batches of tweets efficiently (e.g., 300 tweets at once). This document explains the optimizations and best practices.

## Performance Optimizations

### 1. Batch Duplicate Detection
**Old approach (slow):**
```javascript
for (const tweet of tweets) {
  const exists = await Tweet.findOne({ injectedId: tweet.injectedId }); // N queries
}
```

**New approach (fast):**
```javascript
const injectedIds = tweets.map(t => t.injectedId);
const existingTweets = await Tweet.find({ injectedId: { $in: injectedIds } }); // 1 query
```

### 2. Bulk Insert
**Old approach (slow):**
```javascript
for (const tweet of tweets) {
  await Tweet.create(tweet); // N inserts
}
```

**New approach (fast):**
```javascript
await Tweet.insertMany(tweets, { ordered: false }); // 1 bulk operation
```

### 3. Asynchronous Queue Jobs
Queue jobs are created asynchronously and don't block the response:
```javascript
Promise.all(tweets.map(t => addCleanupJob(t._id))).catch(...);
// Response sent immediately, jobs queued in background
```

## API Response

### Successful Batch Response
```json
{
  "success": true,
  "data": {
    "stored": 285,
    "totalUnique": 1234,
    "accepted": 300,
    "skipped": 15,
    "processingTime": 243
  }
}
```

### Fields Explained
- `stored`: Number of new tweets inserted
- `totalUnique`: Total tweets for this user in database
- `accepted`: Total tweets in the request
- `skipped`: Tweets that already existed (duplicates)
- `processingTime`: Time taken in milliseconds
- `errors`: Array of error messages (only if errors occurred)

## Performance Benchmarks

Typical performance for batch sizes:

| Tweets | Processing Time | Operations |
|--------|----------------|------------|
| 50     | 50-100ms       | Excellent  |
| 100    | 100-150ms      | Excellent  |
| 300    | 200-300ms      | Good       |
| 500    | 300-500ms      | Acceptable |

## Best Practices

### Chrome Extension Integration

1. **Batch Size**: Recommended 100-300 tweets per batch
2. **Debouncing**: Wait for user to stop scrolling before sending
3. **Retry Logic**: Implement exponential backoff for failures

Example:
```javascript
let tweetBuffer = [];
let debounceTimer;

function onNewTweet(tweet) {
  tweetBuffer.push(tweet);

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (tweetBuffer.length > 0) {
      sendBatch(tweetBuffer);
      tweetBuffer = [];
    }
  }, 2000); // Wait 2s after last tweet

  // Force send if buffer reaches 300
  if (tweetBuffer.length >= 300) {
    clearTimeout(debounceTimer);
    sendBatch(tweetBuffer);
    tweetBuffer = [];
  }
}

async function sendBatch(tweets) {
  try {
    const response = await fetch('http://localhost:4000/api/ingestion/tweets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tweets })
    });

    const result = await response.json();
    console.log(`Ingested ${result.data.stored} new tweets`);
  } catch (error) {
    console.error('Failed to ingest batch:', error);
    // Retry logic here
  }
}
```

## Error Handling

The API uses `ordered: false` for bulk inserts, which means:
- If some tweets fail (e.g., duplicate key), others still get inserted
- Partial success is reported in the response
- Individual errors are captured in the `errors` array

## Monitoring

Watch these metrics in production:
- Average `processingTime` per batch
- `skipped` vs `stored` ratio (indicates duplicate rate)
- Error frequency and types

## Database Indexes

Ensure these indexes exist for optimal performance:
```javascript
db.tweets.createIndex({ injectedId: 1 }, { unique: true })
db.tweets.createIndex({ userId: 1, createdAt: -1 })
db.tweets.createIndex({ status: 1 })
```

These are automatically created by Mongoose schemas.
