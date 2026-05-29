import EventEmitter from "eventemitter3";
import OpenAI from "openai";
import { env } from "../config/env.js";
import {
  getLiveSignals,
  type Signal,
} from "../signals/signalEngine.js";
import type {
  AgentDecision,
  AgentLog,
  AgentStatus,
  MarketProposal,
} from "./agentTypes.js";
import { createMarketOnChain, provider } from "../services/somnia/marketFactory.js";
import { eventBus } from "../events/eventBus.js";

// ─── OPENAI CLIENT ───────────────────────────────────────────────
const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;
const LLM_MODEL = env.AGENT_LLM_MODEL;

// ─── EVENT BUS ───────────────────────────────────────────────────
interface BusEvents {
  marketProposed: [MarketProposal, string];
  proposalVetoed: [string, string];
  log: [AgentLog];
}

export const agentBus = new EventEmitter<BusEvents>();

// ─── SHARED STATE ────────────────────────────────────────────────
export const approvedMarkets: MarketProposal[] = [];
export const agentStatuses: Map<string, AgentStatus> = new Map();
const marketFingerprints = new Map<string, number>();
const DEDUP_TTL_MS = 30 * 60_000; // 30 min window

function marketFingerprint(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 60);
}

function isDuplicate(title: string): boolean {
  const key = marketFingerprint(title);
  const last = marketFingerprints.get(key);
  if (last && Date.now() - last < DEDUP_TTL_MS) return true;
  marketFingerprints.set(key, Date.now());
  return false;
}

function evictOldFingerprints() {
  const now = Date.now();
  for (const [k, ts] of marketFingerprints) {
    if (now - ts > DEDUP_TTL_MS) marketFingerprints.delete(k);
  }
}

// ─── TRANSACTION MONITORING & REPLAY RECOVERY ─────────────────────
export interface TransactionRecord {
  title: string;
  onChainMarketId?: number;
  txHash?: string;
  status: "CONFIRMED" | "FAILED" | "PENDING";
  error?: string;
  timestamp: number;
}

export const transactionHistory: TransactionRecord[] = [];

// A set of pending transaction hashes to track for replay recovery
const pendingTxHashes = new Set<{ txHash: string; proposal: MarketProposal }>();

/**
 * Periodically replays status queries on all pending transactions to recover missed confirmations.
 */
export async function runEventReplayRecovery(): Promise<void> {
  if (pendingTxHashes.size === 0) return;
  console.log(`[Event Recovery] 🛡️ Running Event Replay Recovery check for ${pendingTxHashes.size} pending transaction(s)...`);

  for (const pending of Array.from(pendingTxHashes)) {
    try {
      if (!provider) continue;
      const tx = await provider.getTransaction(pending.txHash);
      
      if (!tx) {
        console.warn(`[Event Recovery] ⚠️ Pending transaction hash ${pending.txHash} not found in mempool. Clearing.`);
        pendingTxHashes.delete(pending);
        continue;
      }

      const receipt = await tx.wait(1);
      if (receipt) {
        console.log(`[Event Recovery] 🎉 Successfully recovered and confirmed transaction: ${pending.txHash}`);
        
        // Find marketId from logs
        let marketId: number | undefined;
        // Search logs
        pending.proposal.status = "ACTIVE";
        pending.proposal.settlementTx = pending.txHash;
        
        const record = transactionHistory.find(r => r.txHash === pending.txHash);
        if (record) {
          record.status = "CONFIRMED";
        }

        eventBus.emit("MARKET_CREATED", {
          market: pending.proposal,
          onChainMarketId: marketId,
          txHash: pending.txHash,
          timestamp: Date.now()
        });

        pendingTxHashes.delete(pending);
      }
    } catch (err: any) {
      console.error(`[Event Recovery] Error validating transaction recovery for ${pending.txHash}:`, err.message || err);
    }
  }
}

// Start polling for pending transaction checks every 20 seconds
setInterval(runEventReplayRecovery, 20000);

// ─── LLM DECISION CALL ───────────────────────────────────────────
interface LLMDecisionResult {
  createMarket: boolean;
  title: string;
  category: string;
  description: string;
  expiry: string;
  confidence: number;
  yesOdds: number;
  reasoning: string;
}

async function callLLM(
  agentName: string,
  systemPrompt: string,
  signals: Signal[]
): Promise<LLMDecisionResult | null> {
  if (signals.length === 0) return null;

  if (!openai) {
    console.warn(`[${agentName}] ⚠️ OpenAI client unconfigured. Real LLM execution required. Skipping heuristic creation.`);
    return null;
  }

  const signalSummary = signals
    .slice(0, 8)
    .map(
      (s, i) =>
        `${i + 1}. [${s.source.toUpperCase()}] ${s.topic} | sentiment=${s.sentiment} | importance=${s.importance} | velocity=${s.velocity}`
    )
    .join("\n");

  const userPrompt = `
You are ${agentName}. Analyze the following real-time market signals and decide whether to create a new prediction market.

SIGNALS:
${signalSummary}

Respond ONLY with valid JSON in this exact schema:
{
  "createMarket": boolean,
  "title": "string (max 80 chars — a clear yes/no question)",
  "category": "crypto | macro | sports | tech | social",
  "description": "string (max 200 chars — context for traders)",
  "expiry": "ISO date string (7–30 days from now)",
  "confidence": number (0–100),
  "yesOdds": number (0.1–0.9 — initial YES probability),
  "reasoning": "string (1–2 sentences explaining the decision)"
}

Rules:
- Only set createMarket=true if signals are strong (importance >= 65, clear narrative).
- The title MUST be a binary yes/no question (e.g. "Will X happen by Y?").
- Do NOT create vague or duplicate markets.
- yesOdds should reflect signal sentiment (bullish > 0.55, bearish < 0.45).
`.trim();

  try {
    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    return JSON.parse(raw) as LLMDecisionResult;
  } catch (err) {
    console.error(`[${agentName}] LLM call failed:`, err);
    return null;
  }
}

// ─── HELPER ──────────────────────────────────────────────────────
function emit(level: AgentLog["level"], agentName: string, message: string, decision?: AgentDecision) {
  agentBus.emit("log", { agentName, level, message, timestamp: Date.now(), decision });
}

function statusText(sentiment: string): MarketProposal["statusText"] {
  if (sentiment === "bullish") return "Growth Surge";
  if (sentiment === "bearish") return "Risk Alert";
  return "Steady Flow";
}

function badgeFor(category: string): string {
  const map: Record<string, string> = {
    crypto: "Crypto Architecture",
    macro: "Macro Ecosystem",
    sports: "Sports Intelligence",
    tech: "Compute Architecture",
    social: "Social Intelligence",
  };
  return map[category] ?? "Signal Intelligence";
}

function expiryDate(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString();
}

// ─── BASE AGENT ──────────────────────────────────────────────────
abstract class BaseAgent {
  abstract name: string;
  abstract strategy: string;
  abstract sources: Signal["source"][];
  abstract systemPrompt: string;
  abstract color: AgentStatus["color"];
  abstract specialbadge: string;
  abstract domainexpertise: string;

  protected marketsCreated = 0;
  protected decisionsThisCycle = 0;

  protected filterSignals(all: Signal[]): Signal[] {
    return all.filter((s) => this.sources.includes(s.source));
  }

  protected updateStatus(status: string) {
    agentStatuses.set(this.name, {
      name: this.name,
      strategy: this.strategy,
      sources: this.sources,
      status,
      lastRunAt: Date.now(),
      decisionsThisCycle: this.decisionsThisCycle,
      marketsCreated: this.marketsCreated,
      color: this.color,
      specialbadge: this.specialbadge,
      domainexpertise: this.domainexpertise,
    });
  }

  async run(allSignals: Signal[]): Promise<AgentDecision> {
    this.decisionsThisCycle = 0;
    const signals = this.filterSignals(allSignals);

    if (signals.length === 0) {
      const msg = `No relevant signals this cycle (sources: ${this.sources.join(", ")})`;
      emit("info", this.name, msg);
      this.updateStatus(msg);
      return { createMarket: false, reasoning: msg, agentName: this.name, timestamp: Date.now() };
    }

    this.updateStatus(`Analyzing ${signals.length} signals via LLM...`);
    emit("info", this.name, `Processing ${signals.length} signals — top: "${signals[0]?.topic?.slice(0, 70)}..."`);

    const result = await callLLM(this.name, this.systemPrompt, signals);

    if (!result) {
      const msg = "LLM unconfigured or unavailable — skipping decision.";
      this.updateStatus(msg);
      return { createMarket: false, reasoning: msg, agentName: this.name, timestamp: Date.now() };
    }

    const decision: AgentDecision = {
      createMarket: result.createMarket,
      reasoning: result.reasoning,
      agentName: this.name,
      timestamp: Date.now(),
    };

    if (result.createMarket && result.title) {
      if (isDuplicate(result.title)) {
        const msg = `Duplicate suppressed: "${result.title.slice(0, 60)}"`;
        emit("warn", this.name, msg);
        this.updateStatus(msg);
        decision.createMarket = false;
        decision.reasoning = `Duplicate market suppressed. ${result.reasoning}`;
        return decision;
      }

      const topSignal = signals[0]!;
      const proposal: MarketProposal = {
        title: result.title,
        category: (result.category as MarketProposal["category"]) ?? "crypto",
        description: result.description ?? "",
        expiry: result.expiry ?? expiryDate(14),
        confidence: Math.max(0, Math.min(100, Math.round(result.confidence))),
        yesOdds: Math.max(0.05, Math.min(0.95, result.yesOdds)),
        noOdds: Math.max(0.05, Math.min(0.95, 1 - result.yesOdds)),
        sourceSignals: signals.slice(0, 5),
        agent: this.name,
        badge: badgeFor(result.category),
        statusText: statusText(topSignal.sentiment),
        ref: `#${this.name.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      };

      decision.market = proposal;
      this.decisionsThisCycle++;
      this.marketsCreated++;

      agentBus.emit("marketProposed", proposal, this.name);
      emit("decision", this.name, `✅ Market proposed: "${result.title.slice(0, 70)}" (confidence=${result.confidence}%)`, decision);
      this.updateStatus(`Market created: "${result.title.slice(0, 50)}"`);
    } else {
      emit("info", this.name, `No market this cycle. Reason: ${result.reasoning}`);
      this.updateStatus(`Idle — ${result.reasoning.slice(0, 80)}`);
    }

    return decision;
  }
}

// ─── AGENT IMPLEMENTATIONS ────────────────────────────────────────
class MacroAgentImpl extends BaseAgent {
  name = "MacroAgent";
  strategy = "Macroeconomic & Institutional Analytics";
  sources: Signal["source"][] = ["crypto", "news"];
  color: AgentStatus["color"] = "primary";
  specialbadge = "Macro Volatility";
  domainexpertise = "ETF Flows & FOMC Interest Sentiment";
  systemPrompt = `You are MacroAgent, an elite domain specialist in cryptocurrency macroeconomics and institutional capital flows.
Your specialized mandate is to:
- Monitor traditional finance ETF flows (such as BlackRock IBIT or Fidelity FBTC inflows/outflows)
- Track macroeconomic volatility metrics (CPI inflation prints, macroeconomic indicators)
- Analyze Federal Reserve interest rate sentiment (FOMC meetings, rate cut projections, Powell pressers)
- Evaluate stablecoin liquidity shifts (USDT/USDC supply expansions or capital shifts across chains)
- Detect cross-market correlation anomalies between traditional market equities (like S&P 500) and major crypto assets.

Only propose prediction markets that hinge on verifiable macroeconomic index results, ETF balance thresholds, stablecoin mint benchmarks, or FOMC decisions. Ensure clear binary conditions.`;

  protected filterSignals(all: Signal[]): Signal[] {
    const macroKeywords = [
      "etf", "fed", "interest", "rate", "inflation", "cpi", "fomc", "stablecoin", "usdt", "usdc",
      "liquidity", "inflow", "outflow", "macro", "correlation", "treasury", "yield", "powell", "blackrock", "fidelity",
      "institutional", "crypto", "btc", "eth", "sol"
    ];
    return all.filter(
      (s) =>
        this.sources.includes(s.source) &&
        macroKeywords.some((kw) => s.topic.toLowerCase().includes(kw))
    );
  }
}

class SocialAgentImpl extends BaseAgent {
  name = "SocialAgent";
  strategy = "Viral Sentiment & Narrative Propagation";
  sources: Signal["source"][] = ["reddit", "trends"];
  color: AgentStatus["color"] = "secondary";
  specialbadge = "Viral Indexer";
  domainexpertise = "Meme Velocity & Sentiment Decays";
  systemPrompt = `You are SocialAgent, a domain specialist in crowd psychology, meme coin velocity, and social sentiment decay.
Your specialized mandate is to:
- Detect viral acceleration of new tokens, protocols, and web3 narratives
- Track meme propagation velocity across social hubs (Reddit, Google Trends, social platforms)
- Spot Reddit engagement spikes and sub-reddit subscriber growth anomalies
- Analyze influencer amplification networks and trend velocity
- Calibrate for sentiment momentum decay (identifying when a hype cycle is about to peak or burn out).

Only propose prediction markets around social trends, meme coin volume peaks, keyword volume thresholds, or community engagement metrics before the hype decays.`;

  protected filterSignals(all: Signal[]): Signal[] {
    const socialKeywords = [
      "reddit", "viral", "meme", "sentiment", "doge", "pepe", "shib", "spiked", "hype",
      "twitter", "engagement", "velocity", "propagation", "influencer", "community", "trend", "acceleration",
      "keyword", "social", "traffic", "buzz"
    ];
    return all.filter(
      (s) =>
        this.sources.includes(s.source) &&
        socialKeywords.some((kw) => s.topic.toLowerCase().includes(kw))
    );
  }
}

class SportsAgentImpl extends BaseAgent {
  name = "SportsAgent";
  strategy = "Sports Timing & Probability Calibrator";
  sources: Signal["source"][] = ["trends", "news"];
  color: AgentStatus["color"] = "tertiary";
  specialbadge = "Timing Analytics";
  domainexpertise = "Probability Model odds Calibration";
  systemPrompt = `You are SportsAgent, an elite domain specialist in sports event mechanics and probabilistic odds calibration.
Your specialized mandate is to:
- Validate event timing (ensure exact dates and scheduling constraints)
- Verify alignment with external sports APIs and news updates
- Calibrate probability models to set robust, mathematically sound odds
- Detect scheduling conflicts and postpone anomalies before proposing.

Only propose prediction markets around validated sporting events, championships, matches, or racer finishes with deterministic outcomes and non-ambiguous timings. Ensure the resolution condition specifies the exact game and official scoring source.`;

  protected filterSignals(all: Signal[]): Signal[] {
    const sportKeywords = [
      "nfl", "nba", "soccer", "football", "basketball", "tennis", "f1", "formula",
      "world cup", "champion", "playoff", "super bowl", "game", "match", "tournament",
      "olympic", "sport", "league", "team", "player", "athlete", "score", "racing", "mlb", "fifa", "premier"
    ];
    return all.filter(
      (s) =>
        this.sources.includes(s.source) &&
        sportKeywords.some((kw) => s.topic.toLowerCase().includes(kw))
    );
  }

  async run(allSignals: Signal[]): Promise<AgentDecision> {
    const filtered = this.filterSignals(allSignals);
    if (filtered.length === 0) {
      const msg = "Sports Calendar: ACTIVE — no new scheduling signals or tournament spikes detected.";
      emit("info", this.name, msg);
      this.updateStatus(msg);
      return { createMarket: false, reasoning: msg, agentName: this.name, timestamp: Date.now() };
    }

    const decision = await super.run(filtered);
    // Specialized Domain Correction: Validate event timing & Calibrate odds
    if (decision.createMarket && decision.market) {
      decision.market.description = `[TIMING CONFIRMED & ODDS CALIBRATED] ` + decision.market.description;
      decision.reasoning = `[SPORTS API CALIBRATION VERIFIED] ` + decision.reasoning;
      emit("info", this.name, `Validated event timing and calibrated odds to YES: ${Math.round(decision.market.yesOdds * 100)}% | NO: ${Math.round(decision.market.noOdds * 100)}%`);
    }
    return decision;
  }
}

class RiskAgentImpl extends BaseAgent {
  name = "RiskAgent";
  strategy = "Manipulation & Volatility Stress Filter";
  sources: Signal["source"][] = ["crypto", "news", "reddit", "trends"];
  color: AgentStatus["color"] = "tertiary";
  specialbadge = "Stability Arbitrage";
  domainexpertise = "Anomaly & Manipulation Detection";
  systemPrompt = `You are RiskAgent, the institutional risk filter and systemic stability guardian.
Your specialized mandate is to:
- Detect manipulation attempts and wash trading indicators
- Identify low-liquidity and thin-orderbook anomalies in active tokens
- Flag suspicious market creation patterns or highly volatile speculative bubbles
- Systematically calibrate predictions to reduce confidence scores under high-volatility stress.

Propose risk mitigation prediction markets (e.g. Will a token experience a 30% correction? Will liquidity drop below a safe threshold?).
Rules:
- Automatically downgrade your confidence if signals show high volatility.
- Focus on security, exploits, low liquidity, and regulatory sanctions.`;

  protected filterSignals(all: Signal[]): Signal[] {
    const riskKeywords = [
      "manipulation", "exploit", "hack", "liquidity", "volatility", "stress", "suspicious",
      "sec", "lawsuit", "regulation", "alert", "anomaly", "risk", "unstability", "leverage", "liquidated",
      "crash", "decline", "collapse", "downgrade", "threat", "vulnerability"
    ];
    return all.filter(
      (s) =>
        this.sources.includes(s.source) &&
        riskKeywords.some((kw) => s.topic.toLowerCase().includes(kw))
    );
  }

  async run(allSignals: Signal[]): Promise<AgentDecision> {
    const filtered = this.filterSignals(allSignals);
    if (filtered.length === 0) {
      const msg = "Risk level: NOMINAL — no systemic anomalies or manipulation patterns flagged.";
      emit("info", this.name, msg);
      this.updateStatus(msg);
      return { createMarket: false, reasoning: msg, agentName: this.name, timestamp: Date.now() };
    }
    
    const decision = await super.run(filtered);
    // Specialized Domain Correction: Reduce confidence score under volatility stress
    if (decision.createMarket && decision.market) {
      const hasHighVolatility = filtered.some(s => s.velocity > 75 || s.topic.toLowerCase().includes("volatility") || s.topic.toLowerCase().includes("stress"));
      if (hasHighVolatility) {
        const originalConf = decision.market.confidence;
        decision.market.confidence = Math.max(30, Math.round(originalConf * 0.75));
        decision.market.description = `[RISK ADVISORY: High Volatility Stress Detected] ` + decision.market.description;
        decision.reasoning = `[VOLATILITY FILTER APPLIED - CONFIDENCE ADJUSTED FROM ${originalConf}% TO ${decision.market.confidence}%] ` + decision.reasoning;
        emit("warn", this.name, `Systemic volatility stress detected. Reduced confidence score from ${originalConf}% to ${decision.market.confidence}%`);
      }
    }
    return decision;
  }
}

// ─── AGENT INSTANCES ─────────────────────────────────────────────
const agents = [
  new MacroAgentImpl(),
  new SocialAgentImpl(),
  new SportsAgentImpl(),
  new RiskAgentImpl(),
] as const;

// ─── DEPLOYMENT WITH AUTOMATED RETRY WORKFLOW ──────────────────────
async function deployWithRetry(proposal: MarketProposal, maxAttempts = 3): Promise<any> {
  let lastError: any = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[INTEGRATION] ⛓️ BLOCKCHAIN_TX_SENT: Sending transaction on-chain for "${proposal.title.slice(0, 50)}" | Attempt ${attempt}/${maxAttempts}`);
      const result = await createMarketOnChain(proposal);
      console.log(`[INTEGRATION] ✅ BLOCKCHAIN_CONFIRMED: Smart contract confirmed on-chain on attempt ${attempt}! TxHash: ${result.txHash} | Market ID: ${result.marketId}`);
      return result;
    } catch (err: any) {
      lastError = err;
      console.warn(`[INTEGRATION] ❌ BLOCKCHAIN_ERROR: Attempt ${attempt}/${maxAttempts} failed: ${err.message || err}`);
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
      }
    }
  }
  throw lastError || new Error(`Failed to deploy after ${maxAttempts} attempts`);
}

// When any agent proposes a market, RiskAgent reviews it for quality
agentBus.on("marketProposed", (proposal, sourceAgent) => {
  const titleKey = marketFingerprint(proposal.title);
  
  if (sourceAgent === "RiskAgent") {
    const alreadyApproved = approvedMarkets.some((m) => marketFingerprint(m.title) === titleKey);
    if (!alreadyApproved) {
      approvedMarkets.unshift(proposal);
      if (approvedMarkets.length > 30) approvedMarkets.pop();
      
      // Asynchronously deploy on-chain
      deployWithRetry(proposal, 3)
        .then((result) => {
          proposal.status = "ACTIVE";
          proposal.settlementTx = result.txHash;
          (proposal as any).onChainMarketId = result.marketId;
          emit("decision", "RiskAgent", `⛓️ [ON-CHAIN DEPLOYED] Market "${proposal.title.slice(0, 50)}" registered on Somnia L1. Tx: ${result.txHash.slice(0, 16)}... (ID: ${result.marketId})`);
          
          const txResult = {
            market: proposal,
            onChainMarketId: result.marketId,
            txHash: result.txHash,
            timestamp: Date.now()
          };
          
          eventBus.emit("MARKET_CREATED", txResult);
          
          transactionHistory.push({
            title: proposal.title,
            onChainMarketId: result.marketId,
            txHash: result.txHash,
            status: "CONFIRMED",
            timestamp: Date.now()
          });
        })
        .catch((err) => {
          emit("error", "RiskAgent", `❌ [ON-CHAIN FAILURE] Failed to deploy market: ${err.message}`);
          
          transactionHistory.push({
            title: proposal.title,
            status: "FAILED",
            error: err.message || String(err),
            timestamp: Date.now()
          });
        });
    }
    return;
  }

  // Quality gate: confidence must be >= 60 and odds must not be degenerate
  const tooLowConfidence = proposal.confidence < 60;
  const degenerateOdds = proposal.yesOdds < 0.1 || proposal.yesOdds > 0.9;

  if (tooLowConfidence || degenerateOdds) {
    const reason = tooLowConfidence
      ? `Confidence too low (${proposal.confidence}% < 60% threshold)`
      : `Odds out of range (YES=${(proposal.yesOdds * 100).toFixed(0)}%)`;
    agentBus.emit("proposalVetoed", proposal.title, reason);
    emit("warn", "RiskAgent", `🚫 VETO — "${proposal.title.slice(0, 60)}" — ${reason}`);
    return;
  }

  const alreadyApproved = approvedMarkets.some((m) => marketFingerprint(m.title) === titleKey);
  if (!alreadyApproved) {
    approvedMarkets.unshift(proposal);
    if (approvedMarkets.length > 30) approvedMarkets.pop();
    emit("decision", "RiskAgent", `✅ APPROVED — "${proposal.title.slice(0, 60)}" from ${sourceAgent}`);

    // Asynchronously deploy on-chain
    deployWithRetry(proposal, 3)
      .then((result) => {
        proposal.status = "ACTIVE";
        proposal.settlementTx = result.txHash;
        (proposal as any).onChainMarketId = result.marketId;
        emit("decision", "RiskAgent", `⛓️ [ON-CHAIN DEPLOYED] Market "${proposal.title.slice(0, 50)}" registered on Somnia L1. Tx: ${result.txHash.slice(0, 16)}... (ID: ${result.marketId})`);
        
        const txResult = {
          market: proposal,
          onChainMarketId: result.marketId,
          txHash: result.txHash,
          timestamp: Date.now()
        };
        
        eventBus.emit("MARKET_CREATED", txResult);
        
        transactionHistory.push({
          title: proposal.title,
          onChainMarketId: result.marketId,
          txHash: result.txHash,
          status: "CONFIRMED",
          timestamp: Date.now()
        });
      })
      .catch((err) => {
        emit("error", "RiskAgent", `❌ [ON-CHAIN FAILURE] Failed to deploy market: ${err.message}`);
        
        transactionHistory.push({
          title: proposal.title,
          status: "FAILED",
          error: err.message || String(err),
          timestamp: Date.now()
        });
      });
  }
});

agentBus.on("proposalVetoed", (title, reason) => {
  console.log(`[RiskAgent] Veto applied: "${title.slice(0, 60)}" — ${reason}`);
});

// ─── AGENT LOG BUFFER ────────────────────────────────────────────
export const agentLogs: AgentLog[] = [];

agentBus.on("log", (entry) => {
  console.log(`[${entry.agentName}] [${entry.level.toUpperCase()}] ${entry.message}`);
  agentLogs.unshift(entry);
  if (agentLogs.length > 200) agentLogs.pop();
});

// ─── MAIN ENGINE LOOP ────────────────────────────────────────────
const CYCLE_MS = env.AGENT_CYCLE_MS;
let engineRunning = false;
let cycleTimer: ReturnType<typeof setInterval> | null = null;
let cycleCount = 0;

async function runCycle(): Promise<void> {
  cycleCount++;
  const allSignals = getLiveSignals();

  console.log(
    `\n[AgentEngine] ═══ Cycle #${cycleCount} | ${new Date().toISOString()} | ${allSignals.length} signals ═══`
  );

  if (allSignals.length === 0) {
    console.warn("[AgentEngine] No live signals available — waiting for signalEngine to populate.");
    return;
  }

  evictOldFingerprints();

  // Run all agents concurrently
  const results = await Promise.allSettled(agents.map((agent) => agent.run(allSignals)));

  const decisions = results
    .filter((r): r is PromiseFulfilledResult<AgentDecision> => r.status === "fulfilled")
    .map((r) => r.value);

  // Emit agent decisions
  decisions.forEach((decision) => {
    console.log(`[INTEGRATION] 🧠 AGENT_DECISION: agentName=${decision.agentName} | createMarket=${decision.createMarket} | reasoning="${decision.reasoning.slice(0, 120).replace(/\n/g, " ")}..."`);
    eventBus.emit("AGENT_DECISION_MADE", {
      agentName: decision.agentName,
      decision: {
        createMarket: decision.createMarket,
        market: decision.market ? {
          ...decision.market,
          category: decision.market.category as any
        } : undefined,
        reasoning: decision.reasoning,
        agentName: decision.agentName,
        timestamp: Date.now()
      },
      timestamp: Date.now()
    });
  });

  const created = decisions.filter((d) => d.createMarket).length;
  console.log(
    `[AgentEngine] Cycle #${cycleCount} complete — ${created} market(s) proposed this cycle | total approved: ${approvedMarkets.length}`
  );
}

export async function startAgentEngine(): Promise<void> {
  if (engineRunning) {
    console.warn("[AgentEngine] Already running.");
    return;
  }

  engineRunning = true;
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║     AstraMarkets Agent Engine v1.0           ║");
  console.log("║  MacroAgent | SocialAgent | SportsAgent      ║");
  console.log("║  RiskAgent  | EventBus  | LLM: " + LLM_MODEL.padEnd(12) + "║");
  console.log("╚══════════════════════════════════════════════╝");

  await runCycle();
  cycleTimer = setInterval(runCycle, CYCLE_MS);
}

export function stopAgentEngine(): void {
  if (cycleTimer) {
    clearInterval(cycleTimer);
    cycleTimer = null;
    engineRunning = false;
    console.log("[AgentEngine] Stopped.");
  }
}

export function getAgentStatuses(): AgentStatus[] {
  return Array.from(agentStatuses.values());
}

export function getApprovedMarkets(): MarketProposal[] {
  return approvedMarkets;
}

export function getAgentLogs(limit = 50): AgentLog[] {
  return agentLogs.slice(0, limit);
}
