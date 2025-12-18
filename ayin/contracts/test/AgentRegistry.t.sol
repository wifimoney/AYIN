// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {AgentRegistry} from "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry registry;
    address operator = address(0x1);
    bytes32 strategyHash = keccak256("test_strategy");
    AgentRegistry.AgentType agentType = AgentRegistry.AgentType.DIRECTIONAL;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed operator,
        AgentRegistry.AgentType agentType,
        bytes32 strategyHash,
        uint256 timestamp
    );

    function setUp() public {
        registry = new AgentRegistry();
    }

    // =============================================================================
    // REGISTRATION TESTS
    // =============================================================================

    function testRegisterAgentSuccess() public {
        vm.expectEmit(true, true, false, true);
        emit AgentRegistered(1, operator, agentType, strategyHash, block.timestamp);

        uint256 agentId = registry.registerAgent(operator, strategyHash, agentType);
        
        assertEq(agentId, 1, "First agent should have ID 1");
        
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        assertEq(agent.operator, operator);
        assertEq(agent.strategyHash, strategyHash);
        assertTrue(agent.exists);
        assertTrue(agent.agentType == agentType);
    }
    
    function testRegisterAgentIncrementsId() public {
        uint256 id1 = registry.registerAgent(operator, strategyHash, agentType);
        uint256 id2 = registry.registerAgent(operator, strategyHash, agentType);
        
        assertEq(id1, 1);
        assertEq(id2, 2);
    }

    function testRegisterAgentRejectsZeroOperator() public {
        vm.expectRevert("Invalid operator");
        registry.registerAgent(address(0), strategyHash, agentType);
    }

    function testRegisterAgentRejectsZeroHash() public {
        vm.expectRevert("Invalid strategy hash");
        registry.registerAgent(operator, bytes32(0), agentType);
    }

    // =============================================================================
    // LOOKUP TESTS
    // =============================================================================

    function testGetAgentReturnsCorrectData() public {
        uint256 agentId = registry.registerAgent(operator, strategyHash, agentType);
        AgentRegistry.Agent memory agent = registry.getAgent(agentId);
        
        assertEq(agent.operator, operator);
        assertEq(agent.strategyHash, strategyHash);
        assertTrue(agent.exists);
    }

    function testGetAgentRevertsForInvalidId() public {
        vm.expectRevert(AgentRegistry.AgentNotFound.selector);
        registry.getAgent(999);
    }

    function testAgentExistsReturnsTrue() public {
        uint256 agentId = registry.registerAgent(operator, strategyHash, agentType);
        assertTrue(registry.agentExists(agentId));
    }

    function testAgentExistsReturnsFalse() public {
        assertFalse(registry.agentExists(999));
    }

    // =============================================================================
    // OPERATOR TRACKING TESTS
    // =============================================================================

    function testGetOperatorAgentsReturnsAll() public {
        uint256 id1 = registry.registerAgent(operator, strategyHash, agentType);
        uint256 id2 = registry.registerAgent(operator, strategyHash, agentType);

        uint256[] memory agentIds = registry.getOperatorAgents(operator);
        assertEq(agentIds.length, 2);
        assertEq(agentIds[0], id1);
        assertEq(agentIds[1], id2);
    }

    function testGetOperatorAgentsEmptyForNewOperator() public {
        uint256[] memory agentIds = registry.getOperatorAgents(address(0x999));
        assertEq(agentIds.length, 0);
    }

    function testMultipleOperatorsIndependent() public {
        address op1 = address(0x1);
        address op2 = address(0x2);

        uint256 id1 = registry.registerAgent(op1, strategyHash, agentType);
        uint256 id2 = registry.registerAgent(op2, strategyHash, agentType);

        uint256[] memory op1Agents = registry.getOperatorAgents(op1);
        uint256[] memory op2Agents = registry.getOperatorAgents(op2);

        assertEq(op1Agents.length, 1);
        assertEq(op1Agents[0], id1);

        assertEq(op2Agents.length, 1);
        assertEq(op2Agents[0], id2);
    }
}
