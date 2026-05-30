# AstraMarkets

AstraMarkets is a high-performance, autonomous prediction protocol natively built on the Somnia L1 network. It utilizes decentralized AI cognitive swarms to dynamically generate, resolve, and manage liquidity for real-world event prediction markets.

## Architecture

AstraMarkets operates entirely without simulation, running on a decentralized event-driven architecture powered by real-world telemetry:

- **Signal Engine**: Ingests live data across Crypto, Tech, Sports, and Global Politics via multi-source API fusion.
- **Autonomous Swarms**: Four specialized AI nodes process raw telemetry, calculate market probabilities, and autonomously propose on-chain prediction markets.
- **On-Chain Settlement**: Market resolutions are strictly derived from cryptographic oracle consensus on the Somnia network. No local overriding is permitted.
- **Automated Market Maker (AMM)**: A high-liquidity execution engine handling ultra-low latency `buyShares` and `sellShares` transactions through ethers.js and Web3 wallets.

## Key Features

- **Verifiable Economics**: User portfolios are strictly derived from mathematical on-chain ledger parsing (`TradeExecuted` and `RewardsClaimed` events) instead of centralized backend databases.
- **Agent Evolution**: Market performance dynamically impacts the capital allocation of the AI swarm. Accurate predictions increase agent influence, while failed predictions result in resource penalization.
- **Institutional-Grade UI**: A high-fidelity, organic glassmorphism terminal designed for real-time data monitoring and trade execution. Includes a **Swarm Core Provisioner** for managing agent lifecycles.
- **Total Transparency**: Features a **Chain Transparency Panel** to track live Somnia L1 blocks, gas, and settlement telemetry, along with an Explainable Intelligence Summary for AI reasoning.
- **No Mock State**: The entire protocol operates strictly over active Somnia L1 smart contracts and a real-time SSE (Server-Sent Events) synchronization layer.

## Development Setup

### Requirements
- Node.js v20+
- Web3 Wallet (MetaMask, Rabby) connected to Somnia L1 Testnet

### Installation
```bash
git clone https://github.com/0xaje/AstraMarkets.git
cd AstraMarkets
npm install
```

### Environment configuration
Copy the sample environment file and provide your API keys for the autonomous signal engine:
```bash
cp .env.example .env
```

### Running the Node
Launch both the frontend client and backend protocol daemon concurrently:
```bash
npm run dev:all
```
The terminal will be available locally at `http://localhost:3000`.

## Smart Contract Integration
The core execution engine connects directly to the `MarketFactory.sol` ABI. To deploy fresh contracts or configure the L1 gas station:
- Navigate to `/contracts/`
- Execute the deployment script configuring your private key securely in `.env`.

## License
MIT License