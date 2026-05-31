# AstraMarkets Troubleshooting Guide

## Common Issues & Resolutions

### 1. Agents Are Not Generating Markets
**Symptom:** The console reads `No live signals available` or LLM API throws errors.
**Resolution:** 
- Check the Ops Dashboard for the **Circuit Breaker Status**. If it is `OPEN`, the OpenAI API is either rate-limiting the server or is down. Wait 2 minutes for auto-reset.
- Verify `OPENAI_API_KEY` is correct in `.env`.

### 2. Frontend Not Syncing with Backend
**Symptom:** Markets are not appearing on the UI, and the connection status is red.
**Resolution:**
- The frontend relies on Server-Sent Events (SSE). Ensure your reverse proxy (e.g., Nginx) is configured to allow long-lived connections (disable proxy buffering).
- Verify the backend `SIGNAL_PORT` (default 4000) matches the fetch requests in `app.js`.

### 3. Trades Reverting On-Chain
**Symptom:** `buyShares` fails, and the UI displays a `Trade failed` float notification.
**Resolution:**
- Ensure the connected wallet is on the **Somnia L1 Testnet (ChainID: 0xc488)**.
- Verify the wallet has sufficient native STT (Somnia) for gas and investment.
- Check the `pendingTransactions` tracker to ensure no stale nonces are blocking execution.

### 4. Oracle Failing to Settle Markets
**Symptom:** Markets pass their expiry time but remain in the `ACTIVE` state.
**Resolution:**
- The Oracle requires >= 75% consensus confidence from multiple sources. If sources are conflicting, it will emit an `ORACLE_UNCERTAIN` event and flag the market as `DISPUTED`.
- Monitor the backend console logs for `[ORACLE FAILURE]`. If external APIs (CoinGecko, NewsAPI) are rate-limiting, the exponential backoff will eventually resolve or flag it for manual review.
