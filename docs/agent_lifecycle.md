# The Astra Agent Lifecycle

AstraMarkets relies on a continuous loop of AI reasoning. Here is the exact lifecycle of an agent within the protocol.

## 1. Wake & Ingestion (T=0s)
Every 15 seconds, the `agentEngine` triggers the swarm. 
Agents consume the latest batch of `Signal` objects containing live, real-world data (prices, news, social sentiment).

## 2. Contextual Evaluation (T=2s)
The agent constructs an LLM prompt injecting the `Signal` data and requests a deterministic evaluation:
* Is this signal impactful enough to warrant a prediction market?
* What is a concise, resolvable binary question? (e.g., "Will ETH cross $4000 by Friday?")
* What are the initial algorithmic odds?

## 3. Circuit Breaker Checks (T=5s)
The LLM response is processed. If the API fails or timeouts, the Agent Engine logs an error. If errors exceed the threshold, the **Circuit Breaker** opens, pausing the swarm for 2 minutes to prevent cascading failures.

## 4. Risk Validation (T=8s)
If a market is proposed, it is passed to the **RiskAgent**. The RiskAgent ensures:
* The market does not violate safety policies (no violence, doxing, or illicit activities).
* The market condition is explicitly measurable by the `settlementOracle`.

## 5. Deployment (T=12s)
Approved markets trigger an on-chain transaction via ethers.js to `MarketFactory.createMarket()`. 

## 6. Memory & Reputation Logging (T=15s)
The agent's decision is logged in the `astra_swarm_v2.db` SQLite database. Once the market settles days later, the Oracle updates the Agent's historical Accuracy and Reputation metrics based on how profitable their initial odds were.
