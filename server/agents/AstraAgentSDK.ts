import OpenAI from 'openai';
import { Signal, AgentDecision } from './agentEngine'; // Assuming types are exported here

/**
 * AstraAgentBase
 * 
 * An extensible SDK class that allows community developers to build custom 
 * Autonomous Market Makers for the AstraMarkets protocol.
 */
export abstract class AstraAgentBase {
  public name: string;
  public domain: string;
  public openai: OpenAI;
  public minConfidenceThreshold: number;

  constructor(name: string, domain: string, minConfidenceThreshold: number = 75) {
    this.name = name;
    this.domain = domain;
    this.minConfidenceThreshold = minConfidenceThreshold;
    
    // Initialize standard LLM connection for the agent
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Defines which signals this agent cares about.
   * e.g., A Sports Agent might return true only if signal.source === 'sports'
   */
  abstract filterSignals(signals: Signal[]): Signal[];

  /**
   * The core reasoning engine. Generates a custom prompt based on the filtered signals.
   */
  abstract buildPrompt(signals: Signal[]): string;

  /**
   * Standard Execution Loop used by the Swarm Engine.
   */
  public async run(allSignals: Signal[]): Promise<AgentDecision> {
    const relevantSignals = this.filterSignals(allSignals);
    
    if (relevantSignals.length === 0) {
      return { 
        agentName: this.name, 
        createMarket: false, 
        reasoning: "No relevant signals found in domain." 
      };
    }

    const prompt = this.buildPrompt(relevantSignals);

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.AGENT_LLM_MODEL || "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are an autonomous prediction market creator specializing in ${this.domain}. 
            Output strictly JSON matching this schema: 
            { 
              "createMarket": boolean, 
              "reasoning": string, 
              "confidence": number, 
              "market": { "title": string, "category": string, "yesOdds": number, "noOdds": number } 
            }`
          },
          { role: "user", content: prompt }
        ]
      });

      const decision = JSON.parse(completion.choices[0].message.content || "{}");

      // Enforce the agent's confidence threshold before proposing a market
      if (decision.createMarket && decision.confidence < this.minConfidenceThreshold) {
        decision.createMarket = false;
        decision.reasoning = `Confidence ${decision.confidence}% is below threshold of ${this.minConfidenceThreshold}%.`;
      }

      return {
        agentName: this.name,
        ...decision
      };

    } catch (error: any) {
      console.error(`[${this.name} SDK Error]:`, error.message);
      return { agentName: this.name, createMarket: false, reasoning: "LLM Execution failed." };
    }
  }
}
