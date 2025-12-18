"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserOpBuilder = void 0;
const ethers_1 = require("ethers");
// Minimal ABI for PredictionMarket.trade()
const MARKET_ABI = [
    'function trade(uint256 marketId, uint256 agentId, uint256 shareSize, uint8 direction) external returns (uint256)',
];
class UserOpBuilder {
    constructor(marketAddress, logger) {
        this.marketAddress = marketAddress;
        this.marketInterface = new ethers_1.ethers.utils.Interface(MARKET_ABI);
        this.logger = logger;
    }
    /**
     * Build callData for trade execution
     */
    buildTradeCallData(marketId, agentId, position, direction) {
        this.logger.debug('Building trade callData', {
            marketId,
            agentId,
            position: position.toString(),
            direction,
        });
        const callData = this.marketInterface.encodeFunctionData('trade', [
            marketId,
            agentId,
            position,
            direction,
        ]);
        this.logger.debug('CallData built', { callData });
        return callData;
    }
    /**
     * Build full user operation for Thirdweb
     * Returns the raw transaction data to be wrapped in UserOp
     */
    buildTradeTransaction(marketId, agentId, position, direction) {
        const callData = this.buildTradeCallData(marketId, agentId, position, direction);
        return {
            to: this.marketAddress,
            data: callData,
            value: '0', // No ETH value for this trade
        };
    }
}
exports.UserOpBuilder = UserOpBuilder;
//# sourceMappingURL=userOpBuilder.js.map