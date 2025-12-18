// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Test} from "forge-std/Test.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract PredictionMarketTest is Test {
    PredictionMarket market;
    address smartAccount = address(0x1);
    address resolver = address(0x2);
    
    event MarketCreated(
        uint256 indexed marketId,
        string question,
        uint256 resolutionTime,
        address indexed resolver
    );

    event TradeExecuted(
        uint256 indexed marketId,
        address indexed trader,
        uint256 indexed agentId,
        PredictionMarket.Outcome direction,
        uint256 shareSize,
        uint256 price,
        uint256 timestamp
    );
    
    event MarketResolved(
        uint256 indexed marketId,
        PredictionMarket.Outcome outcome,
        uint256 timestamp
    );
    
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
        market.setSmartAccountAuthorization(smartAccount, true);
    }

    // =============================================================================
    // TEST GROUP A: MARKET CREATION
    // =============================================================================

    function testCreateMarketSuccess() public {
        uint256 resTime = block.timestamp + 30 days;
        
        vm.expectEmit(true, false, false, true);
        emit MarketCreated(1, "Will ETH > $3000?", resTime, resolver);
        
        uint256 marketId = market.createMarket("Will ETH > $3000?", resTime, resolver);
        
        assertEq(marketId, 1, "First market should be ID 1");
        
        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint256(m.status), uint256(PredictionMarket.MarketStatus.OPEN));
        assertEq(uint256(m.outcome), uint256(PredictionMarket.Outcome.UNRESOLVED));
        assertEq(m.resolver, resolver);
    }
    
    function testCreateMarketRejectsEmptyQuestion() public {
        uint256 resTime = block.timestamp + 30 days;
        vm.expectRevert("Empty question");
        market.createMarket("", resTime, resolver);
    }
    
    function testCreateMarketRejectsInvalidResolutionTime() public {
        // Time in past
        vm.expectRevert("Invalid resolution time");
        market.createMarket("Q?", block.timestamp - 1, resolver);
    }

    // =============================================================================
    // TEST GROUP B: TRADING
    // =============================================================================
    
    function testTradeSuccess() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Will ETH > $3000?", resTime, resolver);
        
        vm.prank(smartAccount);
        vm.expectEmit(true, true, true, true);
        emit TradeExecuted(marketId, smartAccount, 1, PredictionMarket.Outcome.YES, 100e18, 5000, block.timestamp);
        
        uint256 price = market.trade(marketId, 1, 100e18, PredictionMarket.Outcome.YES);
        
        assertEq(price, 5000, "Price should be 5000 bp for MVP");
        
        PredictionMarket.Position memory pos = market.getPosition(marketId, smartAccount);
        assertEq(pos.yesShares, 100e18);
        assertEq(pos.noShares, 0);
    }
    
    function testTradeRejectsUnauthorizedSmartAccount() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Q?", resTime, resolver);
        
        vm.prank(address(0xBAD));
        vm.expectRevert(PredictionMarket.UnauthorizedSmartAccount.selector);
        market.trade(marketId, 1, 100e18, PredictionMarket.Outcome.YES);
    }
    
    function testTradeRejectsClosedMarket() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Q?", resTime, resolver);
        
        vm.warp(resTime + 1);
        vm.prank(resolver);
        market.resolveMarket(marketId, PredictionMarket.Outcome.YES);
        
        vm.prank(smartAccount);
        vm.expectRevert(PredictionMarket.MarketNotOpen.selector);
        market.trade(marketId, 1, 100e18, PredictionMarket.Outcome.YES);
    }
    
    function testTradeUpdatesPosition() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Q?", resTime, resolver);
        
        vm.prank(smartAccount);
        market.trade(marketId, 1, 50e18, PredictionMarket.Outcome.YES);
        
        vm.prank(smartAccount);
        market.trade(marketId, 1, 20e18, PredictionMarket.Outcome.NO);
        
        PredictionMarket.Position memory pos = market.getPosition(marketId, smartAccount);
        assertEq(pos.yesShares, 50e18);
        assertEq(pos.noShares, 20e18);
    }
    
    // =============================================================================
    // TEST GROUP C: RESOLUTION
    // =============================================================================
    
    function testResolveMarketSuccess() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Will ETH > $3000?", resTime, resolver);
        
        // Fast-forward past resolution time
        vm.warp(resTime + 1);
        
        vm.prank(resolver);
        market.resolveMarket(marketId, PredictionMarket.Outcome.YES);
        
        PredictionMarket.Market memory m = market.getMarket(marketId);
        assertEq(uint256(m.status), uint256(PredictionMarket.MarketStatus.RESOLVED));
        assertEq(uint256(m.outcome), uint256(PredictionMarket.Outcome.YES));
    }
    
    function testResolveMarketRejectsUnauthorizedResolver() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Q?", resTime, resolver);
        
        vm.warp(resTime + 1);
        vm.prank(address(0xBAD));
        vm.expectRevert(PredictionMarket.UnauthorizedResolver.selector);
        market.resolveMarket(marketId, PredictionMarket.Outcome.YES);
    }
    
    function testResolveMarketEnforcesTime() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Q?", resTime, resolver);
        
        // Only 10 days pass
        vm.warp(resTime - 20 days);
        
        vm.prank(resolver);
        vm.expectRevert("Not yet resolvable");
        market.resolveMarket(marketId, PredictionMarket.Outcome.YES);
    }

    // =============================================================================
    // TEST GROUP D: SETTLEMENT
    // =============================================================================

    function testSettlePositionYesWins() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Q?", resTime, resolver);
        
        // Trade 100 YES
        vm.prank(smartAccount);
        market.trade(marketId, 1, 100e18, PredictionMarket.Outcome.YES);
        
        // Trade 50 NO
        vm.prank(smartAccount);
        market.trade(marketId, 1, 50e18, PredictionMarket.Outcome.NO);
        
        // Resolve YES
        vm.warp(resTime + 1);
        vm.prank(resolver);
        market.resolveMarket(marketId, PredictionMarket.Outcome.YES);
        
        // PnL Expected:
        // Winnings = 100e18 (YES shares)
        // Losses = 50e18 (NO shares)
        // Cost was 0.5/share
        // PnL = 1.0 * 100 - 0.5 * (100 + 50) = 100 - 75 = 25
        
        vm.expectEmit(true, true, true, true);
        emit PnLAttributed(marketId, smartAccount, 1, 100e18, 50e18, 25e18);
        
        market.settlePosition(marketId, smartAccount);
        
        PredictionMarket.Position memory pos = market.getPosition(marketId, smartAccount);
        assertTrue(pos.settled);
        assertEq(pos.pnl, 25e18);
    }

    function testSettlePositionNoWins() public {
        uint256 resTime = block.timestamp + 30 days;
        uint256 marketId = market.createMarket("Q?", resTime, resolver);
        
        // Trade 100 YES
        vm.prank(smartAccount);
        market.trade(marketId, 1, 100e18, PredictionMarket.Outcome.YES);
        
        // Trade 50 NO
        vm.prank(smartAccount);
        market.trade(marketId, 1, 50e18, PredictionMarket.Outcome.NO);
        
        // Resolve NO
        vm.warp(resTime + 1);
        vm.prank(resolver);
        market.resolveMarket(marketId, PredictionMarket.Outcome.NO);
        
        // PnL Expected:
        // Winnings = 50e18 (NO shares)
        // Losses = 100e18 (YES shares)
        // Cost = 0.5 * 150 = 75
        // Value = 50 * 1 = 50
        // PnL = 50 - 75 = -25 (but stored as unsigned 0 for now as per code logic which clamps negative to 0?)
        // Code says: pos.pnl = uint256(pnl > 0 ? pnl : 0);
        
        market.settlePosition(marketId, smartAccount);
        
        PredictionMarket.Position memory pos = market.getPosition(marketId, smartAccount);
        assertTrue(pos.settled);
        assertEq(pos.pnl, 0); // Negative PnL clamped to 0
    }
}
