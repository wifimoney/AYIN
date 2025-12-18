// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract MarketIntegrationTest is Test {
    PredictionMarket market;
    address smartAccount1 = address(0xAA);
    address smartAccount2 = address(0xBB);
    address resolver = address(0xCC);
    
    event PnLAttributed(
        uint256 indexed marketId,
        address indexed trader,
        uint256 indexed agentId,
        uint256 winnings,
        uint256 loss,
        int256 pnl
    );
    
    function setUp() public {
        market = new PredictionMarket();
        market.setSmartAccountAuthorization(smartAccount1, true);
        market.setSmartAccountAuthorization(smartAccount2, true);
    }
    
    function testFullMarketFlow() public {
        // 1. Create market
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Will ETH > $3000?", resTime, resolver);
        
        // 2. Agent 1 trades YES
        vm.prank(smartAccount1);
        market.trade(marketId, 1, 100e18, PredictionMarket.Outcome.YES);
        
        // 3. Agent 2 trades NO
        vm.prank(smartAccount2);
        market.trade(marketId, 2, 50e18, PredictionMarket.Outcome.NO);
        
        // Check positions
        PredictionMarket.Position memory pos1 = market.getPosition(marketId, smartAccount1);
        assertEq(pos1.yesShares, 100e18);
        
        PredictionMarket.Position memory pos2 = market.getPosition(marketId, smartAccount2);
        assertEq(pos2.noShares, 50e18);
        
        // 4. Resolve to YES
        vm.warp(resTime + 1);
        vm.prank(resolver);
        market.resolveMarket(marketId, PredictionMarket.Outcome.YES);
        
        // 5. Settle both
        
        // Expect Agent 1 to win
        // Cost: 100 * 0.5 = 50
        // Win: 100 * 1.0 = 100
        // PnL: +50
        vm.expectEmit(true, true, true, true);
        emit PnLAttributed(marketId, smartAccount1, 1, 100e18, 0, 50e18);
        market.settlePosition(marketId, smartAccount1);
        
        // Expect Agent 2 to lose
        // Cost: 50 * 0.5 = 25
        // Win: 0
        // PnL: -25 -> 0 (clamped)
        vm.expectEmit(true, true, true, true);
        emit PnLAttributed(marketId, smartAccount2, 2, 0, 50e18, -25e18);
        market.settlePosition(marketId, smartAccount2);
        
        // 6. Verify results stored
        pos1 = market.getPosition(marketId, smartAccount1);
        assertEq(pos1.settled, true);
        assertEq(pos1.pnl, 50e18);
        
        pos2 = market.getPosition(marketId, smartAccount2);
        assertEq(pos2.settled, true);
        assertEq(pos2.pnl, 0);
    }
}
