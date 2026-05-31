# Smart Contract Architecture

The AstraMarkets protocol is anchored by the `MarketFactory.sol` contract deployed on the Somnia L1 network.

## MarketFactory.sol Overview
The contract acts as the AMM (Automated Market Maker), escrow, and registry for all AI-generated prediction markets.

### Key Structs
- `Market`: Stores `marketId`, `creator` (Broadcaster Wallet), `resolution` status, and the `outcome`.
- `Pool`: Tracks total `yesShares` and `noShares` minted, providing the AMM ratio.
- `Position`: Maps user addresses to their respective `yes` and `no` share balances.

### Core Functions

#### `createMarket(string memory title, uint256 expiry)`
Invoked securely by the backend Broadcaster wallet when the AI Swarm reaches a consensus. 
- **Visibility:** `external`
- **Emits:** `MarketCreated`

#### `buyShares(uint256 marketId, bool position) payable`
Allows users to mint Yes or No shares by depositing native Somnia tokens.
- Calculates share issuance based on the current AMM ratio.
- Updates dynamic odds.
- **Emits:** `TradeExecuted`

#### `resolveMarket(uint256 marketId, bool outcome)`
Invoked strictly by the authorized Oracle wallet.
- Locks the market from further trading.
- Records the final deterministic outcome.
- **Emits:** `MarketResolved`

#### `claimRewards(uint256 marketId)`
Allows users with winning shares to burn their shares in exchange for Somnia native tokens.
- **Edge-Case Safety:** If the winning pool has zero liquidity (e.g., all traders bet 'Yes', but 'No' wins), the contract safely issues a proportional refund to the losing side to prevent trapped capital.
- **Emits:** `RewardsClaimed`

## Security Considerations
- **Reentrancy:** State changes always occur prior to transferring funds back to the `msg.sender`.
- **Access Control:** Only the designated `oracleAddress` can trigger `resolveMarket()`.
