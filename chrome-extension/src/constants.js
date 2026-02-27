// API Configuration
const API_BASE_URL = 'https://xbuilder.test/api';
const API_ENDPOINTS = {
  CAN_START_SESSION: `${API_BASE_URL}/session/can-start`,
  INGEST_TWEETS: `${API_BASE_URL}/ingestion/tweets`,
  STATS: `${API_BASE_URL}/ingestion/stats`,
};

// Batch Configuration
const BATCH_SIZE = 300; // Number of tweets to collect before sending

// Polling Configuration
const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const POLL_RETRY_INTERVAL_MS = 30 * 1000; // 30 seconds on error

// Scroll Configuration
const SCROLL_INTERVAL_MS = 5000; // 5 seconds between scrolls
const HOVER_DURATION_MS = 3000; // 3 seconds hover duration

// Storage Keys
const STORAGE_KEYS = {
  TWEETS_BUFFER: 'timelineHarvester_tweetsBuffer',
  IS_ACTIVE: 'timelineHarvester_isActive',
  STATE: 'timelineHarvester_state',
  USER_ID: 'timelineHarvester_userId',
};

// App States
const APP_STATES = {
  IDLE: 'idle',
  POLLING: 'polling',
  SCROLLING: 'scrolling',
  SENDING: 'sending',
  COOLDOWN: 'cooldown',
};

// User ID (can be customized or set from settings)
const DEFAULT_USER_ID = 'anonymous';

// Export for ES6 modules (used by background.js service worker)
export {
  API_BASE_URL,
  API_ENDPOINTS,
  BATCH_SIZE,
  POLL_INTERVAL_MS,
  POLL_RETRY_INTERVAL_MS,
  SCROLL_INTERVAL_MS,
  HOVER_DURATION_MS,
  STORAGE_KEYS,
  APP_STATES,
  DEFAULT_USER_ID,
};
