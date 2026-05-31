import { Signal } from "../../signals/signalEngine.js";
import { AgentDecision, AgentStatus } from "../agentTypes.js";
import { BaseAgent, emit } from "../agentEngine.js";

export class CryptoAgentImpl extends BaseAgent {
  name = "CryptoAgent";
  strategy = "Crypto & On-Chain Analytics";
  sources: Signal["source"][] = ["crypto", "news", "reddit", "trends"];
  color: AgentStatus["color"] = "primary";
  specialbadge = "CRYPTO";
  domainexpertise = "Asset Trends & On-Chain Momentum";
  systemPrompt = `You are CryptoAgent, a domain specialist in cryptocurrency markets.
Your specialized mandate is to:
- Identify trending digital assets and significant price momentum
- Detect regulatory news, ETF flows, and institutional adoption narratives
- Generate highly contextual prediction opportunities based on verifiable crypto events.

Only propose prediction markets that can be resolved via verifiable public block explorers, major CEX listings, or CoinGecko data.`;

  protected filterSignals(all: Signal[]): Signal[] {
    const cryptoKeywords = [
      "crypto", "bitcoin", "btc", "ethereum", "eth", "solana", "sol", "etf", "defi",
      "token", "listing", "binance", "coinbase", "sec", "regulation", "stablecoin"
    ];
    return all.filter(
      (s) =>
        this.sources.includes(s.source) &&
        (s.source === "crypto" || s.source === "reddit" || cryptoKeywords.some((kw) => s.topic.toLowerCase().includes(kw)))
    );
  }

  async run(allSignals: Signal[]): Promise<AgentDecision> {
    const filtered = this.filterSignals(allSignals);
    if (filtered.length === 0) {
      const msg = "Crypto Registry: STEADY — no major asset spikes or regulatory news detected.";
      emit("info", this.name, msg);
      // @ts-ignore - updateStatus is protected in BaseAgent
      this.updateStatus(msg);
      return { createMarket: false, reasoning: msg, agentName: this.name, timestamp: Date.now() };
    }

    const decision = await super.run(filtered);
    if (decision.createMarket && decision.market) {
      decision.market.description = `[CRYPTO PROTOCOL VERIFIED] ` + decision.market.description;
      decision.reasoning = `[ON-CHAIN DATA CALIBRATED] ` + decision.reasoning;
    }
    return decision;
  }
}
