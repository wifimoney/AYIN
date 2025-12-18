// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AgentRegistry
 * @notice Non-transferable agent identity registry (ERC-8004 variant)
 * @dev Stores canonical agent metadata and enables attribution
 */
contract AgentRegistry {
    // =============================================================================
    // TYPES
    // =============================================================================
    
    struct Agent {
        address operator;           // Who deployed this agent
        bytes32 strategyHash;       // Commitment hash of strategy code
        AgentType agentType;        // directional / liquidity / arb
        uint256 registeredAt;       // Timestamp of registration
        bool exists;                // To distinguish "never registered" from empty
    }
    
    enum AgentType {
        DIRECTIONAL,
        LIQUIDITY,
        ARB
    }
    
    // =============================================================================
    // STATE
    // =============================================================================
    
    uint256 public nextAgentId = 1; // Start from 1, 0 = invalid
    
    mapping(uint256 => Agent) public agents;           // agentId => Agent
    mapping(address => uint256[]) public operatorAgents; // operator => [agentIds]
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed operator,
        AgentType agentType,
        bytes32 strategyHash,
        uint256 timestamp
    );
    
    // =============================================================================
    // ERRORS
    // =============================================================================
    
    error InvalidAgentId();
    error AgentNotFound();
    error InvalidAgentType();
    
    // =============================================================================
    // FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Register a new agent
     * @param _operator Address that controls this agent
     * @param _strategyHash Commitment hash of strategy logic
     * @param _agentType Type of agent (0=directional, 1=liquidity, 2=arb)
     * @return agentId Non-transferable on-chain identity
     */
    function registerAgent(
        address _operator,
        bytes32 _strategyHash,
        AgentType _agentType
    ) external returns (uint256 agentId) {
        require(_operator != address(0), "Invalid operator");
        require(_strategyHash != bytes32(0), "Invalid strategy hash");
        
        agentId = nextAgentId;
        
        agents[agentId] = Agent({
            operator: _operator,
            strategyHash: _strategyHash,
            agentType: _agentType,
            registeredAt: block.timestamp,
            exists: true
        });
        
        operatorAgents[_operator].push(agentId);
        
        nextAgentId++;
        
        emit AgentRegistered(agentId, _operator, _agentType, _strategyHash, block.timestamp);
        
        return agentId;
    }
    
    /**
     * @notice Retrieve agent metadata by ID (public lookup)
     * @param _agentId Agent ID to look up
     * @return agent Agent struct with operator, strategy hash, type
     */
    function getAgent(uint256 _agentId) external view returns (Agent memory agent) {
        if (!agents[_agentId].exists) {
            revert AgentNotFound();
        }
        return agents[_agentId];
    }
    
    /**
     * @notice Get all agents registered by an operator
     * @param _operator Operator address
     * @return Agent IDs registered by this operator
     */
    function getOperatorAgents(address _operator) external view returns (uint256[] memory) {
        return operatorAgents[_operator];
    }
    
    /**
     * @notice Check if agent exists
     * @param _agentId Agent ID to check
     * @return exists True if agent is registered
     */
    function agentExists(uint256 _agentId) external view returns (bool exists) {
        return agents[_agentId].exists;
    }
}
