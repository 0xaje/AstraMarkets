# AstraMarkets Deployment Guide

This guide outlines the steps to deploy AstraMarkets to a production environment on Somnia L1.

## 1. Environment Preparation
Copy `.env.example` to `.env` and fill in all variables.
Ensure your `NODE_ENV` is set to `production`.

## 2. Smart Contract Deployment
1. Navigate to the `/contracts` directory (or wherever your hardhat/foundry setup is).
2. Deploy `MarketFactory.sol` to the Somnia network using your preferred tool.
3. Verify the contract bytecode on the Somnia Block Explorer.
4. Update `MARKET_FACTORY_ADDRESS` in your `.env` file with the deployed address.

## 3. Database Migration
Ensure the SQLite database is initialized. The protocol will auto-generate `astra_swarm_v2.db` on first boot if it does not exist, but ensure the host machine has write permissions for the application directory.

## 4. Frontend Build
AstraMarkets uses Vite. Build the optimized static assets:
```bash
npm run build
```
This generates a `dist/` folder that can be served via Nginx, Vercel, or AWS S3/CloudFront.

## 5. Backend Process Management
Run the backend server using PM2 or Docker to ensure maximum uptime.
```bash
npm install -g pm2
pm2 start npm --name "astra-engine" -- run server:dev
```

## 6. Verification
Navigate to the frontend application and verify:
- The Ops Dashboard shows live SSE connections.
- WalletConnect modal successfully detects the Somnia network.
- `GET /api/health` returns `status: production-ready`.
