import { Market, Logger } from './types';
import { PaymentConfig } from './x402Types';
export declare class MarketFetcher {
    private contract;
    private logger;
    private x402Client;
    constructor(marketAddress: string, rpcUrl: string, x402BaseUrl: string, x402Config: PaymentConfig, logger: Logger);
    /**
     * Fetch market state by ID
     */
    getMarket(marketId: number, includeSignals?: boolean): Promise<Market | null>;
    /**
     * Check if market is open for trading
     */
    isMarketOpen(marketId: number): Promise<boolean>;
    /**
     * Estimate YES probability based on liquidity ratio
     * Simple model: YES prob = yesLiquidity / (yesLiquidity + noLiquidity)
     */
    estimateYesProbability(market: Market): number;
    /**
    * Get data usage logs from x402 client
    */
    getDataUsageLogs(): import("./x402Types").DataUsageLog[];
    /**
    * Get usage summary
    */
    getUsageSummary(): Record<string, {
        count: number;
        totalCost: bigint;
    }>;
    private serializeMarket;
}
//# sourceMappingURL=marketFetcher.d.ts.map