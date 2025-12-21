# Contract Deployment Guide

This guide covers deploying AYIN contracts to Base network and verifying them on BaseScan.

## Prerequisites

1. **Environment Setup**
   - Install Foundry: `curl -L https://foundry.paradigm.xyz | bash`
   - Run `foundryup`
   - Install dependencies: `forge install`

2. **Base Network Access**
   - Get Base Sepolia RPC URL (for testing)
   - Get Base Mainnet RPC URL (for production)
   - Fund your deployer address with ETH for gas

3. **BaseScan API Key** (for verification)
   - Sign up at [BaseScan](https://basescan.org)
   - Get your API key from the API section

## Environment Variables

Create a `.env` file in the `contracts/` directory:

```bash
# Deployer private key (without 0x prefix)
# IMPORTANT: Never commit your actual .env file to git!
PRIVATE_KEY=your_private_key_here

# Optional: Custom addresses
MARKET_CREATOR=0x0000000000000000000000000000000000000000
SMART_ACCOUNT_OWNER=0x0000000000000000000000000000000000000000

# BaseScan API key for verification
# Get your API key from: https://basescan.org/apis
BASESCAN_API_KEY=your_basescan_api_key
```

**⚠️ SECURITY WARNING:** 
- Never commit `.env` files to git
- The `.gitignore` file in the contracts directory already excludes `.env` files
- Keep your private key secure and never share it

## Deployment Steps

### 1. Deploy to Base Sepolia (Testing)

```bash
cd contracts

# Deploy all contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

### 2. Deploy to Base Mainnet (Production)

```bash
# Deploy all contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://mainnet.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

### 3. Save Contract Addresses

After deployment, copy the addresses from the console output and update `lib/contracts.ts`:

```typescript
export const CONTRACTS_BASE_SEPOLIA = {
  AgentRegistry: '0x...', // Replace with deployed address
  DelegationPolicy: '0x...', // Replace with deployed address
  PredictionMarket: '0x...', // Replace with deployed address
  // ...
};
```

## Verification on BaseScan

### Automatic Verification

If you use `--verify` flag during deployment, contracts are automatically verified.

### Manual Verification

If automatic verification fails, verify manually:

#### 1. AgentRegistry

```bash
forge verify-contract <AGENT_REGISTRY_ADDRESS> \
  src/AgentRegistry.sol:AgentRegistry \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --compiler-version 0.8.0
```

#### 2. DelegationPolicy

```bash
forge verify-contract <DELEGATION_POLICY_ADDRESS> \
  src/DelegationPolicy.sol:DelegationPolicy \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --compiler-version 0.8.0
```

#### 3. PredictionMarket

```bash
# PredictionMarket has no constructor arguments
forge verify-contract <PREDICTION_MARKET_ADDRESS> \
  src/PredictionMarket.sol:PredictionMarket \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --compiler-version 0.8.0
```

#### 4. AyinSmartAccount (if deployed)

```bash
# Get constructor args
cast abi-encode "constructor(address,address,address)" \
  <DELEGATION_POLICY_ADDRESS> \
  <AGENT_REGISTRY_ADDRESS> \
  <OWNER_ADDRESS>

# Verify with constructor args
forge verify-contract <SMART_ACCOUNT_ADDRESS> \
  src/AyinSmartAccount.sol:AyinSmartAccount \
  --chain-id 84532 \
  --etherscan-api-key $BASESCAN_API_KEY \
  --constructor-args <CONSTRUCTOR_ARGS> \
  --compiler-version 0.8.0
```

## Verification via BaseScan UI

1. Go to [BaseScan](https://basescan.org) (or [Base Sepolia Explorer](https://sepolia.basescan.org))
2. Navigate to your contract address
3. Click "Contract" tab
4. Click "Verify and Publish"
5. Fill in:
   - Compiler Type: `Solidity (Standard JSON Input)`
   - Compiler Version: `0.8.0`
   - License: `MIT`
   - Paste contract source code
   - Add constructor arguments if needed

## Contract Events (for Judges)

All contracts emit events that are indexed on BaseScan. Judges can verify:

### AgentRegistry
- **Event:** `AgentRegistered(uint256 indexed agentId, address indexed operator, ...)`
- **BaseScan Link:** `https://basescan.org/address/<AGENT_REGISTRY_ADDRESS>#events`

### DelegationPolicy
- **Event:** `MandateCreated(address indexed smartAccount, address indexed agent, ...)`
- **Event:** `MandateRevoked(address indexed smartAccount, address indexed agent)`
- **Event:** `MandateExecution(address indexed smartAccount, address indexed agent, ...)`
- **BaseScan Link:** `https://basescan.org/address/<DELEGATION_POLICY_ADDRESS>#events`

### PredictionMarket
- **Event:** `TradeExecuted(uint256 indexed marketId, address indexed trader, uint256 indexed agentId, ...)`
- **BaseScan Link:** `https://basescan.org/address/<PREDICTION_MARKET_ADDRESS>#events`

## Testing After Deployment

1. **Register an Agent:**
```bash
cast send <AGENT_REGISTRY_ADDRESS> \
  "registerAgent(address,bytes32,uint8)" \
  <OPERATOR_ADDRESS> \
  <STRATEGY_HASH> \
  0 \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

2. **Create a Mandate:**
```bash
cast send <DELEGATION_POLICY_ADDRESS> \
  "createMandate(address,uint256,address[],uint256)" \
  <AGENT_ADDRESS> \
  <MAX_TRADE_SIZE> \
  "[<MARKET_ADDRESS>]" \
  <EXPIRY_TIMESTAMP> \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

3. **Check Events on BaseScan:**
   - Navigate to contract address
   - Click "Events" tab
   - Verify events are emitted correctly

## Troubleshooting

### Verification Fails

1. Check compiler version matches exactly
2. Ensure constructor arguments are correct
3. Try flattening the contract: `forge flatten src/AgentRegistry.sol > AgentRegistryFlattened.sol`
4. Verify via BaseScan UI with flattened source

### Deployment Fails

1. Check you have enough ETH for gas
2. Verify RPC URL is correct
3. Check network is accessible
4. Review error messages in `-vvvv` output

### Events Not Showing

1. Wait a few minutes for BaseScan to index
2. Check transaction was successful
3. Verify event signature matches contract
4. Use `cast logs` to query events directly

## Security Checklist

- [ ] Contracts deployed to correct network (Sepolia for demo, Mainnet for production)
- [ ] All contracts verified on BaseScan
- [ ] Contract addresses updated in `lib/contracts.ts`
- [ ] Events are emitting correctly (check BaseScan)
- [ ] Private keys stored securely (never commit to git)
- [ ] Test all contract functions after deployment
- [ ] Document any deployment-specific notes

## Support

For issues with:
- **Foundry:** Check [Foundry Book](https://book.getfoundry.sh/)
- **BaseScan:** Check [BaseScan Docs](https://docs.basescan.org/)
- **Base Network:** Check [Base Docs](https://docs.base.org/)

