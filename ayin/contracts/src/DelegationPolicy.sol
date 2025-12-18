// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title DelegationPolicy
 * @notice Policies that constrain what agents can do via smart accounts
 */
contract DelegationPolicy {
    // =============================================================================
    // TYPES
    // =============================================================================
    
    /**
     * @notice A mandate defines what an agent is allowed to do
     * @dev Enforced on-chain before trade execution
     */
    struct Mandate {
        address agent;                  // Agent address this mandate authorizes
        uint256 maxTradeSize;           // Max size of single trade (in tokens)
        address[] allowedMarkets;       // Whitelist of markets this agent can trade on
        uint256 expiryTime;             // Block timestamp when this mandate expires
        bool isActive;                  // Can be revoked instantly
        uint256 createdAt;              // For audit trail
        uint256 mandateId;             // The ID of this mandate
    }
    
    // =============================================================================
    // STATE
    // =============================================================================
    
    mapping(address => Mandate[]) public mandates;              // smartAccount => list of mandates
    mapping(address => mapping(address => uint256)) public mandateIndex; // smartAccount => agent => mandateId
    
    // =============================================================================
    // EVENTS
    // =============================================================================
    
    event MandateCreated(
        address indexed smartAccount,
        address indexed agent,
        uint256 maxTradeSize,
        uint256 expiryTime,
        address[] allowedMarkets
    );
    
    event MandateRevoked(
        address indexed smartAccount,
        address indexed agent
    );
    
    event MandateExecution(
        address indexed smartAccount,
        address indexed agent,
        address market,
        uint256 tradeSize
    );
    
    // =============================================================================
    // ERRORS
    // =============================================================================
    
    error MandateExpired();
    error MandateInactive();
    error TradeSizeExceedsLimit(uint256 requested, uint256 limit);
    error MarketNotWhitelisted();
    error UnauthorizedAgent();
    error InvalidMandate();
    
    // =============================================================================
    // FUNCTIONS
    // =============================================================================
    
    /**
     * @notice Create a new mandate authorizing an agent
     * @param _agent Agent address to authorize
     * @param _maxTradeSize Maximum size per trade
     * @param _allowedMarkets Array of market addresses this agent can trade on
     * @param _expiryTime Block timestamp when mandate expires
     * @return mandateId Index of created mandate
     */
    function createMandate(
        address _agent,
        uint256 _maxTradeSize,
        address[] calldata _allowedMarkets,
        uint256 _expiryTime
    ) external returns (uint256 mandateId) {
        require(_agent != address(0), "Invalid agent");
        require(_maxTradeSize > 0, "Invalid max trade size");
        require(_allowedMarkets.length > 0, "No markets whitelisted");
        require(_expiryTime > block.timestamp, "Invalid expiry");
        
        mandateId = mandates[msg.sender].length;
        
        Mandate memory newMandate = Mandate({
            agent: _agent,
            maxTradeSize: _maxTradeSize,
            allowedMarkets: _allowedMarkets,
            expiryTime: _expiryTime,
            isActive: true,
            createdAt: block.timestamp,
            mandateId: mandateId
        });
        
        mandates[msg.sender].push(newMandate);
        mandateIndex[msg.sender][_agent] = mandateId;
        
        emit MandateCreated(msg.sender, _agent, _maxTradeSize, _expiryTime, _allowedMarkets);
        
        return mandateId;
    }
    
    /**
     * @notice Instantly revoke an agent's mandate
     * @param _agent Agent to revoke
     */
    function revokeAgent(address _agent) external {
        uint256 mandateId = mandateIndex[msg.sender][_agent];
        
        // Ensure index is valid and points to the correct agent
        // Note: Using a 0 index as default can be tricky if the first mandate (id 0) is legitimately for this agent.
        // But since we check `mandate.agent == _agent`, it protects against false positives if the map entry is missing (0 default) and 0th mandate is different agent.
        // However, if 0th mandate IS this agent, it works.
        // If map returns 0 (default) but 0th mandate is NOT this agent, the require fails.
        // The one edge case: User has NO mandates, map returns 0. Array out of bounds?
        if (mandates[msg.sender].length == 0) {
            revert("Mandate not found");
        }
        
        Mandate storage mandate = mandates[msg.sender][mandateId];
        
        require(mandate.agent == _agent, "Mandate not found");
        require(mandate.isActive, "Already revoked");
        
        mandate.isActive = false;
        
        emit MandateRevoked(msg.sender, _agent);
    }
    
    /**
     * @notice Enforce policy before a trade executes
     * @dev Called by smart account before delegating to agent
     * @param _agent Agent attempting trade
     * @param _market Market being traded on
     * @param _tradeSize Size of trade
     */
    function enforcePolicy(
        address _agent,
        address _market,
        uint256 _tradeSize
    ) external {
        // Check if mandates array is empty first to avoid out of bounds
        if (mandates[msg.sender].length == 0) {
            revert UnauthorizedAgent();
        }

        uint256 mandateId = mandateIndex[msg.sender][_agent];
        Mandate storage mandate = mandates[msg.sender][mandateId];
        
        if (mandate.agent != _agent) {
            revert UnauthorizedAgent();
        }
        if (!mandate.isActive) {
            revert MandateInactive();
        }
        if (block.timestamp > mandate.expiryTime) {
            revert MandateExpired();
        }
        if (_tradeSize > mandate.maxTradeSize) {
            revert TradeSizeExceedsLimit(_tradeSize, mandate.maxTradeSize);
        }
        
        if (!isMarketAllowed(mandate, _market)) {
            revert MarketNotWhitelisted();
        }
        
        emit MandateExecution(msg.sender, _agent, _market, _tradeSize);
    }
    
    /**
     * @notice Get mandate for an agent on a smart account
     * @param _smartAccount Smart account address
     * @param _agent Agent address
     * @return mandate The mandate struct
     */
    function getMandate(
        address _smartAccount,
        address _agent
    ) external view returns (Mandate memory mandate) {
        if (mandates[_smartAccount].length == 0) {
            // Return empty/dummy or revert?
            // Returning empty struct conforms to "view" semantics better than reverting if simply asking "what is the mandate"
            return mandate; // all fields 0
        }
        uint256 mandateId = mandateIndex[_smartAccount][_agent];
        Mandate memory m = mandates[_smartAccount][mandateId];
        if (m.agent == _agent) {
            return m;
        }
        return mandate; // Return empty if mismatch (meaning no mandate really existed at that index)
    }
    
    /**
     * @notice Check if agent is authorized on smart account
     * @param _smartAccount Smart account address
     * @param _agent Agent address
     * @return authorized True if active mandate exists
     */
    function isAgentAuthorized(
        address _smartAccount,
        address _agent
    ) external view returns (bool authorized) {
        if (mandates[_smartAccount].length == 0) return false;
        
        uint256 mandateId = mandateIndex[_smartAccount][_agent];
        Mandate memory mandate = mandates[_smartAccount][mandateId];
        
        return mandate.agent == _agent && mandate.isActive && block.timestamp <= mandate.expiryTime;
    }
    
    /**
     * @notice Check if market is whitelisted for a mandate
     * @param _mandate The mandate to check
     * @param _market Market address
     * @return allowed True if market is whitelisted
     */
    function isMarketAllowed(
        Mandate memory _mandate,
        address _market
    ) internal pure returns (bool allowed) {
        for (uint256 i = 0; i < _mandate.allowedMarkets.length; i++) {
            if (_mandate.allowedMarkets[i] == _market) {
                return true;
            }
        }
        return false;
    }
}
