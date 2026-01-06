#!/bin/bash

#############################################
# AYIN Contract Deployment to Base Sepolia
# Phase 2: Production Hardening
#############################################

set -e

echo "=========================================="
echo "AYIN Contract Deployment - Base Sepolia"
echo "=========================================="

# Check for required environment variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable not set"
    echo ""
    echo "Please set your deployer private key:"
    echo "  export PRIVATE_KEY=0x..."
    echo ""
    exit 1
fi

# Configuration
RPC_URL="${RPC_URL:-https://base-sepolia-rpc.publicnode.com}"
CHAIN_ID=84532
ETHERSCAN_API_KEY="${BASESCAN_API_KEY:-}"

echo ""
echo "Configuration:"
echo "  RPC URL: $RPC_URL"
echo "  Chain ID: $CHAIN_ID"
echo "  Deployer: $(cast wallet address $PRIVATE_KEY)"
echo ""

# Check deployer balance
BALANCE=$(cast balance $(cast wallet address $PRIVATE_KEY) --rpc-url $RPC_URL)
echo "  Balance: $(cast --from-wei $BALANCE) ETH"
echo ""

if [ "$BALANCE" = "0" ]; then
    echo "❌ Error: Deployer has no ETH. Get testnet ETH from:"
    echo "   https://portal.cdp.coinbase.com/products/faucet"
    exit 1
fi

echo "Starting deployment..."
echo ""

# Deploy contracts
forge script script/Deploy.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --verify \
    --etherscan-api-key "$ETHERSCAN_API_KEY" \
    -vvv

echo ""
echo "=========================================="
echo "DEPLOYMENT COMPLETE"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Copy the contract addresses from above"
echo "2. Update your .env file:"
echo "   DELEGATION_POLICY_ADDRESS=<address>"
echo "   PREDICTION_MARKET_ADDRESS=<address>"
echo "   AGENT_REGISTRY_ADDRESS=<address>"
echo "   SMART_WALLET_ADDRESS=<address>"
echo ""
echo "3. Verify contracts on BaseScan if auto-verify failed:"
echo "   forge verify-contract <address> src/DelegationPolicy.sol:DelegationPolicy --chain base-sepolia"
echo ""
