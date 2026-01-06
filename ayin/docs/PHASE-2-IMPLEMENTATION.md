# AYIN Phase 2: Production Hardening

This document covers the implementation of Phase 2 from the technical audit, which addresses pre-GTM production hardening (1-2 months).

## Overview

Phase 2 implements three major components:

| # | Component | Description |
|---|-----------|-------------|
| 1 | **Smart Contract Integration** | Listen for on-chain events, don't trust frontend |
| 2 | **Agent Guardrails** | RiskEngine with hard limits and circuit breaker |
| 3 | **Execution Logic** | Smart Wallet integration, secure trade execution |

## Components Implemented

### 1. Risk Engine (`ayin-agent/src/risk/risk-engine.ts`)

The RiskEngine enforces hard-coded risk limits:

| Limit | Default | Description |
|-------|---------|-------------|
| Max Trade Size | 1 ETH | Maximum size per individual trade |
| Max Trades/Hour | 5 | Rate limiting to prevent runaway trading |
| Max Drawdown | 10% | Circuit breaker triggers if portfolio drops |
| Max Daily Volume | 10 ETH | Total daily trading volume cap |
| Max Positions | 10 | Maximum concurrent open positions |

#### Usage

```typescript
import { createRiskEngine } from './risk/risk-engine';

const riskEngine = createRiskEngine(logger, {
  maxTradeSizeWei: BigInt('1000000000000000000'), // 1 ETH
  maxTradesPerHour: 5,
  maxDrawdownPercent: 10,
});

// Check if trade is allowed
const result = riskEngine.checkTrade({
  marketId: '0x123...',
  direction: 'YES',
  size: BigInt('500000000000000000'), // 0.5 ETH
});

if (!result.allowed) {
  console.error('Trade rejected:', result.violations);
}
```

#### Circuit Breaker

If portfolio drops more than 10% in 1 hour:
- All new trades are blocked
- `circuit-breaker` event is emitted
- Agent status shows `isCircuitBroken: true`
- Manual reset required via `riskEngine.resetCircuitBreaker()`

### 2. Smart Wallet Executor (`ayin-agent/src/execution/smart-wallet-executor.ts`)

Replaces direct private key usage with Smart Wallet:

- **Operator Key**: Only for signing transactions (no fund access)
- **Smart Wallet**: Holds funds, enforces on-chain policies
- **Scoped Permissions**: Only allowed to interact with specific contracts

#### Architecture

```
┌──────────────┐     ┌─────────────────┐     ┌───────────────────┐
│  Agent Loop  │────▶│ SmartWalletExec │────▶│ DelegationPolicy  │
└──────────────┘     └─────────────────┘     └───────────────────┘
                            │                         │
                            │                         ▼
                            │               ┌───────────────────┐
                            └──────────────▶│ PredictionMarket  │
                                            └───────────────────┘
```

#### Trade Flow

1. Agent receives market signal
2. RiskEngine validates trade parameters
3. Executor encodes trade call data
4. Smart Wallet executes via `DelegationPolicy.enforcePolicy()`
5. If policy passes, trade executes on PredictionMarket
6. Results recorded in RiskEngine

### 3. On-Chain Event Listener (`ayin-agent/src/chain/event-listener.ts`)

Listens for blockchain events instead of trusting frontend:

| Event | Description |
|-------|-------------|
| `MandateCreated` | New delegation created |
| `MandateRevoked` | Delegation revoked by user |
| `MandateExecution` | Trade executed via mandate |
| `Trade` | Market trades (for analytics) |

#### Delegation Verification

```typescript
const listener = createEventListener(logger);
await listener.start();

// Verify delegation on-chain before trading
const verification = await listener.verifyDelegation(
  smartWalletAddress,
  agentAddress
);

if (!verification.isValid) {
  console.error('Invalid delegation:', verification.error);
  return;
}

// Use the on-chain policy
const policy = verification.policy;
```

### 4. Agent V2 Runtime (`ayin-agent/src/runtime/agent-v2.ts`)

Integrates all components into a production-ready agent:

```typescript
import { AgentV2 } from './runtime/agent-v2';

const agent = new AgentV2({
  agentId: 1,
  smartWalletAddress: '0x...',
  loopIntervalMs: 60000,
  enableRiskEngine: true,
  enableOnChainValidation: true,
  enableSmartWallet: true,
});

await agent.start();

// Check health
if (!agent.isHealthy()) {
  console.error('Agent unhealthy!');
}

// Get status
const status = agent.getStatus();
console.log('Trades executed:', status.agent.tradesExecuted);
console.log('Circuit broken:', status.risk.isCircuitBroken);
```

## Contract Integration

### Required Contracts

1. **DelegationPolicy.sol** - Already deployed, manages mandates
2. **PredictionMarket.sol** - Already deployed, trade execution
3. **AyinSmartAccount.sol** - Needs deployment per user

### Deployment Steps

```bash
# Navigate to contracts
cd contracts

# Deploy DelegationPolicy
forge script script/DeployDelegationPolicy.s.sol --rpc-url $RPC_URL --broadcast

# Note deployed address and set in .env
DELEGATION_POLICY_ADDRESS=0x...
```

## Environment Configuration

See `ayin-agent/.env.example` for all configuration options.

Key variables:

```env
# Blockchain
RPC_URL="https://base-sepolia-rpc.publicnode.com"
CHAIN_ID=84532

# Agent Identity
OPERATOR_KEY="0x..."  # For signing only
SMART_WALLET_ADDRESS="0x..."  # Holds funds

# Contracts
DELEGATION_POLICY_ADDRESS="0x..."
PREDICTION_MARKET_ADDRESS="0x..."

# Risk Limits
MAX_TRADE_SIZE_WEI=1000000000000000000  # 1 ETH
MAX_TRADES_PER_HOUR=5
MAX_DRAWDOWN_PERCENT=10
```

## Testing

### Unit Tests

```bash
cd ayin-agent
npm test
```

### Integration Test

```bash
# Start local hardhat node
npx hardhat node

# Deploy contracts
forge script script/DeployAll.s.sol --rpc-url http://localhost:8545 --broadcast

# Run agent in test mode
ENABLE_ONCHAIN_VALIDATION=false npm run dev
```

### Risk Engine Tests

```typescript
// Test circuit breaker
riskEngine.recordPortfolioValue(BigInt('10000000000000000000')); // 10 ETH
riskEngine.recordPortfolioValue(BigInt('8500000000000000000'));  // 8.5 ETH (-15%)
// Circuit breaker should trigger
```

## File Structure

```
ayin-agent/
└── src/
    ├── chain/
    │   └── event-listener.ts    # On-chain event listening
    ├── execution/
    │   ├── executor.ts          # Legacy executor
    │   └── smart-wallet-executor.ts  # NEW: Smart wallet integration
    ├── risk/
    │   └── risk-engine.ts       # NEW: Risk guardrails
    ├── runtime/
    │   ├── agent.ts             # Legacy agent
    │   └── agent-v2.ts          # NEW: Production agent
    └── types/
        └── index.ts             # Extended types
```

## Monitoring & Observability

### Health Check Endpoint

Add to your monitoring:

```typescript
app.get('/health', (req, res) => {
  const status = agent.getStatus();
  
  if (!agent.isHealthy()) {
    return res.status(503).json({
      healthy: false,
      circuitBroken: status.risk.isCircuitBroken,
      lastHeartbeat: status.agent.lastHeartbeat,
    });
  }
  
  res.json({ healthy: true, ...status });
});
```

### Alerts

Set up alerts for:
- Circuit breaker triggered
- Error rate > 50%
- No heartbeat for 2x loop interval
- Drawdown > 5% (warning before circuit breaker)

## Security Considerations

1. **Never expose OPERATOR_KEY** - Use environment variables or secrets manager
2. **Smart Wallet is the vault** - Operator can only sign, not withdraw
3. **On-chain policy is source of truth** - Don't trust frontend
4. **Circuit breaker is final** - Requires manual reset
5. **Rate limits are hard** - Cannot be bypassed by agent

## Next Steps (Phase 3)

After Phase 2 is complete:

1. **Queue System** - Move to BullMQ/Kafka for task processing
2. **TEE Integration** - Verifiable compute for policy enforcement
3. **Decentralized Resolver** - Third-party agent registration

## Troubleshooting

### "Circuit breaker triggered unexpectedly"

Check portfolio value snapshots:
```typescript
console.log(riskEngine.getStatus());
```

Reset manually if needed:
```typescript
riskEngine.resetCircuitBreaker();
```

### "Trade rejected by RiskEngine"

Check which limit was hit:
```typescript
const result = riskEngine.checkTrade(request);
console.log('Violations:', result.violations);
console.log('Details:', result.details);
```

### "Smart wallet not authorized"

Verify on-chain:
```bash
cast call $DELEGATION_POLICY_ADDRESS \
  "isAgentAuthorized(address,address)" \
  $SMART_WALLET_ADDRESS $AGENT_ADDRESS \
  --rpc-url $RPC_URL
```
