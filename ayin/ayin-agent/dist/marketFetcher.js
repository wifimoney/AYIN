"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketFetcher = void 0;
const ethers_1 = require("ethers");
// Minimal ABI for PredictionMarket
const MARKET_ABI = [
    'function getMarket(uint256 marketId) external view returns (tuple(uint256 marketId, string question, uint256 createdAt, uint256 resolutionTime, uint8 status, uint8 outcome, uint256 yesLiquidity, uint256 noLiquidity, address resolver))',
    'function isMarketOpen(uint256 marketId) external view returns (bool)',
];
class MarketFetcher {
    constructor(marketAddress, rpcUrl, logger) {
        const provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers_1.ethers.Contract(marketAddress, MARKET_ABI, provider);
        this.logger = logger;
    }
    /**
     * Fetch market state by ID
     */
    async getMarket(marketId) {
        try {
            this.logger.debug('Fetching market', { marketId });
            const [id, question, createdAt, resolutionTime, status, outcome, yesLiquidity, noLiquidity, resolver,] = await this.contract.getMarket(marketId);
            const statusEnum = ['OPEN', 'RESOLVED', 'SETTLED'][status] || 'UNKNOWN';
            const market = {
                marketId: Number(id),
                question,
                createdAt: Number(createdAt),
                resolutionTime: Number(resolutionTime),
                status: statusEnum,
                outcome: Number(outcome),
                yesLiquidity: BigInt(yesLiquidity.toString()),
                noLiquidity: BigInt(noLiquidity.toString()),
                resolver,
            };
            this.logger.debug('Market fetched', { market: this.serializeMarket(market) });
            return market;
        }
        catch (error) {
            this.logger.error('Failed to fetch market', error);
            return null;
        }
    }
    /**
     * Check if market is open for trading
     */
    async isMarketOpen(marketId) {
        try {
            return await this.contract.isMarketOpen(marketId);
        }
        catch (error) {
            this.logger.error('Failed to check market status', error);
            return false;
        }
    }
    /**
     * Estimate YES probability based on liquidity ratio
     * Simple model: YES prob = yesLiquidity / (yesLiquidity + noLiquidity)
     */
    estimateYesProbability(market) {
        const total = market.yesLiquidity + market.noLiquidity;
        if (total === BigInt(0))
            return 50; // No trading yet, assume 50/50
        const yesProb = Number((market.yesLiquidity * BigInt(100)) / total);
        return Math.round(yesProb);
    }
    serializeMarket(market) {
        return {
            ...market,
            yesLiquidity: market.yesLiquidity.toString(),
            noLiquidity: market.noLiquidity.toString()
        };
    }
}
exports.MarketFetcher = MarketFetcher;
//# sourceMappingURL=marketFetcher.js.map