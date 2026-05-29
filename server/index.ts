/**
 * AstraMarkets — Signal + Agent API Server
 * ─────────────────────────────────────────────────────────────────
 * Express server exposing real-time signal data and agent decisions.
 * Runs on PORT 4000 by default (configurable via .env).
 *
 * Signal Routes:
 *   GET /api/signals              — full ranked signal pool
 *   GET /api/signals/top/:n       — top N signals
 *   GET /api/signals/:source      — signals by source
 *   GET /api/signals/health       — engine health & signal count
 *
 * Agent Routes:
 *   GET /api/agents               — all agent statuses
 *   GET /api/agents/markets       — LLM-approved market proposals
 *   GET /api/agents/logs          — recent agent decision logs
 *   GET /api/agents/logs/:name    — logs for a specific agent
 */

import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  startSignalEngine,
  getLiveSignals,
  getTopSignals,
  getSignalsBySource,
  type Signal,
} from "./signals/signalEngine.js";
import {
  startAgentEngine,
  getAgentStatuses,
  getApprovedMarkets,
  getAgentLogs,
} from "./agents/agentEngine.js";
import { startSettlementOracle } from "./oracles/settlementOracle.js";
import { eventBus } from "./events/eventBus.js";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.SIGNAL_PORT ?? "4000", 10);

// ─── MIDDLEWARE ───────────────────────────────────────────────────
app.use(cors({
  origin: (_origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => cb(null, true),
  methods: ["GET"],
}));
app.use(express.json());

// ─── SIGNAL ROUTES ────────────────────────────────────────────────

app.get("/api/signals", (_req: Request, res: Response) => {
  res.json({ ok: true, count: getLiveSignals().length, signals: getLiveSignals(), timestamp: Date.now() });
});

app.get("/api/signals/health", (_req: Request, res: Response) => {
  const signals = getLiveSignals();
  const sources = {
    crypto: signals.filter((s) => s.source === "crypto").length,
    news:   signals.filter((s) => s.source === "news").length,
    reddit: signals.filter((s) => s.source === "reddit").length,
    trends: signals.filter((s) => s.source === "trends").length,
  };
  res.json({ ok: true, status: "live", totalSignals: signals.length, sources, lastSignalTime: signals[0]?.timestamp ?? null, uptime: process.uptime() });
});

app.get("/api/signals/top/:n", (req: Request, res: Response) => {
  const rawN = Array.isArray(req.params["n"]) ? req.params["n"][0] : (req.params["n"] ?? "10");
  const n = Math.min(parseInt(rawN, 10) || 10, 50);
  res.json({ ok: true, count: n, signals: getTopSignals(n), timestamp: Date.now() });
});

app.get("/api/signals/:source", (req: Request, res: Response) => {
  const validSources: Signal["source"][] = ["crypto", "news", "reddit", "trends"];
  const rawSource = Array.isArray(req.params["source"]) ? req.params["source"][0] : (req.params["source"] ?? "");
  const source = rawSource as Signal["source"];
  if (!validSources.includes(source)) {
    res.status(400).json({ ok: false, error: `Invalid source. Valid values: ${validSources.join(", ")}` });
    return;
  }
  const filtered = getSignalsBySource(source);
  res.json({ ok: true, source, count: filtered.length, signals: filtered, timestamp: Date.now() });
});

// ─── AGENT ROUTES ─────────────────────────────────────────────────

/** GET /api/agents — runtime status of all 4 agents */
app.get("/api/agents", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    agents: getAgentStatuses(),
    approvedMarketsCount: getApprovedMarkets().length,
    timestamp: Date.now(),
  });
});

/** GET /api/agents/markets — LLM-approved market proposals (newest first) */
app.get("/api/agents/markets", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    count: getApprovedMarkets().length,
    markets: getApprovedMarkets(),
    timestamp: Date.now(),
  });
});

/** GET /api/agents/logs — recent agent decision logs */
app.get("/api/agents/logs", (req: Request, res: Response) => {
  const limit = Math.min(parseInt((req.query["limit"] as string) ?? "50", 10), 200);
  res.json({
    ok: true,
    count: getAgentLogs(limit).length,
    logs: getAgentLogs(limit),
    timestamp: Date.now(),
  });
});

/** GET /api/agents/logs/:name — logs for a specific agent */
app.get("/api/agents/logs/:name", (req: Request, res: Response) => {
  const rawName = Array.isArray(req.params["name"]) ? req.params["name"][0] : (req.params["name"] ?? "");
  const filtered = getAgentLogs(200).filter(
    (l) => l.agentName.toLowerCase() === rawName.toLowerCase()
  );
  res.json({ ok: true, agentName: rawName, count: filtered.length, logs: filtered, timestamp: Date.now() });
});

// ─── SSE REALTIME EVENTS CHANNEL ──────────────────────────────────
let sseClients: Response[] = [];

app.get("/api/events", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Register with local legacy client list
  sseClients.push(res);
  console.log(`[SSE] 🟢 Client connected locally. Total active: ${sseClients.length}`);

  req.on("close", () => {
    sseClients = sseClients.filter((client) => client !== res);
    console.log(`[SSE] 🔴 Client disconnected locally. Active: ${sseClients.length}`);
  });

  // Register with the central unified EventBus
  eventBus.registerSseClient(res);
});

export function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch {
      // client connection already terminated
    }
  });
}

// ─── PORTFOLIO & TRADING BACKEND SYSTEM ───────────────────────────
interface Trade {
  marketId: string;
  marketTitle: string;
  ref: string;
  trader: string;
  position: boolean; // true = YES, false = NO
  amountSpent: number;
  sharesMinted: number;
  timestamp: number;
  txHash: string;
}

interface Position {
  marketId: string;
  marketTitle: string;
  ref: string;
  yesShares: number;
  noShares: number;
  averagePrice: number;
  amountInvested: number;
  timestamp: number;
}

interface RewardClaim {
  marketId: string;
  marketTitle: string;
  ref: string;
  payoutAmount: number;
  timestamp: number;
  txHash: string;
}

let userWalletBalance = 1000.00; // Virtual native SOM balance (scaled)
const portfolioPositions = new Map<string, Position>();
const tradesHistory: Trade[] = [];
const rewardClaims: RewardClaim[] = [];

// Support POST requests
app.use(cors());

/** GET /api/portfolio — Fetches user positions and trade log history */
app.get("/api/portfolio", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    walletBalance: userWalletBalance,
    positions: Array.from(portfolioPositions.values()),
    trades: tradesHistory,
    claims: rewardClaims,
    timestamp: Date.now(),
  });
});

/** POST /api/markets/:id/trade — Buy YES or NO shares in a market */
app.post("/api/markets/:id/trade", (req: Request, res: Response) => {
  const marketId = req.params["id"] || "";
  const { position, amount } = req.body; // position: boolean (true = YES, false = NO), amount: number (SOM)

  if (typeof position !== "boolean" || typeof amount !== "number" || amount <= 0) {
    res.status(400).json({ ok: false, error: "Invalid position state or buy amount." });
    return;
  }

  const markets = getApprovedMarkets();
  const market = markets.find((m: any) => m.ref === marketId || m.title === marketId);

  if (!market) {
    res.status(404).json({ ok: false, error: "Prediction market not found." });
    return;
  }

  if (market.status && market.status !== "ACTIVE") {
    res.status(400).json({ ok: false, error: "Market is no longer active." });
    return;
  }

  if (userWalletBalance < amount) {
    res.status(400).json({ ok: false, error: "Insufficient SOM wallet balance." });
    return;
  }

  // Deduct wallet balance
  userWalletBalance -= amount;

  // Initialize pool values if they do not exist
  if (!market.yesOdds) market.yesOdds = 0.50;
  if (!market.noOdds) market.noOdds = 0.50;
  
  const initialOdds = position ? market.yesOdds : market.noOdds;
  const sharesMinted = amount / initialOdds;

  // Track position
  const key = market.ref;
  let pos = portfolioPositions.get(key);
  if (!pos) {
    pos = {
      marketId: key,
      marketTitle: market.title,
      ref: market.ref,
      yesShares: 0,
      noShares: 0,
      averagePrice: initialOdds,
      amountInvested: 0,
      timestamp: Date.now(),
    };
  }

  if (position) {
    pos.yesShares += sharesMinted;
  } else {
    pos.noShares += sharesMinted;
  }
  
  pos.amountInvested += amount;
  pos.averagePrice = pos.amountInvested / (pos.yesShares + pos.noShares);
  portfolioPositions.set(key, pos);

  // Update market AMM state
  market.totalLiquidity = (market.totalLiquidity || 0) + amount;
  if (position) {
    market.yesSharesPool = (market.yesSharesPool || 0) + sharesMinted;
  } else {
    market.noSharesPool = (market.noSharesPool || 0) + sharesMinted;
  }

  // Recalculate dynamic odds ratio
  const totalShares = (market.yesSharesPool || 1) + (market.noSharesPool || 1);
  market.yesOdds = (market.yesSharesPool || 0) / totalShares;
  // Bound odds between 5% and 95%
  if (market.yesOdds < 0.05) market.yesOdds = 0.05;
  if (market.yesOdds > 0.95) market.yesOdds = 0.95;
  market.noOdds = 1 - market.yesOdds;

  // Save to history
  const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const trade: Trade = {
    marketId: key,
    marketTitle: market.title,
    ref: market.ref,
    trader: "User (Me)",
    position,
    amountSpent: amount,
    sharesMinted,
    timestamp: Date.now(),
    txHash,
  };
  tradesHistory.unshift(trade);

  // Broadcast realtime SSE updates to all frontend connections
  broadcastSSE("TRADE_EXECUTED", { trade, market });
  
  // Emit TRADE_EXECUTED on the central EventBus
  eventBus.emit("TRADE_EXECUTED", {
    marketId: trade.marketId,
    marketTitle: trade.marketTitle,
    ref: trade.ref,
    trader: trade.trader,
    position: trade.position,
    amountSpent: trade.amountSpent,
    sharesMinted: trade.sharesMinted,
    txHash: trade.txHash,
    timestamp: trade.timestamp
  });
  broadcastSSE("POSITION_UPDATED", {
    walletBalance: userWalletBalance,
    positions: Array.from(portfolioPositions.values()),
    trades: tradesHistory,
  });

  res.json({
    ok: true,
    message: "Trade successfully executed.",
    trade,
    marketOdds: { yes: market.yesOdds, no: market.noOdds },
    portfolio: { walletBalance: userWalletBalance, position: pos },
  });
});

/** POST /api/markets/:id/sell — Sell shares prior to expiry */
app.post("/api/markets/:id/sell", (req: Request, res: Response) => {
  const marketId = req.params["id"] || "";
  const key = marketId;
  const pos = portfolioPositions.get(key);

  if (!pos || (pos.yesShares === 0 && pos.noShares === 0)) {
    res.status(404).json({ ok: false, error: "No open positions found in this market." });
    return;
  }

  const markets = getApprovedMarkets();
  const market = markets.find((m: any) => m.ref === marketId);

  if (!market) {
    res.status(404).json({ ok: false, error: "Market not found." });
    return;
  }

  const yesOdds = market.yesOdds || 0.50;
  const noOdds = 1 - yesOdds;

  let payout = 0;
  if (pos.yesShares > 0) {
    payout += pos.yesShares * yesOdds;
    market.yesSharesPool = Math.max(0, (market.yesSharesPool || 0) - pos.yesShares);
  }
  if (pos.noShares > 0) {
    payout += pos.noShares * noOdds;
    market.noSharesPool = Math.max(0, (market.noSharesPool || 0) - pos.noShares);
  }

  // 2% exit AMM fee
  payout = payout * 0.98;

  // Update pools
  market.totalLiquidity = Math.max(0, (market.totalLiquidity || 0) - payout);
  userWalletBalance += payout;

  // Record trade history entry representing position closing
  const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const sellTrade: Trade = {
    marketId: key,
    marketTitle: market.title,
    ref: market.ref,
    trader: "User (Me)",
    position: pos.yesShares > 0,
    amountSpent: -payout, // Negative spent signifies selling/exit
    sharesMinted: -(pos.yesShares + pos.noShares),
    timestamp: Date.now(),
    txHash,
  };
  tradesHistory.unshift(sellTrade);

  // Clear positions
  portfolioPositions.delete(key);

  // Broadcast realtime events
  broadcastSSE("TRADE_EXECUTED", { trade: sellTrade, market });

  // Emit TRADE_EXECUTED on the central EventBus
  eventBus.emit("TRADE_EXECUTED", {
    marketId: sellTrade.marketId,
    marketTitle: sellTrade.marketTitle,
    ref: sellTrade.ref,
    trader: sellTrade.trader,
    position: sellTrade.position,
    amountSpent: sellTrade.amountSpent,
    sharesMinted: sellTrade.sharesMinted,
    txHash: sellTrade.txHash,
    timestamp: sellTrade.timestamp
  });
  broadcastSSE("POSITION_UPDATED", {
    walletBalance: userWalletBalance,
    positions: Array.from(portfolioPositions.values()),
    trades: tradesHistory,
  });

  res.json({
    ok: true,
    message: "Position closed and shares successfully sold.",
    refundPayout: payout,
    walletBalance: userWalletBalance,
  });
});

/** POST /api/markets/:id/claim — Claim rewards for winning positions */
app.post("/api/markets/:id/claim", (req: Request, res: Response) => {
  const marketId = req.params["id"] || "";
  const key = marketId;
  const pos = portfolioPositions.get(key);

  if (!pos) {
    res.status(400).json({ ok: false, error: "No shares owned in this market." });
    return;
  }

  const markets = getApprovedMarkets();
  const market = markets.find((m: any) => m.ref === marketId);

  if (!market || market.status !== "RESOLVED") {
    res.status(400).json({ ok: false, error: "Market is not resolved yet." });
    return;
  }

  const winOutcome = market.resolvedOutcome;
  const winningShares = winOutcome ? pos.yesShares : pos.noShares;

  if (winningShares === 0) {
    res.status(400).json({ ok: false, error: "You do not own winning shares." });
    return;
  }

  const totalWinShares = winOutcome ? market.yesSharesPool : market.noSharesPool;
  const rewardPayout = (winningShares * (market.totalLiquidity || market.volume || 1000)) / (totalWinShares || 1);

  userWalletBalance += rewardPayout;

  const txHash = "0x" + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  const claim: RewardClaim = {
    marketId: key,
    marketTitle: market.title,
    ref: market.ref,
    payoutAmount: rewardPayout,
    timestamp: Date.now(),
    txHash,
  };
  rewardClaims.unshift(claim);

  // Clear position
  portfolioPositions.delete(key);

  broadcastSSE("POSITION_UPDATED", {
    walletBalance: userWalletBalance,
    positions: Array.from(portfolioPositions.values()),
    trades: tradesHistory,
    claims: rewardClaims,
  });

  res.json({
    ok: true,
    message: "Rewards successfully claimed.",
    payoutAmount: rewardPayout,
    walletBalance: userWalletBalance,
  });
});

// ─── BOOT ─────────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║      AstraMarkets Signal Engine v1.0         ║");
  console.log("╚══════════════════════════════════════════════╝");

  const configured: string[] = [];
  if (process.env.NEWS_API_KEY)          configured.push("NewsAPI ✓");
  if (process.env.REDDIT_CLIENT_ID)      configured.push("Reddit ✓");
  if (process.env.SERP_API_KEY)          configured.push("SerpAPI/Trends ✓");
  if (process.env.OPENAI_API_KEY)        configured.push("OpenAI (Agents) ✓");
  configured.push("CoinGecko ✓ (no key needed)");

  console.log("\n[Server] Active integrations:");
  configured.forEach((s) => console.log("   •", s));

  const missing: string[] = [];
  if (!process.env.NEWS_API_KEY)         missing.push("NEWS_API_KEY");
  if (!process.env.REDDIT_CLIENT_ID)     missing.push("REDDIT_CLIENT_ID");
  if (!process.env.REDDIT_CLIENT_SECRET) missing.push("REDDIT_CLIENT_SECRET");
  if (!process.env.SERP_API_KEY)         missing.push("SERP_API_KEY");
  if (!process.env.OPENAI_API_KEY)       missing.push("OPENAI_API_KEY (agents will be inactive)");

  if (missing.length) {
    console.warn("\n[Server] ⚠ Missing env keys:");
    missing.forEach((k) => console.warn("   •", k));
    console.warn("   → Copy .env.example to .env and add your keys.\n");
  }

  // Boot signal engine first — agents depend on live signals
  await startSignalEngine();

  // Boot agent engine — runs on its own 15s cycle, independent of signal polling
  await startAgentEngine();

  // Boot autonomous settlement oracle worker
  startSettlementOracle();

  app.listen(PORT, () => {
    console.log(`\n[Server] 🟢 Signal API  → http://localhost:${PORT}/api/signals`);
    console.log(`[Server] 🤖 Agent API   → http://localhost:${PORT}/api/agents`);
    console.log(`[Server] 📊 Markets API → http://localhost:${PORT}/api/agents/markets`);
    console.log(`[Server] 💡 Health      → http://localhost:${PORT}/api/signals/health`);
  });
}

main().catch((err) => {
  console.error("[Server] Fatal boot error:", err);
  process.exit(1);
});
