/**
 * AstraMarkets — Agent Type Definitions
 * ─────────────────────────────────────────────────────────────────
 * Canonical data shapes shared across all autonomous agents and
 * the agent engine orchestrator.
 */

import type { Signal } from "../signals/signalEngine.js";

// ─── MARKET PROPOSAL ─────────────────────────────────────────────

export interface LifecycleEvent {
  phase: "signal_detected" | "agent_deliberation" | "market_deployed" | "liquidity_entered" | "settlement_finalized";
  label: string;
  timestamp: number;
  detail?: string;
}

export interface MarketProposal {
  title: string;
  category: "crypto" | "macro" | "sports" | "tech" | "social";
  description: string;
  expiry: string;         // ISO 8601 date string — when the market resolves
  confidence: number;     // 0–100 confidence from the LLM
  yesOdds: number;        // initial YES probability 0–1
  noOdds: number;         // initial NO probability 0–1 (= 1 - yesOdds)
  sourceSignals: Signal[]; // raw signals that drove this decision
  agent: string;          // which agent created this
  badge: string;          // display badge label
  statusText: string;     // Growth Surge | Risk Alert | Steady Flow | Golden Yield
  ref: string;            // short unique reference code
  status?: "ACTIVE" | "EXPIRED" | "RESOLVED" | "DISPUTED"; // current settlement status
  resolvedOutcome?: boolean;                  // resolved YES (true) or NO (false)
  settlementTimestamp?: number;               // UNIX timestamp of settlement
  settlementTx?: string;                      // on-chain settlement transaction hash
  yesSharesPool?: number;
  noSharesPool?: number;
  totalLiquidity?: number;
  volume?: number;
  onChainMarketId?: number;
  dispute?: any;
  // Transparency layer
  createdAt?: number;                         // when market was approved
  lifecycle?: LifecycleEvent[];               // market lifecycle event trail
  topSignalSummary?: string;                  // strongest influencing signal summary
  riskNote?: string;                          // risk adjustment explanation
  reasoning?: string;                         // agent core explainable deliberation reasoning
}

// ─── AGENT DECISION ──────────────────────────────────────────────

export interface AgentDecision {
  createMarket: boolean;
  market?: MarketProposal;
  reasoning: string;      // LLM chain-of-thought summary (for logs)
  agentName: string;
  timestamp: number;
}

// ─── AGENT LOG ENTRY ─────────────────────────────────────────────

export interface AgentLog {
  agentName: string;
  level: "info" | "decision" | "warn" | "error";
  message: string;
  timestamp: number;
  decision?: AgentDecision;
}

// ─── AGENT STATUS ────────────────────────────────────────────────

export interface AgentStatus {
  name: string;
  strategy: string;
  sources: Signal["source"][];
  status: string;
  lastRunAt: number | null;
  decisionsThisCycle: number;
  marketsCreated: number;
  color: "primary" | "secondary" | "tertiary";
  specialbadge?: string;
  domainexpertise?: string;
}

// ─── EVENT BUS EVENTS ────────────────────────────────────────────

export interface AgentEvents {
  /** Fired by an agent when it decides to create a market */
  marketProposed: (proposal: MarketProposal, sourceAgent: string) => void;
  /** Fired when an agent wants to broadcast a signal to peers */
  signalBroadcast: (signals: Signal[], sourceAgent: string) => void;
  /** Fired when the RiskAgent vetoes a proposal */
  proposalVetoed: (title: string, reason: string) => void;
  /** General agent log entry */
  log: (entry: AgentLog) => void;
}
