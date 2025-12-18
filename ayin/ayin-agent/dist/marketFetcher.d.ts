import { Market, Logger } from './types';
export declare class MarketFetcher {
    private contract;
    private logger;
    constructor(marketAddress: string, rpcUrl: string, logger: Logger);
    /**
     * Fetch market state by ID
     */
    getMarket(marketId: number): Promise<Market | null>;
    /**
     * Check if market is open for trading
     */
    isMarketOpen(marketId: number): Promise<boolean>;
    /**
     * Estimate YES probability based on liquidity ratio
     * Simple model: YES prob = yesLiquidity / (yesLiquidity + noLiquidity)
     */
    estimateYesProbability(market: Market): number;
    private serializeMarket;
}
//# sourceMappingURL=marketFetcher.d.ts.map