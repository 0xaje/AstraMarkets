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
import {
  adjustConfidenceViaMemory,
  recordPredictionMemory,
  recordResolutionMemory
} from "./agentMemory.js";
import { CryptoAgentImpl } from "./plugins/CryptoAgent.js";
import { TechAgentImpl } from "./plugins/TechAgent.js";

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

// ─── LLM DECISION CALL & CIRCUIT BREAKER ─────────────────────────
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

let llmConsecutiveFailures = 0;
const MAX_LLM_FAILURES = 3;
let llmCircuitBreakerOpenUntil = 0;

async function callLLM(
  agentName: string,
  systemPrompt: string,
  signals: Signal[],
  retries = 2
): Promise<LLMDecisionResult | null> {
  if (signals.length === 0) return null;

  if (Date.now() < llmCircuitBreakerOpenUntil) {
    console.warn(`[${agentName}] 🛑 LLM Circuit Breaker Open. Skipping analysis until ${new Date(llmCircuitBreakerOpenUntil).toISOString()}`);
    return null;
  }

  if (!openai) {
    console.warn(`[${agentName}] ⚠️ OpenAI client unconfigured. Real LLM execution required.`);
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
- The title MUST be a binary yes/no question.
- Do NOT create vague or duplicate markets.
- yesOdds should reflect signal sentiment (bullish > 0.55, bearish < 0.45).
`.trim();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15s hard timeout

      const response = await openai.chat.completions.create({
        model: LLM_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 500,
        response_format: { type: "json_object" },
      }, { signal: controller.signal as any });

      clearTimeout(timeout);
      llmConsecutiveFailures = 0; // Reset breaker on success
      
      const raw = response.choices[0]?.message?.content ?? "{}";
      return JSON.parse(raw) as LLMDecisionResult;
    } catch (err: any) {
      console.warn(`[${agentName}] LLM call attempt ${attempt} failed: ${err.message}`);
      
      if (attempt === retries) {
        llmConsecutiveFailures++;
        if (llmConsecutiveFailures >= MAX_LLM_FAILURES) {
          console.error(`[CircuitBreaker] 💥 LLM failures exceeded threshold. Opening circuit breaker for 2 minutes.`);
          llmCircuitBreakerOpenUntil = Date.now() + 120_000;
        }
        return null;
      }
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1500 * Math.pow(2, attempt)));
    }
  }
  return null;
}

// ─── HELPER ──────────────────────────────────────────────────────
export function emit(level: AgentLog["level"], agentName: string, message: string, decision?: AgentDecision) {
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
export abstract class BaseAgent {
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

      const signalKeywords = signals.map(s => s.topic);
      const memoryAdjustment = adjustConfidenceViaMemory(this.name, result.confidence, signalKeywords);
      const adjustedConfidence = memoryAdjustment.adjustedConfidence;

      const topSignal = signals[0]!;
      const proposal: MarketProposal = {
        title: result.title,
        category: (result.category as MarketProposal["category"]) ?? "crypto",
        description: result.description ?? "",
        expiry: result.expiry ?? expiryDate(14),
        confidence: adjustedConfidence,
        yesOdds: Math.max(0.05, Math.min(0.95, result.yesOdds)),
        noOdds: Math.max(0.05, Math.min(0.95, 1 - result.yesOdds)),
        sourceSignals: signals.slice(0, 5),
        agent: this.name,
        badge: badgeFor(result.category),
        statusText: statusText(topSignal.sentiment),
        ref: `#${this.name.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        reasoning: `${result.reasoning} | Memory calibration: ${memoryAdjustment.rationale}`,
      };

      recordPredictionMemory(
        this.name,
        proposal.title,
        proposal.category,
        proposal.confidence,
        proposal.yesOdds,
        signalKeywords
      );

      decision.market = proposal;
      this.decisionsThisCycle++;
      this.marketsCreated++;

      agentBus.emit("marketProposed", proposal, this.name);
      emit("decision", this.name, `✅ Market proposed: "${result.title.slice(0, 70)}" (confidence=${adjustedConfidence}% | factor=${memoryAdjustment.memoryFactor})`, decision);
      this.updateStatus(`Market created: "${result.title.slice(0, 50)}"`);
    } else {
      emit("info", this.name, `No market this cycle. Reason: ${result.reasoning}`);
      this.updateStatus(`Idle — ${result.reasoning.slice(0, 80)}`);
    }

    return decision;
  }
}

// ─── AGENT INSTANCES ─────────────────────────────────────────────
const agents = [
  new CryptoAgentImpl(),
  new TechAgentImpl(),
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

// When an agent proposes a market, broadcast it to the frontend via SSE instead of auto-deploying
agentBus.on("marketProposed", (proposal, sourceAgent) => {
  const titleKey = marketFingerprint(proposal.title);
  
  // Quality gate: confidence must be >= 60 and odds must not be degenerate
  const tooLowConfidence = proposal.confidence < 60;
  const degenerateOdds = proposal.yesOdds < 0.1 || proposal.yesOdds > 0.9;

  if (tooLowConfidence || degenerateOdds) {
    const reason = tooLowConfidence
      ? `Confidence too low (${proposal.confidence}% < 60% threshold)`
      : `Odds out of range (YES=${(proposal.yesOdds * 100).toFixed(0)}%)`;
    agentBus.emit("proposalVetoed", proposal.title, reason);
    emit("warn", "System", `🚫 VETO — "${proposal.title.slice(0, 60)}" — ${reason}`);
    return;
  }

  const alreadyApproved = approvedMarkets.some((m) => marketFingerprint(m.title) === titleKey);
  if (!alreadyApproved) {
    approvedMarkets.unshift(proposal);
    if (approvedMarkets.length > 30) approvedMarkets.pop();
    emit("decision", "System", `✅ APPROVED & PROPOSED TO FRONTEND — "${proposal.title.slice(0, 60)}" from ${sourceAgent}`);

    // Emit the PROPOSAL_CREATED event for SSE broadcasting
    eventBus.emit("PROPOSAL_CREATED", proposal);
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
  decisions.forEach(decision => {
    eventBus.emit("AGENT_ANALYZED", {
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

export function getCircuitBreakerStatus(): { active: boolean; openUntil: number } {
  const active = Date.now() < llmCircuitBreakerOpenUntil;
  return { active, openUntil: active ? llmCircuitBreakerOpenUntil : 0 };
}
