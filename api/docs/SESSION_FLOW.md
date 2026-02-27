# Session Flow Documentation

## Overview

The session management system prevents the Chrome extension from scraping too frequently. After ingesting tweets, the system waits for all automation (replies/likes/quotes) to complete before allowing a new scraping session. There is no time limit - automation can take hours if needed.

## Flow Diagram

```
┌─────────────────┐
│ Chrome Extension│
│ (Polls every    │
│  5 minutes)     │
└────────┬────────┘
         │
         ↓
   ┌─────────────────────────┐
   │ GET /session/can-start? │
   │ userId=xyz              │
   └──────────┬──────────────┘
              │
              ↓
        ┌─────────┐
        │Response:│
        │ {       │
        │  canStartSession: true │
        │ }       │
        └────┬────┘
             │
             ↓ (if true)
    ┌───────────────────┐
    │ Scrape tweets     │
    │ (300 tweets)      │
    └────────┬──────────┘
             │
             ↓
    ┌────────────────────────┐
    │ POST /ingestion/tweets │
    │ { tweets, userId }     │
    └───────────┬────────────┘
                │
                ↓
         ┌──────────────────┐
         │ 1. Insert tweets │
         │ 2. Set flag:     │
         │    canStartSession │
         │    = false       │
         │ 3. Schedule job  │
         │    (30 min delay)│
         └──────┬───────────┘
                │
                ↓
        ┌───────────────┐
        │ Response:     │
        │ {             │
        │  stored: 285  │
        │  ...          │
        │ }             │
        └───────────────┘
                │
                │ ... Tweets processed through pipeline ...
                │
                ↓
        ┌───────────────────────┐
        │ Automation Worker     │
        │ Completes all replies,│
        │ likes, quotes         │
        └───────────┬───────────┘
                    │
                    ↓
            ┌──────────────┐
            │ Set flag:    │
            │ canStartSession│
            │ = true       │
            └──────────────┘
                    │
                    ↓
            (Extension polls
             and sees true,
             starts new session)

Note: No time limit - automation can take
      as long as needed (even hours)
```

## API Endpoints

### 1. Check Session Availability

**Endpoint:** `GET /api/session/can-start?userId=xyz`

**Response when available:**
```json
{
  "success": true,
  "data": {
    "canStartSession": true,
    "userId": "test-user-123",
    "lastSessionAt": null,
    "nextSessionAt": null
  }
}
```

**Response during cooldown:**
```json
{
  "success": true,
  "data": {
    "canStartSession": false,
    "userId": "test-user-123",
    "lastSessionAt": "2025-01-18T12:00:00.000Z",
    "nextSessionAt": "2025-01-18T12:30:00.000Z",
    "minutesUntilNextSession": 25
  }
}
```

### 2. Ingest Tweets (Triggers Cooldown)

**Endpoint:** `POST /api/ingestion/tweets`

**Request:**
```json
{
  "userId": "test-user-123",
  "tweets": [
    {
      "injectedId": "tweet-001",
      "text": "Example tweet",
      "user": {
        "name": "John Doe",
        "handle": "johndoe"
      }
    }
  ]
}
```

**What happens:**
1. Tweets are inserted into MongoDB
2. `canStartSession` set to `false`
3. `nextSessionAt` set to `null` (waits for automation completion)
4. Tweets go through processing pipeline (cleanup → OCR → categorization → ranking → engagement → automation)
5. When ALL automation completes, `canStartSession` reset to `true`
6. No time limit - automation can take hours if needed

## Database Schema

### SessionState Collection

```javascript
{
  _id: ObjectId,
  userId: "test-user-123",
  canStartSession: false,
  lastSessionAt: ISODate("2025-01-18T12:00:00.000Z"),
  nextSessionAt: ISODate("2025-01-18T12:30:00.000Z"),
  createdAt: ISODate("2025-01-18T11:00:00.000Z"),
  updatedAt: ISODate("2025-01-18T12:00:00.000Z")
}
```

## Session Reset Mechanism

Sessions reset automatically when automation completes:

- **Triggered by:** Automation worker when all automation completes
- **Timing:** As soon as the last automation job finishes (typically minutes, but can be hours)
- **No time limit:** Automation can take as long as needed
- **Benefit:** Users can start new sessions immediately after automation completes

### Session Lifecycle

1. **Started:** When tweets are ingested → `canStartSession = false`
2. **Processing:** Tweets go through pipeline (cleanup → OCR → categorization → ranking → engagement → automation)
3. **Completed:** Last automation finishes → `canStartSession = true`
4. **Available:** Extension can start new scraping session

## Chrome Extension Integration

### Polling Implementation

```javascript
// Background script
const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const API_BASE = 'http://localhost:4000/api';
const USER_ID = 'user-123';

async function checkAndStartSession() {
  try {
    // Check if can start session
    const response = await fetch(`${API_BASE}/session/can-start?userId=${USER_ID}`);
    const { data } = await response.json();

    if (data.canStartSession) {
      console.log('✅ Can start new session');
      await startScrapingSession();
    } else {
      console.log(`⏳ Session in cooldown (${data.minutesUntilNextSession} min remaining)`);
    }
  } catch (error) {
    console.error('Failed to check session:', error);
  }
}

async function startScrapingSession() {
  // Scrape tweets from timeline
  const tweets = await scrapeTweets();

  // Send batch to API
  const response = await fetch(`${API_BASE}/ingestion/tweets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: USER_ID,
      tweets: tweets
    })
  });

  const result = await response.json();
  console.log(`✅ Ingested ${result.data.stored} tweets`);
  console.log(`⏱️  Next session in 30 minutes`);
}

// Poll every 5 minutes
setInterval(checkAndStartSession, POLL_INTERVAL);

// Check immediately on startup
checkAndStartSession();
```

## Testing

### Run the test script:

```bash
# Start the API
npm run dev

# In another terminal, run the test
node test-session-flow.js
```

### Test Output:

```
🧪 Testing Session Flow

════════════════════════════════════════════════════════════

📋 Step 1: Check initial session state
   Can start session: ✅ YES

📋 Step 2: Ingest tweets (triggers 30-min cooldown)
   ✅ Ingested 5 tweets
   ⏱️  Processing time: 45ms

📋 Step 3: Check session state after ingestion
   Can start session: ❌ NO
   Last session at: 1/18/2025, 12:00:00 PM
   Next session at: 1/18/2025, 12:30:00 PM
   Minutes until next: 30 min

📋 Step 4: Polling session state (like Chrome extension would)
   Polling every 5 seconds for 30 seconds...

   [12:00:05 PM] Poll 1/6 - ⏳ COOLDOWN (30 min remaining)
   [12:00:10 PM] Poll 2/6 - ⏳ COOLDOWN (30 min remaining)
   [12:00:15 PM] Poll 3/6 - ⏳ COOLDOWN (29 min remaining)
   [12:00:20 PM] Poll 4/6 - ⏳ COOLDOWN (29 min remaining)
   [12:00:25 PM] Poll 5/6 - ⏳ COOLDOWN (29 min remaining)
   [12:00:30 PM] Poll 6/6 - ⏳ COOLDOWN (29 min remaining)

════════════════════════════════════════════════════════════

✨ Session Flow Test Completed!

📝 Summary:
   - Session resets when: Automation completes
   - Typical reset time: Minutes to hours (depends on automation complexity)
   - No time limit: Automation can take as long as needed
   - Current state: In cooldown
   - Next available session: When automation completes

💡 Note: Sessions reset automatically when automation completes.
   No fallback timer - automation can run for hours if needed.
```

## Configuration

### Session Reset Timing

Sessions reset automatically when automation completes (no configuration needed).

**No time limits:** Automation can take as long as needed - hours if necessary.

**Important:** Ensure automation completes properly, as sessions will remain locked until automation finishes. Monitor automation logs to ensure jobs complete successfully.

### Poll Interval

The Chrome extension should poll every 5 minutes, but this can be adjusted based on your needs.

## Monitoring

Check worker logs to see session resets:

```bash
# Watch logs
tail -f logs/combined.log | grep -i session

# Expected output:
# Session started for user test-user-123. Will reset when automation completes (no time limit)
# ... automation runs (can take minutes to hours) ...
# ✅ BATCH abc123 COMPLETED
# Resetting session for user test-user-123 after automation completion
# ✅ Session reset for user test-user-123, can start new session now
```

## Troubleshooting

### Session not resetting after automation

1. **Check if automation completed:**
   ```bash
   # Look for "BATCH COMPLETED" and session reset in logs
   tail -f logs/combined.log | grep -E "BATCH|session"
   ```

2. **Check automation worker is running:**
   ```bash
   # Look for automation worker logs
   tail -f logs/combined.log | grep -i automation
   ```

3. **If automation is stuck:**
   - Check for errors in automation logs
   - Automation can take hours - this is normal
   - If truly stuck, you may need to manually reset:
     ```bash
     # Connect to MongoDB and reset manually
     db.sessionstates.updateOne(
       { userId: "user-id" },
       { $set: { canStartSession: true, nextSessionAt: null } }
     )
     ```

### Multiple sessions starting

- Ensure the Chrome extension checks `canStartSession` BEFORE scraping
- The API sets the flag immediately after ingestion
- There's a small race condition window (< 1 second)

## Future Enhancements

- [x] Reset session after automation completes (implemented!)
- [x] Remove time limits - allow automation to run for hours (implemented!)
- [ ] Add manual session reset endpoint for admins
- [ ] Session metrics and analytics
- [ ] Notification when session becomes available
- [ ] Queue dashboard integration
- [ ] Track average automation completion time per user
- [ ] Add automation health monitoring and alerts
