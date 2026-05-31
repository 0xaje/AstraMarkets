import EventEmitter from "eventemitter3";
import type { Response } from "express";

export type AstraEvent = 
  | "SIGNAL_DETECTED"
  | "MARKET_CREATED"
  | "AGENT_DECISION_MADE"
  | "TRADE_EXECUTED"
  | "PROPOSAL_CREATED"
  | "MARKET_EXECUTED"
  | "AGENT_ANALYZED"
  | "MARKET_SETTLED";

export interface Signal {
  topic: string;
  source: "crypto" | "news" | "reddit" | "trends" | "hackernews";
  sentiment: "bullish" | "bearish" | "neutral";
  importance: number;
  velocity: number;
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

interface AstraEventTypes {
  SIGNAL_DETECTED: [any];
  MARKET_CREATED: [any];
  AGENT_DECISION_MADE: [any];
  TRADE_EXECUTED: [any];
  PROPOSAL_CREATED: [any];
  MARKET_EXECUTED: [any];
  AGENT_ANALYZED: [any];
  MARKET_SETTLED: [any];
  MARKET_UPDATED: [any];
  ORACLE_UNCERTAIN: [any];
}

class AstraEventBus extends EventEmitter<AstraEventTypes> {
  private sseClients: Set<Response> = new Set();
  private recentEvents: Map<string, number> = new Map();
  private eventHistory: string[] = [];

  public get getActiveClientCount(): number {
    return this.sseClients.size;
  }

  constructor() {
    super();
    // Heartbeat & Stale Connection Cleanup
    setInterval(() => {
      this.sseClients.forEach((client) => {
        try {
          // Send an SSE comment to keep connection alive and detect dead sockets
          client.write(":\\n\\n");
        } catch (e) {
          this.sseClients.delete(client);
        }
      });
    }, 15000);
  }

  public registerSseClient(res: Response) {
    this.sseClients.add(res);

    // Event Replay on connect for immediate context
    this.eventHistory.forEach((payload) => {
      try {
        if (!res.writableEnded) res.write(payload);
      } catch (e) {
        this.sseClients.delete(res);
      }
    });

    res.on("close", () => this.sseClients.delete(res));
    res.on("error", () => this.sseClients.delete(res));
  }

  public broadcastRaw(event: string, data: unknown) {
    const payload = `event: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n`;
    this.sseClients.forEach((client) => {
      try {
        if (!client.writableEnded) {
          client.write(payload);
        } else {
          this.sseClients.delete(client);
        }
      } catch {
        this.sseClients.delete(client);
      }
    });
  }

  private getEventFingerprint(event: string, data: any): string {
    const key = data?.title || data?.market?.title || data?.topic || "";
    return `\${event}:\${key}`;
  }

  public emit<T extends keyof AstraEventTypes>(event: T, ...args: AstraEventTypes[T]): boolean {
    const data = args[0] as any;
    const fingerprint = this.getEventFingerprint(event as string, data);
    
    // Duplicate prevention (deduplication window of 3 seconds)
    const now = Date.now();
    const lastSeen = this.recentEvents.get(fingerprint);
    if (lastSeen && now - lastSeen < 3000) {
      return false; // Suppress duplicate
    }
    this.recentEvents.set(fingerprint, now);

    // Housekeeping on recentEvents Map to prevent memory leaks
    if (this.recentEvents.size > 1000) {
      const evictionTime = now - 60000;
      for (const [key, timestamp] of this.recentEvents.entries()) {
        if (timestamp < evictionTime) this.recentEvents.delete(key);
      }
    }

    const success = super.emit(event, ...args as any);
    const payload = `event: \${event}\\ndata: \${JSON.stringify(data)}\\n\\n`;

    // Replay buffer (keep last 50 events)
    this.eventHistory.push(payload);
    if (this.eventHistory.length > 50) this.eventHistory.shift();

    // Broadcast with Backpressure protection
    this.sseClients.forEach((client) => {
      try {
        if (!client.writableEnded) {
          client.write(payload);
        } else {
          this.sseClients.delete(client);
        }
      } catch {
        this.sseClients.delete(client);
      }
    });
    
    return success;
  }
}

export const eventBus = new AstraEventBus();
export default eventBus;
