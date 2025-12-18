// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {AyinSmartAccount} from "../src/AyinSmartAccount.sol";
import {DelegationPolicy} from "../src/DelegationPolicy.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";
import {IAgentRegistry} from "../src/IAgentRegistry.sol";

contract IntegrationTest is Test {
    AyinSmartAccount ayinAccount;
    DelegationPolicy delegationPolicy;
    AgentRegistry agentRegistry;
    
    address smartAccountOwner = address(0xAA);
    address agentOperator = address(0xBB);
    address marketAddress = address(0xCC);
    address agentAddress = agentOperator; // In basic scenario, operator is the agent "key" used to sign
    
    function setUp() public {
        delegationPolicy = new DelegationPolicy();
        agentRegistry = new AgentRegistry();
        
        ayinAccount = new AyinSmartAccount(
            address(delegationPolicy),
            address(agentRegistry),
            smartAccountOwner
        );
        
        // Mock market (needs to accept calls)
        vm.etch(marketAddress, hex"00");
    }
    
    function testFullFlow() public {
        // 1. Register agent
        vm.prank(agentOperator);
        uint256 agentId = agentRegistry.registerAgent(
            agentOperator,
            keccak256("strategy_1"),
            AgentRegistry.AgentType.DIRECTIONAL
        );
        
        // 2. Create mandate
        address[] memory markets = new address[](1);
        markets[0] = marketAddress;
        
        vm.prank(smartAccountOwner);
        ayinAccount.authorizeAgent(
            agentOperator, // authorize the operator address
            100e18,  // max trade size
            markets,
            block.timestamp + 30 days
        );
        
        // 3. Trade within limit (should succeed)
        // To make a successful low-level call to empty address, we assume it just returns success.
        // vm.etch ensures code exists? No, empty code returns success.
        
        vm.prank(agentOperator);
        ayinAccount.executeTrade(agentId, marketAddress, 50e18, hex"00");
        
        // 4. Trade over limit (should fail)
        vm.prank(agentOperator);
        vm.expectRevert(
            abi.encodeWithSelector(DelegationPolicy.TradeSizeExceedsLimit.selector, 150e18, 100e18)
        );
        ayinAccount.executeTrade(agentId, marketAddress, 150e18, hex"00");
        
        // 5. Revoke
        vm.prank(smartAccountOwner);
        ayinAccount.revokeAgent(agentOperator);
        
        // 6. Trade after revocation (should fail)
        vm.prank(agentOperator);
        vm.expectRevert(DelegationPolicy.MandateInactive.selector);
        ayinAccount.executeTrade(agentId, marketAddress, 50e18, hex"00");
    }
}
