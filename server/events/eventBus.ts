import EventEmitter from "eventemitter3";
import type { Response } from "express";

// ─── EVENT TYPES & PAYLOAD DEFINITIONS ──────────────────────────────

export type AstraEvent = 
  | "SIGNAL_DETECTED"
  | "MARKET_CREATED"
  | "AGENT_DECISION_MADE"
  | "TRADE_EXECUTED";

export interface Signal {
  topic: string;
  source: "crypto" | "news" | "reddit" | "trends";
  sentiment: "bullish" | "bearish" | "neutral";
  importance: number; // 0-100
  velocity: number;   // 0-100
  timestamp: number;
}

export interface MarketProposal {
  title: string;
  category: "crypto" | "macro" | "sports" | "tech" | "social";
  description: string;
  expiry: string;
  confidence: number;
  yesOdds: number;
  noOdds: number;
  agent: string;
  badge: string;
  statusText: string;
  ref: string;
  status?: "ACTIVE" | "EXPIRED" | "RESOLVED" | "DISPUTED";
  resolvedOutcome?: boolean;
  settlementTimestamp?: number;
  settlementTx?: string;
  onChainMarketId?: number;
  dispute?: any;
}

export interface AgentDecision {
  createMarket: boolean;
  market?: MarketProposal;
  reasoning: string;
  agentName: string;
  timestamp: number;
}

export interface SignalDetectedPayload {
  signal: Signal;
  timestamp: number;
}

export interface MarketCreatedPayload {
  market: MarketProposal;
  onChainMarketId?: number;
  txHash?: string;
  timestamp: number;
}

export interface AgentDecisionMadePayload {
  agentName: string;
  decision: AgentDecision;
  timestamp: number;
}

export interface TradeExecutedPayload {
  marketId: string;
  marketTitle: string;
  ref: string;
  trader: string;
  position: boolean; // true = YES, false = NO
  amountSpent: number;
  sharesMinted: number;
  txHash: string;
  timestamp: number;
}

// ─── EVENT MAP FOR TYPE SAFETY ──────────────────────────────────────

interface AstraEventTypes {
  SIGNAL_DETECTED: [SignalDetectedPayload];
  MARKET_CREATED: [MarketCreatedPayload];
  AGENT_DECISION_MADE: [AgentDecisionMadePayload];
  TRADE_EXECUTED: [TradeExecutedPayload];
}

// ─── EVENT BUS CLASS ────────────────────────────────────────────────

class AstraEventBus extends EventEmitter<AstraEventTypes> {
  private sseClients: Response[] = [];

  constructor() {
    super();
    this.setupDebugLogging();
  }

  /**
   * Internal listener to print structured, beautiful debugging logs for every event.
   */
  private setupDebugLogging() {
    this.on("SIGNAL_DETECTED", (payload) => {
      console.log(`[EventBus] 📡 SIGNAL_DETECTED | Source: ${payload.signal.source.toUpperCase()} | Topic: "${payload.signal.topic.slice(0, 50)}..." | Sentiment: ${payload.signal.sentiment.toUpperCase()} | Importance: ${payload.signal.importance}`);
    });

    this.on("MARKET_CREATED", (payload) => {
      console.log(`[EventBus] 🚀 MARKET_CREATED | Ref: ${payload.market.ref} | Title: "${payload.market.title.slice(0, 50)}..." | On-Chain ID: ${payload.onChainMarketId ?? "N/A"} | Tx: ${payload.txHash ? payload.txHash.slice(0, 16) + "..." : "Simulated"}`);
    });

    this.on("AGENT_DECISION_MADE", (payload) => {
      console.log(`[EventBus] 🤖 AGENT_DECISION_MADE | Agent: ${payload.agentName} | CreateMarket: ${payload.decision.createMarket} | Reasoning: "${payload.decision.reasoning.slice(0, 60)}..."`);
    });

    this.on("TRADE_EXECUTED", (payload) => {
      console.log(`[EventBus] 💸 TRADE_EXECUTED | Ref: ${payload.ref} | Trader: ${payload.trader} | ${payload.position ? "YES" : "NO"} shares | Spent: ${payload.amountSpent} SOM | Tx: ${payload.txHash.slice(0, 16)}...`);
    });
  }

  /**
   * Register a new client's Express Response object to receive Server-Sent Events (SSE).
   */
  public registerSseClient(res: Response) {
    this.sseClients.push(res);
    console.log(`[EventBus] 🟢 SSE Client connected. Total active connections: ${this.sseClients.length}`);

    // Automatically prune connection when closed
    res.on("close", () => {
      this.sseClients = this.sseClients.filter((client) => client !== res);
      console.log(`[EventBus] 🔴 SSE Client disconnected. Active connections: ${this.sseClients.length}`);
    });
  }

  /**
   * Overridden emit function that also automatically broadcasts the event payload to all SSE clients in real time.
   */
  public emit<T extends keyof AstraEventTypes>(event: T, ...args: AstraEventTypes[T]): boolean {
    const success = super.emit(event, ...args as any);
    
    // Broadcast to SSE clients
    const payload = `event: ${event}\ndata: ${JSON.stringify(args[0])}\n\n`;
    this.sseClients.forEach((client) => {
      try {
        client.write(payload);
      } catch {
        // Suppress errors for dead client connections
      }
    });

    return success;
  }
}

export const eventBus = new AstraEventBus();
export default eventBus;
