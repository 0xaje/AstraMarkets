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
  strategy = "Offshore Liquidity & Crypto Price Analysis";
  sources: Signal["source"][] = ["crypto", "news"];
  color: AgentStatus["color"] = "primary";
  systemPrompt = `You are MacroAgent, a specialist in cryptocurrency markets and macroeconomic trends.
You monitor crypto price movements, ETF flows, institutional positioning, Federal Reserve policy, and global financial conditions.
You excel at spotting high-conviction binary prediction opportunities in crypto and macro markets.
Only propose markets when there is strong directional signal with a clear resolution condition.`;
}

class SocialAgentImpl extends BaseAgent {
  name = "SocialAgent";
  strategy = "Viral Sentiment & Social Intelligence";
  sources: Signal["source"][] = ["reddit", "trends"];
  color: AgentStatus["color"] = "secondary";
  systemPrompt = `You are SocialAgent, a specialist in social media sentiment and viral trends.
You monitor Reddit communities, Google Trends spikes, and viral narratives around crypto, tech, and finance.
You identify emerging community-driven price movements and sentiment shifts before they hit mainstream.
Focus on markets where crowd psychology is the primary driver (meme coins, viral narratives, community events).`;
}

class SportsAgentImpl extends BaseAgent {
  name = "SportsAgent";
  strategy = "Sports & Event Outcome Intelligence";
  sources: Signal["source"][] = ["trends", "news"];
  color: AgentStatus["color"] = "tertiary";
  systemPrompt = `You are SportsAgent, a specialist in sports events and real-world outcome prediction.
You monitor Google Trends for sports queries, breaking sports news, major tournaments, championship outcomes, and athlete performance events.
You create prediction markets around sports results, championship winners, and sports-related financial instruments.
Only propose markets for events with a clear binary outcome and a near-term resolution date.`;

  protected filterSignals(all: Signal[]): Signal[] {
    const sportKeywords = [
      "nfl", "nba", "soccer", "football", "basketball", "tennis", "f1", "formula",
      "world cup", "champion", "playoff", "super bowl", "game", "match", "tournament",
      "olympic", "sport", "league", "team", "player", "athlete", "score",
    ];
    return all.filter(
      (s) =>
        this.sources.includes(s.source) &&
        sportKeywords.some((kw) => s.topic.toLowerCase().includes(kw))
    );
  }
}

class RiskAgentImpl extends BaseAgent {
  name = "RiskAgent";
  strategy = "Dynamic Volatility & Quality Arbitrage Filter";
  sources: Signal["source"][] = ["crypto", "news", "reddit", "trends"];
  color: AgentStatus["color"] = "tertiary";
  systemPrompt = `You are RiskAgent, the quality control layer of AstraMarkets.
Your role is to assess market-wide risk conditions and create high-conviction volatility/risk markets.
You look for systemic risk signals: regulatory changes, exchange failures, protocol exploits, macroeconomic shocks, contagion risks.
Only propose markets around genuine systemic risk events with clear binary outcomes.`;

  async run(allSignals: Signal[]): Promise<AgentDecision> {
    const highImportance = allSignals.filter((s) => s.importance >= 70);
    if (highImportance.length === 0) {
      const msg = "Market risk level: NOMINAL — no systemic signals detected.";
      emit("info", this.name, msg);
      this.updateStatus(msg);
      return { createMarket: false, reasoning: msg, agentName: this.name, timestamp: Date.now() };
    }
    return super.run(highImportance);
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
