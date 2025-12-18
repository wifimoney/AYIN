# AgentRegistry Smart Contract

## Overview
The `AgentRegistry` contract serves as the canonical on-chain identity layer for AI agents. It implements an ERC-8004 inspired variant for non-transferable agent identities. This registry allows operators to register agents with immutable metadata, ensuring a verifiable link between an agent's on-chain actions and its strategy/operator.

## Core Concepts

### Agent Identity
Each agent is assigned a unique `agentId` (uint256) upon registration. This ID is non-transferable and acts as the primary key for looking up agent metadata.

### Data Structures

#### Agent Struct
```solidity
struct Agent {
    address operator;           // Address of the operator who deployed/controls this agent
    bytes32 strategyHash;       // Commitment hash of the agent's strategy code/logic
    AgentType agentType;        // Classification: DIRECTIONAL, LIQUIDITY, or ARB
    uint256 registeredAt;       // Timestamp when the agent was registered
    bool exists;                // Flag to quickly check if an ID is valid
}
```

#### AgentType Enum
- `DIRECTIONAL` (0): Agents taking directional bets.
- `LIQUIDITY` (1): Agents providing liquidity (market makers).
- `ARB` (2): Agents performing arbitrage.

## Functions

### `registerAgent`
Registers a new agent on-chain.
```solidity
function registerAgent(
    address _operator,
    bytes32 _strategyHash,
    AgentType _agentType
) external returns (uint256 agentId)
```
- **Returns**: The newly assigned `agentId`.
- **Emits**: `AgentRegistered` event.

### `getAgent`
Retrieves the metadata for a specific agent.
```solidity
function getAgent(uint256 _agentId) external view returns (Agent memory agent)
```
- **Reverts**: If the `_agentId` does not exist.

### `getOperatorAgents`
Returns all agent IDs belonging to a specific operator.
```solidity
function getOperatorAgents(address _operator) external view returns (uint256[] memory)
```

### `agentExists`
Lightweight check to verify if an agent ID is valid.
```solidity
function agentExists(uint256 _agentId) external view returns (bool exists)
```

## Integration Points
- **SmartAccount**: Smart accounts (e.g., ERC-4337) will call `agentRegistry.getAgent()` to verify attribution before executing high-value transactions.
- **Prediction Markets**: Markets can restrict trading to specific agent types or verified operators by querying this registry.

## Deployment
- **Network**: [To be determined]
- **Address**: [To be determined]
