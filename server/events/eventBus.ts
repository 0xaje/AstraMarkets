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
  }


  /**
   * Register a new client's Express Response object to receive SSE.
   */
  public registerSseClient(res: Response) {
    this.sseClients.push(res);
    // Automatically prune on disconnect
    res.on("close", () => {
      this.sseClients = this.sseClients.filter((client) => client !== res);
    });
  }

  /** Broadcast a raw (non-typed) SSE event to all connected clients. */
  public broadcastRaw(event: string, data: unknown) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    this.sseClients.forEach((client) => {
      try { client.write(payload); } catch { /* dead client */ }
    });
  }

  /**
   * Overridden emit — broadcasts typed events to SSE clients in real time.
   */
  public emit<T extends keyof AstraEventTypes>(event: T, ...args: AstraEventTypes[T]): boolean {
    const success = super.emit(event, ...args as any);
    const payload = `event: ${event}\ndata: ${JSON.stringify(args[0])}\n\n`;
    this.sseClients.forEach((client) => {
      try { client.write(payload); } catch { /* dead client */ }
    });
    return success;
  }
}


export const eventBus = new AstraEventBus();
export default eventBus;
