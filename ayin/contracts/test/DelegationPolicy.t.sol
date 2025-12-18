// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {DelegationPolicy} from "../src/DelegationPolicy.sol";

contract DelegationPolicyTest is Test {
    DelegationPolicy policy;
    address smartAccount = address(0x1);
    address agent = address(0x2);
    address market1 = address(0x3);
    address market2 = address(0x4);
    
    uint256 maxTradeSize = 1000e18;
    uint256 expiryTime;
    
    address[] allowedMarkets;

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
    
    // Explicitly define policy errors matching the contract
    error MandateExpired();
    error MandateInactive();
    error TradeSizeExceedsLimit(uint256 requested, uint256 limit);
    error MarketNotWhitelisted();
    error UnauthorizedAgent();
    error InvalidMandate();

    function setUp() public {
        policy = new DelegationPolicy();
        
        allowedMarkets = new address[](2);
        allowedMarkets[0] = market1;
        allowedMarkets[1] = market2;
        
        expiryTime = block.timestamp + 30 days;
    }

    // =============================================================================
    // TEST GROUP A: MANDATE CREATION
    // =============================================================================

    function testCreateMandateSuccess() public {
        vm.prank(smartAccount);
        uint256 mandateId = policy.createMandate(
            agent,
            maxTradeSize,
            allowedMarkets,
            expiryTime
        );
        
        assertEq(mandateId, 0, "First mandate should be ID 0");
        
        DelegationPolicy.Mandate memory mandate = policy.getMandate(smartAccount, agent);
        assertEq(mandate.agent, agent);
        assertEq(mandate.maxTradeSize, maxTradeSize);
        assertTrue(mandate.isActive);
    }

    function testCreateMandateRejectsZeroAgent() public {
        vm.prank(smartAccount);
        vm.expectRevert("Invalid agent");
        policy.createMandate(address(0), maxTradeSize, allowedMarkets, expiryTime);
    }
    
    function testCreateMandateRejectsZeroTradeSize() public {
        vm.prank(smartAccount);
        vm.expectRevert("Invalid max trade size");
        policy.createMandate(agent, 0, allowedMarkets, expiryTime);
    }

    function testCreateMandateRejectsExpiryInPast() public {
         vm.prank(smartAccount);
         vm.expectRevert("Invalid expiry");
         policy.createMandate(agent, maxTradeSize, allowedMarkets, block.timestamp - 1);
    }

    // =============================================================================
    // TEST GROUP B: REVOCATION
    // =============================================================================
    
    function testRevokeAgentSuccess() public {
        vm.prank(smartAccount);
        policy.createMandate(agent, maxTradeSize, allowedMarkets, expiryTime);
        
        vm.prank(smartAccount);
        vm.expectEmit(true, true, false, true);
        emit MandateRevoked(smartAccount, agent);
        policy.revokeAgent(agent);
        
        bool authorized = policy.isAgentAuthorized(smartAccount, agent);
        assertFalse(authorized, "Agent should be unauthorized after revocation");
    }

    function testRevokeAgentTwiceFails() public {
         vm.prank(smartAccount);
         policy.createMandate(agent, maxTradeSize, allowedMarkets, expiryTime);
         
         vm.prank(smartAccount);
         policy.revokeAgent(agent);
         
         vm.prank(smartAccount);
         vm.expectRevert("Already revoked");
         policy.revokeAgent(agent);
    }

    // =============================================================================
    // TEST GROUP C: POLICY ENFORCEMENT
    // =============================================================================

    function testEnforcePolicyRejectExpired() public {
        vm.prank(smartAccount);
        policy.createMandate(agent, maxTradeSize, allowedMarkets, expiryTime);
        
        // Fast forward
        vm.warp(expiryTime + 1);
        
        vm.prank(smartAccount);
        vm.expectRevert(MandateExpired.selector);
        policy.enforcePolicy(agent, market1, 100e18);
    }

    function testEnforcePolicyRejectInactive() public {
        vm.prank(smartAccount);
        policy.createMandate(agent, maxTradeSize, allowedMarkets, expiryTime);
        
        vm.prank(smartAccount);
        policy.revokeAgent(agent);
        
        vm.prank(smartAccount);
        vm.expectRevert(MandateInactive.selector);
        policy.enforcePolicy(agent, market1, 100e18);
    }

    function testEnforcePolicyRejectOverLimit() public {
        vm.prank(smartAccount);
        policy.createMandate(agent, maxTradeSize, allowedMarkets, expiryTime);
        
        vm.prank(smartAccount);
        vm.expectRevert(abi.encodeWithSelector(TradeSizeExceedsLimit.selector, maxTradeSize + 1, maxTradeSize));
        policy.enforcePolicy(agent, market1, maxTradeSize + 1);
    }

    function testEnforcePolicyRejectUnwhitelistedMarket() public {
        vm.prank(smartAccount);
        policy.createMandate(agent, maxTradeSize, allowedMarkets, expiryTime);
        
        address badMarket = address(0x99);
        
        vm.prank(smartAccount);
        vm.expectRevert(MarketNotWhitelisted.selector);
        policy.enforcePolicy(agent, badMarket, 10e18);
    }

    function testEnforcePolicyAcceptsValid() public {
        vm.prank(smartAccount);
        policy.createMandate(agent, maxTradeSize, allowedMarkets, expiryTime);
        
        // Should not revert
        vm.prank(smartAccount);
        policy.enforcePolicy(agent, market1, 10e18);
    }
}
