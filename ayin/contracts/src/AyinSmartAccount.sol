// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {DelegationPolicy} from "./DelegationPolicy.sol";
import {IAgentRegistry} from "./IAgentRegistry.sol";

/**
 * @title AyinSmartAccount
 * @notice ERC-4337 smart account wrapper with delegation enforcement
 */
contract AyinSmartAccount {
    
    DelegationPolicy public delegationPolicy;
    IAgentRegistry public agentRegistry;
    
    // User's actual smart account (can be thirdweb SmartWallet or similar)
    // For this MVP implementation, we assume AyinSmartAccount IS the main contract 
    // or has direct access. We'll simulate ownership.
    address public _owner;
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event TradeProposed(
        address indexed agent,
        address indexed market,
        uint256 tradeSize,
        bool executed
    );
    
    // =============================================================================
    // MODIFIERS
    // =============================================================================
    
    modifier onlyOwner() {
        require(msg.sender == owner(), "Unauthorized");
        _;
    }
    
    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================
    
    constructor(
        address _delegationPolicy,
        address _agentRegistry,
        address _ownerAddress
    ) {
        delegationPolicy = DelegationPolicy(_delegationPolicy);
        agentRegistry = IAgentRegistry(_agentRegistry);
        _owner = _ownerAddress;
    }
    
    // =============================================================================
    // FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Validate and execute a trade from an agent
     * @param _agentId Agent registry ID
     * @param _market Market to trade on
     * @param _tradeSize Size of trade
     * @param _tradeData Encoded trade data (e.g., direction, leverage)
     */
    function executeTrade(
        uint256 _agentId,
        address _market,
        uint256 _tradeSize,
        bytes calldata _tradeData
    ) external {
        // 1. Look up agent from registry
        IAgentRegistry.Agent memory agent = agentRegistry.getAgent(_agentId);
        
        // Verify the caller is the agent's operator (the actual bot key)
        require(agent.operator == msg.sender, "Not agent operator");
        
        // 2. Enforce policy
        // This checks if 'this' contract (AyinSmartAccount) has delegated to agent.operator
        delegationPolicy.enforcePolicy(agent.operator, _market, _tradeSize);
        
        // 3. Call market with trade
        // In a real implementation, this might call underlyingSmartAccount.execute(_market, 0, _tradeData)
        // Here we do a direct call for MVP
        (bool success, ) = _market.call(_tradeData);
        require(success, "Trade execution failed");
        
        // 4. Emit event
        emit TradeProposed(agent.operator, _market, _tradeSize, true);
    }
    
    /**
     * @notice Create a mandate for an agent
     * @param _agent Agent address
     * @param _maxTradeSize Max per trade
     * @param _allowedMarkets Markets agent can trade
     * @param _expiryTime Mandate expiry
     */
    function authorizeAgent(
        address _agent,
        uint256 _maxTradeSize,
        address[] calldata _allowedMarkets,
        uint256 _expiryTime
    ) external onlyOwner {
        delegationPolicy.createMandate(
            _agent,
            _maxTradeSize,
            _allowedMarkets,
            _expiryTime
        );
    }
    
    /**
     * @notice Instantly revoke an agent
     * @param _agent Agent to revoke
     */
    function revokeAgent(address _agent) external onlyOwner {
        delegationPolicy.revokeAgent(_agent);
    }
    
    function owner() public view returns (address) {
        return _owner;
    }
    
    // Allow contract to receive ETH for testing trade calls
    receive() external payable {}
}
