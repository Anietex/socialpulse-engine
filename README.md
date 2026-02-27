# X Timeline Builder

This workspace contains two cooperating pieces:

- `chrome-extension` – a Manifest V3 extension that scrolls through a logged in X (formerly Twitter) timeline, extracts newly seen tweets (text, author, injected id, url, timestamp, media, engagement metrics) and forwards them to the backend.
- `api` – a lightweight Express server that accepts the extracted tweets and keeps them in memory for inspection.

## Backend API

1. `cd api`
2. `npm install`
3. `npm run dev` (auto-reloads) or `npm start`

The server listens on `http://localhost:4000` by default, stores every unique tweet in memory **and** writes them to `api/data/tweets.json`, and exposes:

- `POST /tweets` – accepts `{ "tweets": [ ... ] }` batches from the extension.
- `GET /tweets` – returns all stored tweets.
- `GET /health` – simple status endpoint.

> **Note** In-memory storage is enough for local testing. Wire this to your real datastore if persistence is required.

## Chrome Extension

1. Build/serve the API first so the extension has somewhere to push data.
2. In Chrome visit `chrome://extensions`, enable **Developer mode**, click **Load unpacked** and select the `chrome-extension` folder.
3. Open `https://x.com/home`, make sure you are logged in.

The content script will:

- injects a floating “Timeline Harvester: ON/OFF” pill in the bottom-right corner so you can enable or disable the auto-scroll/scrape loop on demand (OFF by default),
- every 20 seconds (while ON), scrolls the feed and scans for `article[data-testid="tweet"]` elements,
- inject an `extensionId` attribute into each tweet it touches (used for deduplication/targeting),
- capture the tweet text, author display name & handle, url (if found) and a scrape timestamp,
- collect attached media (image URLs, video streams, and GIFs) and attach them to the payload,
- capture engagement metrics (likes, replies, reposts, and views whenever available),
- (optional future enhancement) it can hover over account names to trigger popovers; this behavior is currently disabled until a reliable approach is finalised,
- send only the unseen tweets to the service worker which relays them to `http://localhost:4000/tweets` (avoids mixed-content/CORS issues, and the API always responds immediately, even when nothing new was sent).

Check the API console or `GET /tweets` to confirm data is flowing. Update `API_ENDPOINT` inside `chrome-extension/src/background.js` if you expose the backend elsewhere.
