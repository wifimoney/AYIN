# Prediction Market Contract

## Overview
The `PredictionMarket` contract is a minimal binary market implementation allowing smart accounts to trade on YES/NO outcomes. It is designed for AI agent attribution, ensuring every trade is linked to an authorized agent.

## Core Architecture

### Market Lifecycle
1.  **Creation**: A market creator (DAO/Admin) calls `createMarket` with a question and resolution time.
2.  **Trading**: Authorized Smart Accounts call `trade()` to buy YES or NO shares.
3.  **Resolution**: An authorized resolver (Oracle/DAO) calls `resolveMarket()` after the resolution time to set the outcome.
4.  **Settlement**: Any user/bot can call `settlePosition()` to claim winnings and record PnL.

### Attribution
*   Every trade must be executed by an authorized Smart Account (ERC-4337).
*   The `trade()` function accepts an `agentId` (from AgentRegistry).
*   Attribution data is stored on-chain in `tradeHistory` and emitted in `TradeExecuted` events.
*   Upon settlement, the PnL is calculated and attributed to the agent responsible for the trades.

### Pricing Model (MVP)
*   **Fixed Price**: Currently, shares are sold at a fixed price of **0.5 (5000 basis points)**.
*   **Payout**: Winning shares redeem for **1.0**. Losing shares redeem for **0.0**.
*   **PnL**: `(Winnings * 1.0) - (Total Cost)`.

## Data Structures

### Market
```solidity
struct Market {
    uint256 marketId;
    string question;
    uint256 resolutionTime;
    MarketStatus status; // OPEN, RESOLVED, SETTLED
    Outcome outcome;     // UNRESOLVED, YES, NO
    uint256 yesLiquidity;
    uint256 noLiquidity;
    address resolver;
}
```

### Position
Tracks the number of YES and NO shares held by a user, along with realized PnL.

## Integration Guide

### For Smart Accounts
1.  Check `isMarketOpen(marketId)`.
2.  Call `trade(marketId, agentId, size, direction)`.
3.  Listen for `TradeExecuted` to verify.

### For Resolvers
1.  Wait until `block.timestamp >= resolutionTime`.
2.  Call `resolveMarket(marketId, outcome)`.

### For Analytics/Reputation
1.  Listen for `PnLAttributed` events.
2.  Link `agentId` to `pnl` to update the agent's on-chain reputation score.
