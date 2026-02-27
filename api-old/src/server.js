const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const storedTweets = new Map();
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "tweets.json");

const normalizeTweet = (tweet) => ({
  injectedId: tweet.injectedId,
  text: tweet.text ?? "",
  user: tweet.user ?? {},
  scrapedAt: tweet.scrapedAt ?? new Date().toISOString(),
  url: tweet.url ?? null,
  media: tweet.media ?? { images: [], videos: [], gifs: [] },
  metrics: tweet.metrics ?? {
    likes: 0,
    replies: 0,
    reposts: 0,
    views: 0,
  },
  receivedAt: new Date().toISOString(),
});

const persistTweetsToDisk = async () => {
  try {
    await fs.promises.mkdir(DATA_DIR, { recursive: true });
    const serialized = JSON.stringify(
      {
        updatedAt: new Date().toISOString(),
        count: storedTweets.size,
        tweets: Array.from(storedTweets.values()),
      },
      null,
      2
    );
    await fs.promises.writeFile(DATA_FILE, serialized, "utf8");
  } catch (error) {
    console.error("[tweets] failed to persist tweets.json", error);
  }
};

const hydrateFromDisk = () => {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return;
    }
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed?.tweets || !Array.isArray(parsed.tweets)) {
      return;
    }
    parsed.tweets.forEach((tweet) => {
      if (tweet?.injectedId) {
        storedTweets.set(tweet.injectedId, tweet);
      }
    });
    console.log(`[tweets] hydrated ${storedTweets.size} tweets from disk`);
  } catch (error) {
    console.warn("[tweets] failed to hydrate tweets from disk", error);
  }
};

hydrateFromDisk();

app.get("/health", (_, res) =>
  res.json({ ok: true, tweetsStored: storedTweets.size })
);

app.get("/tweets", (_, res) => {
  res.json({
    count: storedTweets.size,
    tweets: Array.from(storedTweets.values()),
  });
});

app.post("/tweets", async (req, res) => {
  try {
    const { tweets } = req.body || {};

    if (!Array.isArray(tweets) || tweets.length === 0) {
      return res.status(200).json({
        stored: 0,
        totalUnique: storedTweets.size,
        message: "No tweets payload received.",
      });
    }

    let storedCount = 0;
    tweets.forEach((tweet) => {
      if (!tweet?.injectedId) {
        return;
      }

      const normalized = normalizeTweet(tweet);
      storedTweets.set(normalized.injectedId, normalized);
      storedCount += 1;
    });

    console.log(
      `[tweets] received batch of ${tweets.length}, stored total ${storedTweets.size}`
    );

    await persistTweetsToDisk();

    return res.status(201).json({
      stored: storedCount,
      totalUnique: storedTweets.size,
      accepted: tweets.length,
      persistedTo: DATA_FILE,
    });
  } catch (error) {
    console.error("[tweets] failed to store payload", error);
    return res.status(500).json({ error: "Failed to store tweets." });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
