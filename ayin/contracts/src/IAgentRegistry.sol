// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAgentRegistry {
    enum AgentType {
        DIRECTIONAL,
        LIQUIDITY,
        ARB
    }

    struct Agent {
        address operator;           // Who deployed this agent
        bytes32 strategyHash;       // Commitment hash of strategy code
        AgentType agentType;        // directional / liquidity / arb
        uint256 registeredAt;       // Timestamp of registration
        bool exists;                // To distinguish "never registered" from empty
    }

    function registerAgent(
        address _operator,
        bytes32 _strategyHash,
        AgentType _agentType
    ) external returns (uint256 agentId);

    function getAgent(uint256 _agentId) external view returns (Agent memory agent);

    function getOperatorAgents(address _operator) external view returns (uint256[] memory);

    function agentExists(uint256 _agentId) external view returns (bool exists);
}
