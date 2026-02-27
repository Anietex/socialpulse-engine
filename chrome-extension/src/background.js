import { API_ENDPOINTS, DEFAULT_USER_ID, STORAGE_KEYS } from './constants.js';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "SEND_TWEETS") {
    return;
  }

  const { tweets } = message.payload || {};

  const postTweets = async () => {
    if (!Array.isArray(tweets) || tweets.length === 0) {
      sendResponse({ ok: true, stored: 0, message: "No tweets to send." });
      return;
    }

    try {
      // Get userId from storage or use default
      const storage = await chrome.storage.local.get([STORAGE_KEYS.USER_ID]);
      const userId = storage[STORAGE_KEYS.USER_ID] || DEFAULT_USER_ID;

      console.log(`Timeline Harvester: Sending ${tweets.length} tweets for user ${userId}`);

      const response = await fetch(API_ENDPOINTS.INGEST_TWEETS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tweets, userId }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        console.log(`Timeline Harvester: Successfully stored ${result.data?.stored || 0} tweets`);
        sendResponse({
          ok: true,
          status: response.status,
          data: result.data,
        });
      } else {
        console.error('Timeline Harvester: API error', result);
        sendResponse({
          ok: false,
          status: response.status,
          error: result.error || 'API request failed',
        });
      }
    } catch (error) {
      console.error('Timeline Harvester: Network error', error);
      sendResponse({
        ok: false,
        error: error?.message || "Failed to reach API",
      });
    }
  };

  postTweets();
  return true; // keep the message channel open for async response
});
