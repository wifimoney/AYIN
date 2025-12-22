#!/bin/bash

# AgentRegistry Contract Address (Base Sepolia)
AGENT_REGISTRY="0x50a38037439f377227fd485ef7cd4647e1b4802a"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"

if [ -z "$1" ] || [ -z "$2" ] || [ -z "$3" ]; then
    echo "Usage: $0 <operator_address> <strategy_hash> <agent_type>"
    echo ""
    echo "Parameters:"
    echo "  operator_address: The address that will control this agent (e.g., your wallet address)"
    echo "  strategy_hash:    32-byte hash of the strategy (bytes32)"
    echo "  agent_type:       0=DIRECTIONAL, 1=LIQUIDITY, 2=ARB"
    echo ""
    echo "Example:"
    echo "  $0 0x742D35CC6634c0532925A3b844BC9E7595F0BEb0 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef 0"
    echo ""
    echo "Note: Requires PRIVATE_KEY environment variable to be set"
    exit 1
fi

OPERATOR=$1
STRATEGY_HASH=$2
AGENT_TYPE=$3

# Try to load PRIVATE_KEY from .env file if it exists
if [ -z "$PRIVATE_KEY" ] && [ -f ".env" ]; then
    export $(grep -v '^#' .env | xargs)
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ Error: PRIVATE_KEY environment variable is not set"
    echo ""
    echo "Set it with one of these methods:"
    echo "  1. export PRIVATE_KEY=your_private_key"
    echo "  2. Create a .env file with: PRIVATE_KEY=your_private_key"
    echo "  3. The script will auto-load from .env if it exists"
    exit 1
fi

echo "Registering agent..."
echo "Operator: $OPERATOR"
echo "Strategy Hash: $STRATEGY_HASH"
echo "Agent Type: $AGENT_TYPE"
echo ""

cast send $AGENT_REGISTRY \
  "registerAgent(address,bytes32,uint8)" \
  "$OPERATOR" \
  "$STRATEGY_HASH" \
  "$AGENT_TYPE" \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY

echo ""
echo "✅ Agent registered! You can now query it with:"
echo "  ./query-operator.sh <agent_id>"

