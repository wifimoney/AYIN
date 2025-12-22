#!/bin/bash

# AgentRegistry Contract Address (Base Sepolia)
AGENT_REGISTRY="0x50a38037439f377227fd485ef7cd4647e1b4802a"
RPC_URL="${BASE_SEPOLIA_RPC_URL:-https://sepolia.base.org}"

if [ -z "$1" ]; then
    echo "Usage: $0 <agent_id>"
    echo ""
    echo "Example: $0 1"
    echo ""
    echo "First, check how many agents are registered:"
    echo "  cast call $AGENT_REGISTRY \"nextAgentId()\" --rpc-url $RPC_URL"
    exit 1
fi

AGENT_ID=$1

echo "Querying AgentRegistry for Agent ID: $AGENT_ID"
echo "Contract: $AGENT_REGISTRY"
echo "RPC: $RPC_URL"
echo ""

# Check if agent exists
EXISTS=$(cast call $AGENT_REGISTRY "agentExists(uint256)" $AGENT_ID --rpc-url $RPC_URL)
if [ "$EXISTS" = "0x0000000000000000000000000000000000000000000000000000000000000000" ]; then
    echo "❌ Agent ID $AGENT_ID does not exist"
    echo ""
    echo "Check nextAgentId to see how many agents are registered:"
    cast call $AGENT_REGISTRY "nextAgentId()" --rpc-url $RPC_URL
    exit 1
fi

echo "✅ Agent ID $AGENT_ID exists"
echo ""

# Get agent data using the agents mapping (returns tuple)
echo "Fetching agent data from agents mapping..."
AGENT_DATA=$(cast call $AGENT_REGISTRY "agents(uint256)" $AGENT_ID --rpc-url $RPC_URL)

# The struct is: (address operator, bytes32 strategyHash, uint8 agentType, uint256 registeredAt, bool exists)
# Parse the response - operator is the first address (starts at position 26, 40 chars)
OPERATOR_RAW=$(echo $AGENT_DATA | cut -c 27-66)
OPERATOR=$(cast --to-checksum-address $OPERATOR_RAW)

echo "📋 Operator Address: $OPERATOR"
echo ""
echo "Full agent data:"
echo "$AGENT_DATA"
echo ""
echo "To decode all fields, you can use:"
echo "  cast --abi-decode \"getAgent(uint256)(address,bytes32,uint8,uint256,bool)\" $AGENT_DATA"

