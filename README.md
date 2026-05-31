<div align="center">
  <img src="https://raw.githubusercontent.com/oyeolorun/astramarkets/main/public/logo.png" alt="AstraMarkets Logo" width="150" />
  <h1>AstraMarkets</h1>
  <p><strong>The Autonomous Prediction Protocol on Somnia L1</strong></p>
  <p>
    <a href="https://somnia.network">Somnia L1</a> • 
    <a href="https://openai.com">LLM-Powered Intelligence</a> • 
    <a href="https://ethers.org">Ethers.js</a>
  </p>
</div>

<br/>

## 🌌 Overview

**AstraMarkets** is a fully autonomous, on-chain prediction intelligence protocol. Instead of waiting for humans to manually create markets, AstraMarkets deploys specialized AI agents that continuously synthesize real-world information (Crypto, Macroeconomics, Tech, Social) into verifiable prediction economies directly on the Somnia L1 blockchain.

The protocol operates a continuous 15-second loop: **Discover → Analyze → Synthesize → Settle**.

## 🧠 How the AI Swarm Operates

The protocol utilizes a swarm of specialized Large Language Model (LLM) agents, each with unique domain expertise:
* **MacroAgent:** Analyzes global macroeconomic trends and fiat monetary shifts.
* **SocialAgent:** Evaluates Reddit sentiment, virality, and social media dynamics.
* **SportsAgent:** Monitors live sports odds, match statuses, and tournament data.
* **RiskAgent:** Acts as the systemic circuit breaker, rejecting malicious, unresolvable, or dangerous market propositions.

Agents ingest live external signals (via CoinGecko, NewsAPI, SerpAPI). If an actionable prediction is found, the agent proposes a market structure and the RiskAgent validates it before on-chain deployment.

## 📈 Market Lifecycle

1. **Creation:** Once the AI Swarm reaches a consensus, the backend engine triggers the `MarketFactory.createMarket()` smart contract function, establishing an AMM liquidity pool on Somnia L1.
2. **Trading:** Users connect decentralized wallets (e.g., MetaMask, WalletConnect) and execute trades by interacting with the `buyShares()` and `sellShares()` contract functions. The AMM dynamically balances the Yes/No odds.
3. **Settlement:** Upon market expiration, the **Autonomous Settlement Oracle** activates. It cross-references at least three independent external APIs to determine the final outcome. It strictly enforces a >75% confidence threshold before finalizing the result on-chain via `resolveMarket()`.
4. **Reward Claim:** Traders holding winning shares execute the `claimRewards()` function to withdraw their capital plus their proportion of the losing pool's liquidity.

## 🚀 Quick Start Guide

### Prerequisites
* Node.js v20+
* SQLite3
* A Somnia L1 RPC Endpoint & Private Key
* OpenAI API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-org/astramarkets.git
   cd astramarkets
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your specific API keys and Somnia network details.
   ```

4. **Start the Protocol:**
   ```bash
   npm run dev:all
   ```
   This boots the real-time Signal Ingestion Engine, the AI Agent Swarm, and the Frontend Terminal simultaneously.

## 🛠️ Developer Tooling & Verification

AstraMarkets is built for production observability.
* **Ops Dashboard:** Navigate to the terminal frontend to view real-time Agent Reputation scores, LLM Latency, and Active Circuit Breaker status.
* **Health Check:** `GET /api/health` provides continuous deployment validation and network verification.
* **TypeScript Support:** Execute `npm run build` to run full Vite and TypeScript type-checking across the repository.

## 🔐 Security & Architecture

* **Circuit Breakers:** The LLM engine is protected by a 2-minute exponential backoff circuit breaker to prevent cascading failures during API outages.
* **Consensus Oracle:** The protocol will never settle a market based on a single data source. `ORACLE_UNCERTAIN` events immediately yield settlement control to human Guardians if consensus confidence falls below 75%.
* **Edge-Case Resilience:** The AMM smart contracts gracefully refund liquidity to users if winning pools are empty, ensuring zero trapped capital.

---
*Built for the Somnia L1 Ecosystem.*