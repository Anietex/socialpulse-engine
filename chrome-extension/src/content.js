(function () {
  if (window.__timelineHarvesterInitialized) {
    return;
  }
  window.__timelineHarvesterInitialized = true;

  // Constants (inline since content scripts can't use ES6 imports)
  const API_BASE_URL = 'https://xbuilder.test/api';
  const API_ENDPOINTS = {
    CAN_START_SESSION: `${API_BASE_URL}/session/can-start`,
    INGEST_TWEETS: `${API_BASE_URL}/ingestion/tweets`,
    STATS: `${API_BASE_URL}/ingestion/stats`,
  };
  const BATCH_SIZE = 250;
  const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
  const POLL_RETRY_INTERVAL_MS = 30 * 1000; // 30 seconds
  const SCROLL_INTERVAL_MS = 5000; // 5 seconds
  const HOVER_DURATION_MS = 3000; // 3 seconds
  const STUCK_CHECK_THRESHOLD = 30000; // 30 seconds - refresh if stuck
  const STUCK_CHECK_COUNT = 6; // Number of failed scroll attempts before refresh
  const STORAGE_KEYS = {
    TWEETS_BUFFER: 'timelineHarvester_tweetsBuffer',
    IS_ACTIVE: 'timelineHarvester_isActive',
    STATE: 'timelineHarvester_state',
    USER_ID: 'timelineHarvester_userId',
    NEEDS_INITIAL_REFRESH: 'timelineHarvester_needsInitialRefresh',
  };
  const APP_STATES = {
    IDLE: 'idle',
    POLLING: 'polling',
    SCROLLING: 'scrolling',
    SENDING: 'sending',
    COOLDOWN: 'cooldown',
  };
  const DEFAULT_USER_ID = 'anonymous';

  // State variables
  let currentState = APP_STATES.IDLE;
  let isActive = false;
  let pollIntervalId = null;
  let scrollIntervalId = null;
  let toggleButton = null;
  let statusDisplay = null;
  const seenTweets = new Set();

  // Stuck detection variables
  let lastScrollY = 0;
  let lastTweetCount = 0;
  let stuckCounter = 0;
  let lastProgressTime = Date.now();

  // Utility functions
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const randomId = () =>
    crypto?.randomUUID
      ? crypto.randomUUID()
      : `tweet-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  // Check if the scraper is stuck and refresh if needed
  const checkIfStuckAndRefresh = async () => {
    const currentScrollY = window.scrollY;
    const currentTweetCount = seenTweets.size;
    const now = Date.now();

    // Check if we've made progress (scroll position changed OR new tweets found)
    const hasScrolled = Math.abs(currentScrollY - lastScrollY) > 10;
    const hasNewTweets = currentTweetCount > lastTweetCount;
    const hasProgress = hasScrolled || hasNewTweets;

    if (hasProgress) {
      // Reset stuck counter - we're making progress
      stuckCounter = 0;
      lastProgressTime = now;
      lastScrollY = currentScrollY;
      lastTweetCount = currentTweetCount;
      return false; // Not stuck
    }

    // No progress detected
    stuckCounter++;
    console.log(`Timeline Harvester: No progress detected (${stuckCounter}/${STUCK_CHECK_COUNT})`);

    // Check if we've been stuck for too long
    const timeSinceProgress = now - lastProgressTime;
    const shouldRefresh = stuckCounter >= STUCK_CHECK_COUNT || timeSinceProgress >= STUCK_CHECK_THRESHOLD;

    if (shouldRefresh) {
      console.warn('Timeline Harvester: Page appears stuck - refreshing...');

      // Save any collected tweets before refresh
      const tweets = await getStoredTweets();
      if (tweets.length > 0) {
        console.log(`Timeline Harvester: Saving ${tweets.length} tweets before refresh`);
      }

      // Refresh the page
      window.location.reload();
      return true; // Stuck and refreshing
    }

    return false; // Stuck but not yet time to refresh
  };

  // Storage helpers
  const getStoredTweets = async () => {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.TWEETS_BUFFER]);
      return result[STORAGE_KEYS.TWEETS_BUFFER] || [];
    } catch (error) {
      console.error('Timeline Harvester: Failed to get stored tweets', error);
      return [];
    }
  };

  const addTweetsToStorage = async (newTweets) => {
    try {
      const storedTweets = await getStoredTweets();
      const combined = [...storedTweets, ...newTweets];
      await chrome.storage.local.set({ [STORAGE_KEYS.TWEETS_BUFFER]: combined });
      return combined.length;
    } catch (error) {
      console.error('Timeline Harvester: Failed to store tweets', error);
      return 0;
    }
  };

  const clearStoredTweets = async () => {
    try {
      await chrome.storage.local.remove([STORAGE_KEYS.TWEETS_BUFFER]);
      console.log('Timeline Harvester: Storage cleared');
    } catch (error) {
      console.error('Timeline Harvester: Failed to clear storage', error);
    }
  };

  const getTweetCount = async () => {
    const tweets = await getStoredTweets();
    return tweets.length;
  };

  // API functions
  const checkCanStartSession = async () => {
    try {
      const storage = await chrome.storage.local.get([STORAGE_KEYS.USER_ID]);
      const userId = storage[STORAGE_KEYS.USER_ID] || DEFAULT_USER_ID;

      const response = await fetch(`${API_ENDPOINTS.CAN_START_SESSION}?userId=${userId}`);
      const result = await response.json();

      if (result.success && result.data) {
        return {
          canStart: result.data.canStartSession,
          minutesUntilNext: result.data.minutesUntilNextSession || 0,
        };
      }

      return { canStart: false, minutesUntilNext: 0 };
    } catch (error) {
      console.error('Timeline Harvester: Failed to check session', error);
      return { canStart: false, minutesUntilNext: 0 };
    }
  };

  const sendBatch = async (tweets) => {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'SEND_TWEETS', payload: { tweets } },
        (response) => {
          const err = chrome.runtime.lastError;
          if (err) {
            console.warn('Timeline Harvester: Message failed', err.message);
            resolve(false);
            return;
          }

          if (!response?.ok) {
            console.warn(
              'Timeline Harvester: API rejected payload',
              response?.status,
              response?.error || response?.data
            );
          }
          resolve(Boolean(response?.ok));
        }
      );
    });
  };

  // Tweet extraction functions (from original)
  const scrollTimeline = () => {
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  };

  const extractUser = (article) => {
    const userBlock = article.querySelector('div[data-testid="User-Name"]');
    if (!userBlock) {
      return { name: '', handle: '' };
    }

    const spans = Array.from(userBlock.querySelectorAll('span'));
    let name = '';
    let handle = '';

    spans.forEach((span) => {
      const value = span.textContent?.trim();
      if (!value) {
        return;
      }

      if (value.startsWith('@') && !handle) {
        handle = value;
      } else if (!name) {
        name = value;
      }
    });

    return { name, handle };
  };

  const extractTweetText = (article) => {
    const textNodes = Array.from(
      article.querySelectorAll('div[data-testid="tweetText"] span')
    );
    return textNodes.map((node) => node.textContent ?? '').join(' ').trim();
  };

  const uniqueList = (values) => Array.from(new Set(values.filter(Boolean)));

  const parseCount = (value) => {
    if (!value) {
      return 0;
    }
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) {
      return 0;
    }

    const suffixMatch = cleaned.match(/^([\d.]+)\s*([KkMmBb])$/);
    if (suffixMatch) {
      const num = parseFloat(suffixMatch[1]);
      const suffix = suffixMatch[2].toLowerCase();
      const multiplier =
        suffix === 'k' ? 1e3 : suffix === 'm' ? 1e6 : suffix === 'b' ? 1e9 : 1;
      return Math.round(num * multiplier);
    }

    const parsed = Number(cleaned);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const extractMedia = (article) => {
    const imageElements = Array.from(article.querySelectorAll('div[data-testid="tweetPhoto"] img'));
    const images = imageElements
      .map((img) => ({
        url: img.currentSrc || img.src,
        alt: img.alt || '',
      }))
      .filter((img) => img.url);

    const videos = [];
    const gifs = [];

    Array.from(article.querySelectorAll('video')).forEach((video) => {
      const src = video.currentSrc || video.src;
      if (!src) {
        return;
      }

      const isGif =
        Boolean(video.closest('div[data-testid="gifPlayable"]')) ||
        video.getAttribute('loop') === 'true';

      if (isGif) {
        gifs.push(src);
      } else {
        videos.push(src);
      }
    });

    return {
      images,
      videos: uniqueList(videos),
      gifs: uniqueList(gifs),
    };
  };

  const extractMetrics = (article) => {
    const countFromTestId = (testId) => {
      const target = article.querySelector(`[data-testid="${testId}"] span`);
      return parseCount(target?.textContent ?? '');
    };

    const extractViews = () => {
      const analyticsLink = article.querySelector('a[href*="/analytics"]');
      if (!analyticsLink) {
        return 0;
      }
      const spanWithNumber = Array.from(analyticsLink.querySelectorAll('span')).find(
        (span) => parseCount(span.textContent ?? '') > 0
      );
      return parseCount(spanWithNumber?.textContent ?? '');
    };

    return {
      replies: countFromTestId('reply'),
      likes: countFromTestId('like'),
      reposts: countFromTestId('retweet'),
      views: extractViews(),
    };
  };

  const extractTweets = () => {
    const articles = document.querySelectorAll('article[data-testid="tweet"]');
    const newTweets = [];

    articles.forEach((article) => {
      if (!article.dataset.extensionId) {
        article.dataset.extensionId = randomId();
      }

      const injectedId = article.dataset.extensionId;
      if (seenTweets.has(injectedId)) {
        return;
      }

      const text = extractTweetText(article);
      const media = extractMedia(article);
      const hasMedia =
        media.images.length > 0 || media.videos.length > 0 || media.gifs.length > 0;

      // Skip if no text and no media
      if (!text && !hasMedia) {
        return;
      }

      // Skip if no text and all image alts are empty
      if (!text && media.images.length > 0) {
        const hasAnyAlt = media.images.some((img) => img.alt && img.alt.trim());
        if (!hasAnyAlt) {
          return;
        }
      }

      const user = extractUser(article);

      // Skip tweets without valid user data (validation requirement)
      if (!user.name || !user.handle) {
        console.warn('Timeline Harvester: Skipping tweet without valid user data', injectedId);
        return;
      }

      const metrics = extractMetrics(article);
      const tweetPayload = {
        injectedId,
        text,
        user,
        scrapedAt: new Date().toISOString(),
        url: article.querySelector("a[href*='/status/']")?.href ?? null,
        media,
        metrics,
      };

      seenTweets.add(injectedId);
      newTweets.push(tweetPayload);
    });

    return newTweets;
  };

  // State management functions
  const setState = (newState) => {
    console.log(`Timeline Harvester: State change ${currentState} → ${newState}`);
    currentState = newState;
    updateUI();
  };

  // Core logic functions
  const startPolling = () => {
    if (pollIntervalId) {
      return;
    }

    console.log('Timeline Harvester: Starting polling...');
    setState(APP_STATES.POLLING);

    // Check immediately
    checkSessionAndAct();

    // Then check every interval
    pollIntervalId = setInterval(checkSessionAndAct, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (pollIntervalId) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
      console.log('Timeline Harvester: Stopped polling');
    }
  };

  const checkSessionAndAct = async () => {
    if (!isActive) {
      return;
    }

    setState(APP_STATES.POLLING);

    const { canStart, minutesUntilNext } = await checkCanStartSession();

    if (canStart) {
      console.log('Timeline Harvester: Session available, starting scrolling...');
      stopPolling();
      startScrolling();
    } else {
      console.log(`Timeline Harvester: Session cooldown - ${minutesUntilNext} min remaining`);
      setState(APP_STATES.COOLDOWN);
    }
  };

  const startScrolling = () => {
    if (scrollIntervalId) {
      return;
    }

    console.log('Timeline Harvester: Starting scrolling and collection...');
    setState(APP_STATES.SCROLLING);

    // Reset stuck detection when starting fresh
    lastScrollY = window.scrollY;
    lastTweetCount = seenTweets.size;
    stuckCounter = 0;
    lastProgressTime = Date.now();

    // Scroll and collect immediately
    scrollAndCollect();

    // Then continue at intervals
    scrollIntervalId = setInterval(scrollAndCollect, SCROLL_INTERVAL_MS);
  };

  const stopScrolling = () => {
    if (scrollIntervalId) {
      clearInterval(scrollIntervalId);
      scrollIntervalId = null;
      console.log('Timeline Harvester: Stopped scrolling');
    }
  };

  const scrollAndCollect = async () => {
    if (!isActive || currentState !== APP_STATES.SCROLLING) {
      return;
    }

    // Check if we're stuck before doing anything
    const isStuck = await checkIfStuckAndRefresh();
    if (isStuck) {
      return; // Page is refreshing, don't continue
    }

    // Scroll the timeline
    scrollTimeline();

    // Extract tweets
    const newTweets = extractTweets();

    if (newTweets.length > 0) {
      console.log(`Timeline Harvester: Collected ${newTweets.length} new tweets`);

      // Add to storage
      const totalCount = await addTweetsToStorage(newTweets);
      console.log(`Timeline Harvester: Total in buffer: ${totalCount}`);

      updateUI();

      // Check if batch is full
      if (totalCount >= BATCH_SIZE) {
        console.log(`Timeline Harvester: Batch full (${totalCount}/${BATCH_SIZE}), sending...`);
        stopScrolling();
        await sendBatchAndReset();
      }
    }
  };

  const sendBatchAndReset = async () => {
    setState(APP_STATES.SENDING);

    const tweets = await getStoredTweets();

    if (tweets.length === 0) {
      console.log('Timeline Harvester: No tweets to send');
      resumePolling();
      return;
    }

    console.log(`Timeline Harvester: Sending batch of ${tweets.length} tweets...`);

    const success = await sendBatch(tweets);

    if (success) {
      console.log('Timeline Harvester: Batch sent successfully');
      await clearStoredTweets();
      seenTweets.clear();
      // Clear refresh flag - next session should start with fresh page
      await chrome.storage.local.remove([STORAGE_KEYS.NEEDS_INITIAL_REFRESH]);
    } else {
      console.error('Timeline Harvester: Failed to send batch, will retry next time');
    }

    // Resume polling to wait for next session
    resumePolling();
  };

  const resumePolling = () => {
    if (!isActive) {
      setState(APP_STATES.IDLE);
      return;
    }

    console.log('Timeline Harvester: Resuming polling...');
    startPolling();
  };

  // UI functions
  const updateUI = async () => {
    if (!toggleButton || !statusDisplay) {
      return;
    }

    // Update button
    toggleButton.textContent = `Harvester: ${isActive ? 'ON' : 'OFF'}`;
    toggleButton.style.backgroundColor = isActive ? '#1d9bf0' : '#657786';

    // Update status display
    const tweetCount = await getTweetCount();
    let statusText = '';

    switch (currentState) {
      case APP_STATES.IDLE:
        statusText = 'Idle';
        break;
      case APP_STATES.POLLING:
        statusText = 'Polling...';
        break;
      case APP_STATES.SCROLLING:
        statusText = `Scrolling (${tweetCount}/${BATCH_SIZE})`;
        break;
      case APP_STATES.SENDING:
        statusText = `Sending ${tweetCount} tweets...`;
        break;
      case APP_STATES.COOLDOWN:
        statusText = 'Cooldown';
        break;
      default:
        statusText = 'Unknown';
    }

    statusDisplay.textContent = statusText;
    statusDisplay.style.backgroundColor = getStateColor(currentState);
  };

  const getStateColor = (state) => {
    switch (state) {
      case APP_STATES.IDLE:
        return '#657786';
      case APP_STATES.POLLING:
        return '#1d9bf0';
      case APP_STATES.SCROLLING:
        return '#00ba7c';
      case APP_STATES.SENDING:
        return '#f91880';
      case APP_STATES.COOLDOWN:
        return '#ffd400';
      default:
        return '#657786';
    }
  };

  const loadInitialState = async () => {
    try {
      const result = await chrome.storage.local.get([STORAGE_KEYS.IS_ACTIVE]);
      return result[STORAGE_KEYS.IS_ACTIVE] || false;
    } catch (error) {
      console.error('Timeline Harvester: Failed to load state', error);
      return false;
    }
  };

  const saveActiveState = async (active) => {
    try {
      await chrome.storage.local.set({ [STORAGE_KEYS.IS_ACTIVE]: active });
    } catch (error) {
      console.error('Timeline Harvester: Failed to save state', error);
    }
  };

  const createUI = () => {
    if (toggleButton) {
      return;
    }

    // Create toggle button
    toggleButton = document.createElement('button');
    toggleButton.style.position = 'fixed';
    toggleButton.style.bottom = '60px';
    toggleButton.style.right = '20px';
    toggleButton.style.zIndex = '9999';
    toggleButton.style.padding = '10px 16px';
    toggleButton.style.borderRadius = '999px';
    toggleButton.style.border = 'none';
    toggleButton.style.color = '#fff';
    toggleButton.style.fontSize = '14px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
    toggleButton.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont';

    toggleButton.addEventListener('click', async () => {
      isActive = !isActive;
      await saveActiveState(isActive);

      if (isActive) {
        console.log('Timeline Harvester: Activated - will refresh page first');
        // Set flag to refresh on next load
        await chrome.storage.local.set({ [STORAGE_KEYS.NEEDS_INITIAL_REFRESH]: true });
        // Refresh immediately
        window.location.reload();
      } else {
        console.log('Timeline Harvester: Deactivated');
        // Clear refresh flag when deactivating
        await chrome.storage.local.remove([STORAGE_KEYS.NEEDS_INITIAL_REFRESH]);
        stopPolling();
        stopScrolling();
        setState(APP_STATES.IDLE);
      }

      updateUI();
    });

    // Create status display
    statusDisplay = document.createElement('div');
    statusDisplay.style.position = 'fixed';
    statusDisplay.style.bottom = '20px';
    statusDisplay.style.right = '20px';
    statusDisplay.style.zIndex = '9999';
    statusDisplay.style.padding = '8px 12px';
    statusDisplay.style.borderRadius = '12px';
    statusDisplay.style.border = 'none';
    statusDisplay.style.color = '#fff';
    statusDisplay.style.fontSize = '12px';
    statusDisplay.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont';
    statusDisplay.style.fontWeight = '500';
    statusDisplay.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';

    document.body.appendChild(toggleButton);
    document.body.appendChild(statusDisplay);
    updateUI();
  };

  const bootstrap = async () => {
    // Load initial state
    isActive = await loadInitialState();

    // Check if we need to clear the initial refresh flag
    const result = await chrome.storage.local.get([STORAGE_KEYS.NEEDS_INITIAL_REFRESH]);
    const needsInitialRefresh = result[STORAGE_KEYS.NEEDS_INITIAL_REFRESH] || false;

    if (needsInitialRefresh) {
      console.log('Timeline Harvester: Initial refresh completed, clearing flag');
      await chrome.storage.local.remove([STORAGE_KEYS.NEEDS_INITIAL_REFRESH]);
    }

    // Create UI
    createUI();

    // If active, start polling
    if (isActive) {
      console.log('Timeline Harvester: Starting session');
      startPolling();
    } else {
      setState(APP_STATES.IDLE);
    }
  };

  // Initialize when DOM is ready
  const readyState = document.readyState;
  if (readyState === 'complete' || readyState === 'interactive') {
    bootstrap();
  } else {
    document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
  }
})();
