# Chrome Extension Ingestion Format

## ✅ Fully Backward Compatible

The ingestion endpoint `/ingestion/tweets` supports **BOTH** old and new formats for seamless Chrome extension compatibility.

---

## 📋 Supported Formats

### Format 1: NEW (Simplified) ✅
```json
POST /ingestion/tweets
{
  "userId": "user_123",
  "tweets": [
    {
      "injectedId": "1234567890",
      "text": "Amazing AI breakthrough!",
      "user": {
        "name": "John Doe",
        "handle": "johndoe",
        "avatar": "https://pbs.twimg.com/profile_images/..."
      },
      "url": "https://twitter.com/johndoe/status/1234567890",
      "media": {
        "images": [
          "https://pbs.twimg.com/media/image1.jpg",
          "https://pbs.twimg.com/media/image2.jpg"
        ],
        "videos": ["https://video.twimg.com/ext_tw_video/..."],
        "gifs": ["https://pbs.twimg.com/tweet_video/..."]
      },
      "metrics": {
        "likes": 100,
        "replies": 10,
        "reposts": 5,
        "views": 1000
      },
      "scrapedAt": "2025-01-15T12:00:00Z"
    }
  ]
}
```

### Format 2: OLD (With Alt Text) ✅
```json
POST /ingestion/tweets
{
  "userId": "user_123",
  "tweets": [
    {
      "injectedId": "1234567890",
      "text": "Amazing AI breakthrough!",
      "user": {
        "name": "John Doe",
        "handle": "johndoe",
        "avatar": "https://pbs.twimg.com/profile_images/..."
      },
      "media": {
        "images": [
          {
            "url": "https://pbs.twimg.com/media/image1.jpg",
            "alt": "AI diagram showing neural network architecture"
          },
          {
            "url": "https://pbs.twimg.com/media/image2.jpg",
            "alt": "Performance metrics graph"
          }
        ],
        "videos": ["https://video.twimg.com/ext_tw_video/..."],
        "gifs": ["https://pbs.twimg.com/tweet_video/..."]
      },
      "metrics": {
        "likes": 100,
        "replies": 10,
        "reposts": 5,
        "views": 1000
      },
      "scrapedAt": "2025-01-15T12:00:00Z"
    }
  ]
}
```

---

## 🔄 Automatic Conversions

### 1. URL Auto-Generation
If `url` field is missing, it will be automatically generated:
```javascript
// Missing URL
{
  "injectedId": "1234567890",
  "user": { "handle": "johndoe", ... }
  // No url field
}

// ✅ Backend generates:
// https://twitter.com/johndoe/status/1234567890
```

### 2. Image Format Handling
Backend accepts both formats and preserves alt text:
```javascript
// String format
"images": ["https://pbs.twimg.com/media/image1.jpg"]

// Object format
"images": [{ "url": "https://pbs.twimg.com/media/image1.jpg", "alt": "Description" }]

// ✅ Both are stored in Content entity with alt text preserved
```

### 3. Metrics Field Mapping
```javascript
// Chrome Extension sends:
{
  "metrics": {
    "likes": 100,
    "replies": 10,    // Twitter terminology
    "reposts": 5,     // Twitter terminology
    "views": 1000
  }
}

// ✅ Backend stores as:
{
  "metrics": {
    "likes": 100,
    "comments": 10,   // Generic terminology
    "shares": 5,      // Generic terminology
    "views": 1000
  }
}
```

---

## ✅ Required Fields

| Field | Required? | Description |
|-------|-----------|-------------|
| `injectedId` | ✅ Yes | Unique tweet ID |
| `text` | ✅ Yes | Tweet text content |
| `user.name` | ✅ Yes | Author display name |
| `user.handle` | ✅ Yes | Author handle (e.g., johndoe) |
| `user.avatar` | ❌ No | Profile picture URL |
| `url` | ❌ No | Tweet URL (auto-generated if missing) |
| `media` | ❌ No | Media attachments |
| `metrics` | ❌ No | Engagement metrics |
| `scrapedAt` | ❌ No | Timestamp (defaults to now) |

---

## 📊 Response Format

```json
{
  "stored": 10,
  "totalUnique": 1234,
  "accepted": 10,
  "skipped": 0,
  "errors": [],
  "processingTime": 245,
  "batchId": "abc123def456"
}
```

| Field | Description |
|-------|-------------|
| `stored` | Number of new tweets stored |
| `totalUnique` | Total unique tweets in database |
| `accepted` | Total tweets in request |
| `skipped` | Number of duplicates skipped |
| `errors` | Array of error messages (if any) |
| `processingTime` | Time in milliseconds |
| `batchId` | Batch ID for tracking |

---

## 🔍 What Happens After Ingestion?

```
1. Ingestion (Chrome Extension → Backend)
   ↓
   Status: PENDING_CATEGORIZATION

2. CategorizationWorker (Automatic)
   ↓
   Status: PENDING_RANKING

3. RankingWorker (Automatic)
   ↓
   Status: QUEUED_FOR_ENGAGEMENT (if rank ≥ 40)
   Status: SKIPPED (if rank < 40)

4. AutomationOrchestrator (Manual Trigger)
   POST /api/v1/automation/execute
   ↓
   Status: ENGAGING → ENGAGED
```

---

## 🚀 Chrome Extension Example

```javascript
// Chrome Extension - Content Script
async function sendTweetsToBackend(tweets) {
  const formattedTweets = tweets.map(tweet => ({
    injectedId: tweet.id,
    text: tweet.text,
    user: {
      name: tweet.author.name,
      handle: tweet.author.handle,
      avatar: tweet.author.avatar
    },
    // URL is optional - will be auto-generated if missing
    url: tweet.url,
    // Images can be strings OR objects with alt text
    media: {
      images: tweet.media.images.map(img => ({
        url: img.url,
        alt: img.alt  // Alt text preserved!
      })),
      videos: tweet.media.videos.map(v => v.url),
      gifs: tweet.media.gifs.map(g => g.url)
    },
    metrics: {
      likes: tweet.likes,
      replies: tweet.replies,
      reposts: tweet.retweets,
      views: tweet.views
    },
    scrapedAt: new Date().toISOString()
  }));

  const response = await fetch('http://localhost:3000/ingestion/tweets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'user_123',
      tweets: formattedTweets
    })
  });

  return await response.json();
}
```

---

## ✨ Key Features

✅ **100% Backward Compatible** - No Chrome extension changes required
✅ **Alt Text Preservation** - Image descriptions are preserved
✅ **URL Auto-Generation** - Missing URLs are automatically created
✅ **Flexible Image Format** - Accepts both strings and objects
✅ **Duplicate Detection** - Prevents duplicate tweets
✅ **Batch Processing** - Efficient bulk ingestion
✅ **Error Handling** - Detailed error messages

---

## 🧪 Testing

Test both formats to verify compatibility:

```bash
# Test with simplified format (strings)
curl -X POST http://localhost:3000/ingestion/tweets \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "tweets": [{
      "injectedId": "test123",
      "text": "Test tweet",
      "user": {
        "name": "Test User",
        "handle": "testuser"
      },
      "media": {
        "images": ["https://example.com/image1.jpg"]
      }
    }]
  }'

# Test with alt text format (objects)
curl -X POST http://localhost:3000/ingestion/tweets \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test_user",
    "tweets": [{
      "injectedId": "test124",
      "text": "Test tweet with alt text",
      "user": {
        "name": "Test User",
        "handle": "testuser"
      },
      "media": {
        "images": [{
          "url": "https://example.com/image2.jpg",
          "alt": "Test image description"
        }]
      }
    }]
  }'
```

Both requests should succeed! ✅
