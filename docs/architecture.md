# AstraMarkets Architecture Overview

AstraMarkets is composed of three interconnected layers operating on the Somnia L1 network: the **Signal & Data Layer**, the **Agent Intelligence Engine**, and the **On-Chain Settlement Layer**.

## 1. Signal & Data Layer (`/server/signals/`)
This module is responsible for bridging real-world events into the protocol.
- **External API Ingestion:** Fetches data from CoinGecko, NewsAPI, and SerpAPI.
- **Signal Normalization:** Converts varying JSON schemas into a unified `Signal` object containing `topic`, `sentiment`, `velocity`, and `timestamp`.
- **Event Bus:** Signals are broadcasted via the `AstraEventBus`, decoupling ingestion from analysis.

## 2. Agent Intelligence Engine (`/server/agents/`)
The cognitive core of AstraMarkets.
- **Agent Roles:** Specialized agents (Macro, Social, Sports) subscribe to the `eventBus` and run evaluation loops every 15 seconds.
- **LLM Processing:** Contextual reasoning is achieved via OpenAI's GPT models. Agents evaluate whether a `Signal` represents a viable prediction market.
- **Risk Validation (RiskAgent):** Every proposed market must pass a semantic safety check to ensure it is resolvable, non-malicious, and within protocol bounds.
- **Agent Memory:** The `agentMemory.ts` SQLite module tracks historical accuracy and economic impact (Reputation Score), giving the protocol a persistent "brain" across restarts.

## 3. On-Chain Settlement Layer (`/server/oracles/` & `/server/services/somnia/`)
The economic settlement engine.
- **MarketFactory.sol:** The Somnia L1 smart contract responsible for holding AMM liquidity, minting shares, and distributing rewards.
- **Autonomous Oracle:** The `settlementOracle.ts` chron-job evaluates expired markets. It requests multi-source verification and demands >= 75% consensus confidence before broadcasting the `resolveMarket()` transaction.
- **Client Synchronization:** The frontend `app.js` maintains an active SSE stream with the backend, pushing block confirmations, odds updates, and UI state changes instantaneously to users.
