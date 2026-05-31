import { Signal } from "../../signals/signalEngine.js";
import { AgentDecision, AgentStatus } from "../agentTypes.js";
import { BaseAgent, emit } from "../agentEngine.js";

export class TechAgentImpl extends BaseAgent {
  name = "TechAgent";
  strategy = "Emerging Tech & AI Narratives";
  sources: Signal["source"][] = ["hackernews", "news", "trends"];
  color: AgentStatus["color"] = "secondary";
  specialbadge = "TECH";
  domainexpertise = "AI, Developer Ecosystem & Tech Launches";
  systemPrompt = `You are TechAgent, a domain specialist in emerging technologies, AI, and developer ecosystems.
Your specialized mandate is to:
- Detect emerging technology narratives and AI breakthroughs
- Identify major software launches, hardware announcements, or developer adoption trends
- Generate highly contextual prediction opportunities based on tech events.

Only propose prediction markets around major tech company earnings, product launches, or verifiable open-source milestones.`;

  protected filterSignals(all: Signal[]): Signal[] {
    const techKeywords = [
      "ai", "artificial intelligence", "openai", "claude", "gpu", "compute", "nvidia",
      "apple", "microsoft", "google", "meta", "launch", "release", "developer", "open source"
    ];
    return all.filter(
      (s) =>
        this.sources.includes(s.source) &&
        (s.source === "hackernews" || techKeywords.some((kw) => s.topic.toLowerCase().includes(kw)))
    );
  }

  async run(allSignals: Signal[]): Promise<AgentDecision> {
    const filtered = this.filterSignals(allSignals);
    if (filtered.length === 0) {
      const msg = "Tech Registry: STEADY — no major tech launches or AI breakthroughs detected.";
      emit("info", this.name, msg);
      // @ts-ignore - updateStatus is protected in BaseAgent
      this.updateStatus(msg);
      return { createMarket: false, reasoning: msg, agentName: this.name, timestamp: Date.now() };
    }

    const decision = await super.run(filtered);
    if (decision.createMarket && decision.market) {
      decision.market.description = `[TECH ECOSYSTEM VERIFIED] ` + decision.market.description;
      decision.reasoning = `[NARRATIVE TREND CALIBRATED] ` + decision.reasoning;
    }
    return decision;
  }
}
