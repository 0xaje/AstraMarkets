/**
 * AstraMarkets — Signal Engine v1.0
 * ─────────────────────────────────────────────────────────────────
 * Real-time signal ingestion layer. Aggregates live data from:
 *   1. CoinGecko   — crypto price movements & trending coins
 *   2. NewsAPI     — global breaking news & financial headlines
 *   3. Reddit API  — hot posts & sentiment from crypto/finance subreddits
 *   4. SerpAPI     — Google Trends search-interest spikes (via SerpAPI)
 *
 * All signals are normalised into a single canonical shape and ranked
 * by importance score. Deduplication prevents the same event from
 * flooding the queue across polling cycles.
 */

import fetch from "node-fetch";
import { eventBus } from "../events/eventBus.js";
import { env } from "../config/env.js";

// ─── CANONICAL SIGNAL TYPE ───────────────────────────────────────
export interface Signal {
  topic: string;
  source: "crypto" | "news" | "reddit" | "trends";
  sentiment: "bullish" | "bearish" | "neutral";
  velocity: number;   // relative speed / urgency [0–100]
  importance: number; // ranked signal strength  [0–100]
  timestamp: number;  // unix ms
}

// ─── INTERNAL STATE ──────────────────────────────────────────────
let liveSignals: Signal[] = [];
const seenKeys = new Set<string>(); // deduplication fingerprints
let pollingInterval: ReturnType<typeof setInterval> | null = null;
let isPolling = false;

// ─── ENV KEYS (required — set in .env) ───────────────────────────
const NEWS_API_KEY    = env.NEWS_API_KEY || "";
const REDDIT_CLIENT_ID    = env.REDDIT_CLIENT_ID || "";
const REDDIT_CLIENT_SECRET = env.REDDIT_CLIENT_SECRET || "";
const REDDIT_USER_AGENT    = env.REDDIT_USER_AGENT;
const SERP_API_KEY    = env.SERP_API_KEY || "";

// ─── UTILS ───────────────────────────────────────────────────────

function deduplicationKey(signal: Signal): string {
  // Fingerprint on topic + source + a 30-second time bucket
  const bucket = Math.floor(signal.timestamp / 30_000);
  return `${signal.source}::${signal.topic.toLowerCase().replace(/\s+/g, "_")}::${bucket}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreImportance(base: number, boosts: number[]): number {
  const total = boosts.reduce((acc, b) => acc + b, base);
  return clamp(Math.round(total), 0, 100);
}

/**
 * Naive but surprisingly effective lexical sentiment scorer.
 * Returns a -1 → +1 polarity that gets mapped to our three tiers.
 */
function scoreSentiment(text: string): Signal["sentiment"] {
  const t = text.toLowerCase();

  const bullishTerms = [
    "surge", "rally", "all-time high", "ath", "breakout", "gain", "rise",
    "bullish", "adoption", "record", "growth", "positive", "profit",
    "recovery", "soar", "jumped", "moon", "pump", "buy", "long", "boom",
    "outperform", "upgrade", "beat", "strong", "expand"
  ];

  const bearishTerms = [
    "crash", "drop", "dump", "sell", "plunge", "fear", "loss", "fell",
    "bearish", "decline", "collapse", "ban", "hack", "vulnerability",
    "lawsuit", "sec", "regulation", "sanction", "inflation", "recession",
    "miss", "downgrade", "weak", "shrink", "layoff", "default", "contagion"
  ];

  let score = 0;
  bullishTerms.forEach((w) => { if (t.includes(w)) score += 1; });
  bearishTerms.forEach((w) => { if (t.includes(w)) score -= 1; });

  if (score > 0) return "bullish";
  if (score < 0) return "bearish";
  return "neutral";
}

// ─── COINGECKO ───────────────────────────────────────────────────

async function fetchCoinGeckoSignals(): Promise<Signal[]> {
  const signals: Signal[] = [];
  const now = Date.now();

  try {
    // 1a. Trending coins
    const trendRes = await fetch(
      "https://api.coingecko.com/api/v3/search/trending",
      { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) }
    );

    if (trendRes.ok) {
      const trendData = (await trendRes.json()) as any;
      const coins: any[] = trendData?.coins?.slice(0, 7) ?? [];

      coins.forEach((item: any, idx: number) => {
        const coin   = item.item;
        const name   = coin.name as string;
        const symbol = (coin.symbol as string).toUpperCase();
        const rank   = (coin.market_cap_rank as number) ?? 999;
        const priceChange = (coin.data?.price_change_percentage_24h?.usd as number) ?? 0;

        const topic = `${name} (${symbol}) is trending on CoinGecko`;
        const sentiment = priceChange > 3  ? "bullish"
                        : priceChange < -3 ? "bearish"
                        : "neutral";

        const velocity   = clamp(Math.abs(priceChange) * 3, 5, 100);
        const importance = scoreImportance(
          80,
          [
            idx === 0 ? 15 : 0,           // top trending bonus
            rank < 20  ? 10 : 0,           // blue chip bonus
            Math.min(Math.abs(priceChange) * 2, 20)
          ]
        );

        signals.push({ topic, source: "crypto", sentiment, velocity, importance, timestamp: now });
      });
    }

    // 1b. Market movers — top-50 by market cap, filter big movers
    const moversRes = await fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&price_change_percentage=24h",
      { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) }
    );

    if (moversRes.ok) {
      const coins: any[] = (await moversRes.json()) as any[];

      coins
        .filter((c: any) => Math.abs(c.price_change_percentage_24h ?? 0) >= 5)
        .slice(0, 5)
        .forEach((c: any) => {
          const change: number = c.price_change_percentage_24h ?? 0;
          const topic = `${c.name} (${(c.symbol as string).toUpperCase()}) moved ${change > 0 ? "+" : ""}${change.toFixed(1)}% in 24h`;
          const sentiment = change > 0 ? "bullish" : "bearish";
          const velocity   = clamp(Math.abs(change) * 3, 10, 100);
          const importance = scoreImportance(70, [
            (c.market_cap_rank ?? 999) < 10 ? 20 : 5,
            Math.min(Math.abs(change) * 2, 25)
          ]);

          signals.push({ topic, source: "crypto", sentiment, velocity, importance, timestamp: now });
        });
    }
  } catch (err) {
    console.error("[SignalEngine] CoinGecko fetch error:", err);
  }

  return signals;
}

// ─── NEWSAPI ─────────────────────────────────────────────────────

async function fetchNewsSignals(): Promise<Signal[]> {
  if (!NEWS_API_KEY) {
    console.warn("[SignalEngine] NEWS_API_KEY not set — skipping NewsAPI.");
    return [];
  }

  const signals: Signal[] = [];
  const now = Date.now();

  const queries = [
    { q: "crypto bitcoin ethereum finance", label: "financial" },
    { q: "stock market federal reserve inflation", label: "macro" },
  ];

  for (const { q } of queries) {
    try {
      const url = new URL("https://newsapi.org/v2/everything");
      url.searchParams.set("q", q);
      url.searchParams.set("language", "en");
      url.searchParams.set("sortBy", "publishedAt");
      url.searchParams.set("pageSize", "10");
      url.searchParams.set("apiKey", NEWS_API_KEY);

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });

      if (!res.ok) {
        console.warn(`[SignalEngine] NewsAPI error ${res.status}: ${res.statusText}`);
        continue;
      }

      const data = (await res.json()) as any;
      const articles: any[] = data?.articles ?? [];

      articles.slice(0, 5).forEach((article: any) => {
        const headline = (article.title as string) ?? "";
        const desc     = (article.description as string) ?? "";
        const combined = `${headline} ${desc}`;
        const source   = article.source?.name ?? "News";

        const topic = headline.length > 120 ? headline.substring(0, 117) + "..." : headline;
        const sentiment  = scoreSentiment(combined);

        // Freshness boost: articles from the last hour score higher
        const publishedAt  = new Date(article.publishedAt).getTime();
        const ageMinutes   = (now - publishedAt) / 60_000;
        const freshnessBoost = ageMinutes < 60 ? 20 : ageMinutes < 360 ? 10 : 0;

        const importance = scoreImportance(60, [freshnessBoost]);
        const velocity   = clamp(Math.round((1 / Math.max(ageMinutes, 1)) * 3000), 5, 100);

        signals.push({ topic, source: "news", sentiment, velocity, importance, timestamp: now });
      });
    } catch (err) {
      console.error("[SignalEngine] NewsAPI fetch error:", err);
    }
  }

  return signals;
}

// ─── REDDIT ──────────────────────────────────────────────────────

let redditAccessToken: string | null = null;
let redditTokenExpiry = 0;

async function getRedditToken(): Promise<string | null> {
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
    console.warn("[SignalEngine] Reddit credentials not set — skipping Reddit.");
    return null;
  }

  if (redditAccessToken && Date.now() < redditTokenExpiry) {
    return redditAccessToken;
  }

  try {
    const creds = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString("base64");
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${creds}`,
        "User-Agent": REDDIT_USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      console.warn(`[SignalEngine] Reddit OAuth failed: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as any;
    redditAccessToken = data.access_token;
    redditTokenExpiry = Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000;
    return redditAccessToken;
  } catch (err) {
    console.error("[SignalEngine] Reddit token error:", err);
    return null;
  }
}

async function fetchRedditSignals(): Promise<Signal[]> {
  const token = await getRedditToken();
  if (!token) return [];

  const signals: Signal[] = [];
  const now = Date.now();

  const subreddits = ["CryptoCurrency", "Bitcoin", "ethfinance", "wallstreetbets", "investing"];

  for (const sub of subreddits) {
    try {
      const res = await fetch(
        `https://oauth.reddit.com/r/${sub}/hot?limit=5`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
            "User-Agent": REDDIT_USER_AGENT,
          },
          signal: AbortSignal.timeout(8000)
        }
      );

      if (!res.ok) {
        console.warn(`[SignalEngine] Reddit r/${sub} error: ${res.status}`);
        continue;
      }

      const data = (await res.json()) as any;
      const posts: any[] = data?.data?.children ?? [];

      posts.slice(0, 3).forEach((p: any) => {
        const post = p.data;
        const title: string = post.title ?? "";
        const score: number = post.score ?? 0;
        const numComments: number = post.num_comments ?? 0;
        const upvoteRatio: number = post.upvote_ratio ?? 0.5;

        const topic = title.length > 120 ? title.substring(0, 117) + "..." : title;
        const sentiment = scoreSentiment(title + " " + (post.selftext ?? "").substring(0, 200));

        // Hot score proxy: (score × upvote_ratio) / age
        const postAgeHours = ((now / 1000) - (post.created_utc ?? 0)) / 3600;
        const hotProxy = (score * upvoteRatio) / Math.max(postAgeHours, 0.5);
        const velocity  = clamp(Math.round(Math.log1p(hotProxy) * 10), 5, 100);

        const importance = scoreImportance(
          55,
          [
            Math.min(Math.log10(Math.max(score, 1)) * 10, 30),
            Math.min(numComments / 10, 15),
            sub === "CryptoCurrency" || sub === "Bitcoin" ? 10 : 0
          ]
        );

        signals.push({ topic, source: "reddit", sentiment, velocity, importance, timestamp: now });
      });
    } catch (err) {
      console.error(`[SignalEngine] Reddit r/${sub} fetch error:`, err);
    }
  }

  return signals;
}

// ─── GOOGLE TRENDS (via SerpAPI) ─────────────────────────────────

async function fetchTrendsSignals(): Promise<Signal[]> {
  if (!SERP_API_KEY) {
    console.warn("[SignalEngine] SERP_API_KEY not set — skipping Google Trends.");
    return [];
  }

  const signals: Signal[] = [];
  const now = Date.now();

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_trends_trending_now");
    url.searchParams.set("geo", "US");
    url.searchParams.set("api_key", SERP_API_KEY);

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10_000) });

    if (!res.ok) {
      console.warn(`[SignalEngine] SerpAPI error ${res.status}: ${res.statusText}`);
      return [];
    }

    const data = (await res.json()) as any;
    const searches: any[] = data?.trending_searches ?? data?.daily_searches?.[0]?.trending_searches ?? [];

    searches.slice(0, 8).forEach((item: any, idx: number) => {
      const keyword: string = item.query ?? item.title?.query ?? "";
      if (!keyword) return;

      const trafficStr: string = item.formattedTraffic ?? item.traffic ?? "1K+";
      const trafficMultiplier = trafficStr.includes("M") ? 1_000_000
                              : trafficStr.includes("K") ? 1_000
                              : 1;
      const trafficNum = parseFloat(trafficStr) * trafficMultiplier;

      const topic = `Google Trends spike: "${keyword}"`;
      const sentiment = scoreSentiment(
        keyword + " " + (item.articles ?? []).map((a: any) => a.title ?? "").join(" ")
      );

      const velocity   = clamp(Math.round(Math.log10(Math.max(trafficNum, 1)) * 12), 20, 100);
      const importance = scoreImportance(
        60,
        [
          idx === 0 ? 20 : Math.max(0, 10 - idx * 2),
          Math.min(velocity / 2, 20)
        ]
      );

      signals.push({ topic, source: "trends", sentiment, velocity, importance, timestamp: now });
    });
  } catch (err) {
    console.error("[SignalEngine] Google Trends (SerpAPI) fetch error:", err);
  }

  return signals;
}

// ─── AGGREGATION & DEDUPLICATION ─────────────────────────────────

async function fetchAllSignals(): Promise<Signal[]> {
  console.log("[SignalEngine] Polling all data sources...");

  const [cryptoSigs, newsSigs, redditSigs, trendsSigs] = await Promise.allSettled([
    fetchCoinGeckoSignals(),
    fetchNewsSignals(),
    fetchRedditSignals(),
    fetchTrendsSignals(),
  ]);

  const all: Signal[] = [
    ...(cryptoSigs.status  === "fulfilled" ? cryptoSigs.value  : []),
    ...(newsSigs.status    === "fulfilled" ? newsSigs.value    : []),
    ...(redditSigs.status  === "fulfilled" ? redditSigs.value  : []),
    ...(trendsSigs.status  === "fulfilled" ? trendsSigs.value  : []),
  ];

  // Deduplicate: only add signals whose fingerprint hasn't been seen
  const fresh: Signal[] = [];
  for (const sig of all) {
    const key = deduplicationKey(sig);
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      fresh.push(sig);
    }
  }

  // Evict old fingerprints (older than 5 minutes) to avoid unbounded memory growth
  const cutoff = Date.now() - 5 * 60_000;
  for (const key of Array.from(seenKeys)) {
    const parts = key.split("::");
    const bucket = parseInt(parts[2] ?? "0", 10);
    if (bucket * 30_000 < cutoff) seenKeys.delete(key);
  }

  // Rank by importance desc, then velocity desc
  fresh.sort((a, b) => b.importance - a.importance || b.velocity - a.velocity);

  // Emit event on our central event bus for each newly detected signal
  fresh.forEach((sig) => {
    eventBus.emit("SIGNAL_DETECTED", {
      signal: sig,
      timestamp: Date.now()
    });
  });

  console.log(
    `[SignalEngine] Ingested ${fresh.length} fresh signals this cycle ` +
    `(crypto: ${cryptoSigs.status === "fulfilled" ? cryptoSigs.value.length : 0}, ` +
    `news: ${newsSigs.status === "fulfilled" ? newsSigs.value.length : 0}, ` +
    `reddit: ${redditSigs.status === "fulfilled" ? redditSigs.value.length : 0}, ` +
    `trends: ${trendsSigs.status === "fulfilled" ? trendsSigs.value.length : 0})`
  );

  return fresh;
}

// ─── POLLING LOOP ────────────────────────────────────────────────

const POLL_INTERVAL_MS = 15_000; // 15 seconds (within 10–20s spec)
const MAX_SIGNALS      = 50;     // cap the live queue

export async function startSignalEngine(): Promise<void> {
  if (isPolling) {
    console.warn("[SignalEngine] Already running — ignoring duplicate start call.");
    return;
  }

  console.log("[SignalEngine] 🚀 Starting continuous polling loop (15s interval)...");
  isPolling = true;

  // First run immediately
  const initial = await fetchAllSignals();
  liveSignals = [...initial, ...liveSignals].slice(0, MAX_SIGNALS);

  pollingInterval = setInterval(async () => {
    try {
      const fresh = await fetchAllSignals();
      if (fresh.length > 0) {
        // Prepend fresh signals, re-sort the full pool, then cap
        liveSignals = [...fresh, ...liveSignals]
          .sort((a, b) => b.importance - a.importance || b.velocity - a.velocity)
          .slice(0, MAX_SIGNALS);
      }
    } catch (err) {
      console.error("[SignalEngine] Polling cycle error:", err);
    }
  }, POLL_INTERVAL_MS);
}

export function stopSignalEngine(): void {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
    isPolling = false;
    console.log("[SignalEngine] Polling stopped.");
  }
}

// ─── PUBLIC API ──────────────────────────────────────────────────

/**
 * getLiveSignals()
 * Returns the current ranked + deduplicated signal pool.
 * This is the function consumed by all downstream agents.
 */
export function getLiveSignals(): Signal[] {
  return liveSignals;
}

export function getSignalsBySource(source: Signal["source"]): Signal[] {
  return liveSignals.filter((s) => s.source === source);
}

export function getTopSignals(n = 10): Signal[] {
  return liveSignals.slice(0, n);
}
