import { Logger, TradeDirection } from './types';
export declare class UserOpBuilder {
    private marketAddress;
    private marketInterface;
    private logger;
    constructor(marketAddress: string, logger: Logger);
    /**
     * Build callData for trade execution
     */
    buildTradeCallData(marketId: number, agentId: number, position: bigint, direction: TradeDirection): string;
    /**
     * Build full user operation for Thirdweb
     * Returns the raw transaction data to be wrapped in UserOp
     */
    buildTradeTransaction(marketId: number, agentId: number, position: bigint, direction: TradeDirection): {
        to: string;
        data: string;
        value: string;
    };
}
//# sourceMappingURL=userOpBuilder.d.ts.map