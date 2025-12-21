# Quick Start: Deploy Contracts to Base

This is a quick reference guide for deploying AYIN contracts to Base network.

## Prerequisites

1. **Install Foundry** (if not already installed):
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Get Base Sepolia ETH**:
   - Use [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)
   - Or bridge from Ethereum Sepolia

3. **Get BaseScan API Key**:
   - Sign up at [BaseScan](https://basescan.org)
   - Go to API section and create an API key

## Step 1: Setup Environment

```bash
cd contracts

# Create .env file
cat > .env << EOF
PRIVATE_KEY=your_private_key_without_0x_prefix
BASESCAN_API_KEY=your_basescan_api_key
EOF
```

**⚠️ IMPORTANT:** Replace the placeholder values with your actual keys!

## Step 2: Deploy Contracts

```bash
# Deploy to Base Sepolia (for testing)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

The script will:
- Deploy all 4 contracts
- Print addresses to console
- Automatically verify on BaseScan

## Step 3: Update Contract Addresses

After deployment, copy the addresses from the console output and update `lib/contracts.ts`:

```typescript
export const CONTRACTS_BASE_SEPOLIA = {
  AgentRegistry: '0x...', // ← Paste deployed address
  DelegationPolicy: '0x...', // ← Paste deployed address
  PredictionMarket: '0x...', // ← Paste deployed address
  AyinSmartAccount: '0x...', // ← Paste deployed address
} as const;
```

## Step 4: Verify on BaseScan

1. Go to [Base Sepolia Explorer](https://sepolia.basescan.org)
2. Search for each contract address
3. Click "Contract" tab
4. Verify source code is visible (means it's verified)

## Step 5: Test Events

Test that events are emitted correctly:

```bash
# Register an agent (example)
cast send <AGENT_REGISTRY_ADDRESS> \
  "registerAgent(address,bytes32,uint8)" \
  <OPERATOR_ADDRESS> \
  <STRATEGY_HASH> \
  0 \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY

# Check events on BaseScan
# Navigate to: https://sepolia.basescan.org/address/<AGENT_REGISTRY_ADDRESS>#events
```

## Troubleshooting

**Deployment fails with "insufficient funds":**
- Make sure your deployer address has ETH on Base Sepolia
- Check balance: `cast balance <YOUR_ADDRESS> --rpc-url https://sepolia.base.org`

**Verification fails:**
- Wait a few minutes and try again
- Or verify manually via BaseScan UI (see DEPLOYMENT.md)

**Script not found:**
- Make sure you're in the `contracts/` directory
- Run `forge build` first to compile contracts

## Next Steps

- See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
- See [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) for complete checklist
- Test all contract functions after deployment
- Verify all events appear on BaseScan

## Support

For issues:
- Foundry: https://book.getfoundry.sh/
- BaseScan: https://docs.basescan.org/
- Base Network: https://docs.base.org/

