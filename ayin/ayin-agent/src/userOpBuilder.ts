import { ethers } from 'ethers';
import { Logger, TradeDirection } from './types';

// Minimal ABI for PredictionMarket.trade()
const MARKET_ABI = [
    'function trade(uint256 marketId, uint256 agentId, uint256 shareSize, uint8 direction) external returns (uint256)',
];

export class UserOpBuilder {
    private marketAddress: string;
    private marketInterface: ethers.utils.Interface;
    private logger: Logger;

    constructor(marketAddress: string, logger: Logger) {
        this.marketAddress = marketAddress;
        this.marketInterface = new ethers.utils.Interface(MARKET_ABI);
        this.logger = logger;
    }

    /**
     * Build callData for trade execution
     */
    buildTradeCallData(
        marketId: number,
        agentId: number,
        position: bigint,
        direction: TradeDirection
    ): string {
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
    buildTradeTransaction(
        marketId: number,
        agentId: number,
        position: bigint,
        direction: TradeDirection
    ): {
        to: string;
        data: string;
        value: string;
    } {
        const callData = this.buildTradeCallData(
            marketId,
            agentId,
            position,
            direction
        );

        return {
            to: this.marketAddress,
            data: callData,
            value: '0', // No ETH value for this trade
        };
    }
}
