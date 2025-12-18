import { ethers } from 'ethers';
import { Market, Logger } from './types';
import { X402Client } from './x402Client';
import { PaymentConfig } from './x402Types';

// Minimal ABI for PredictionMarket
const MARKET_ABI = [
    'function getMarket(uint256 marketId) external view returns (tuple(uint256 marketId, string question, uint256 createdAt, uint256 resolutionTime, uint8 status, uint8 outcome, uint256 yesLiquidity, uint256 noLiquidity, address resolver))',
    'function isMarketOpen(uint256 marketId) external view returns (bool)',
];

export class MarketFetcher {
    private contract: ethers.Contract;
    private logger: Logger;
    private x402Client: X402Client;

    constructor(
        marketAddress: string,
        rpcUrl: string,
        x402BaseUrl: string,
        x402Config: PaymentConfig,
        logger: Logger
    ) {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers.Contract(marketAddress, MARKET_ABI, provider);
        this.logger = logger;
        this.x402Client = new X402Client(x402BaseUrl, x402Config, logger);
    }

    /**
     * Fetch market state by ID
     */
    async getMarket(marketId: number, includeSignals = false): Promise<Market | null> {
        try {
            this.logger.debug('Fetching market', { marketId, includeSignals });

            const [
                id,
                question,
                createdAt,
                resolutionTime,
                status,
                outcome,
                yesLiquidity,
                noLiquidity,
                resolver,
            ] = await this.contract.getMarket(marketId);

            // Get premium data via x402 (if requested)
            let yesProbability = 50; // Default
            if (includeSignals) {
                try {
                    const response = await this.x402Client.fetchData<any>({
                        endpoint: `/market/${marketId}/data`,
                    });
                    // Assuming response data has probability info.
                    // The server returns: { yesProbability: 67, ... }
                    if (response.data && typeof response.data.yesProbability === 'number') {
                        yesProbability = response.data.yesProbability;
                    }
                } catch (error) {
                    this.logger.warn('Could not fetch premium market data', error as any);
                }
            } else {
                // Fallback to estimation locally if no premium fetch
                const total = BigInt(yesLiquidity.toString()) + BigInt(noLiquidity.toString());
                if (total > BigInt(0)) {
                    yesProbability = Number((BigInt(yesLiquidity.toString()) * BigInt(100)) / total);
                    yesProbability = Math.round(yesProbability);
                }
            }

            const statusEnum = ['OPEN', 'RESOLVED', 'SETTLED'][status] || 'UNKNOWN';

            const market: Market = {
                marketId: Number(id),
                question,
                createdAt: Number(createdAt),
                resolutionTime: Number(resolutionTime),
                status: statusEnum as any,
                outcome: Number(outcome),
                yesLiquidity: BigInt(yesLiquidity.toString()),
                noLiquidity: BigInt(noLiquidity.toString()),
                resolver,
            };

            this.logger.debug('Market fetched', { market: this.serializeMarket(market) });
            return market;
        } catch (error) {
            this.logger.error('Failed to fetch market', error as Error);
            return null;
        }
    }

    /**
     * Check if market is open for trading
     */
    async isMarketOpen(marketId: number): Promise<boolean> {
        try {
            return await this.contract.isMarketOpen(marketId);
        } catch (error) {
            this.logger.error('Failed to check market status', error as Error);
            return false;
        }
    }

    /**
     * Estimate YES probability based on liquidity ratio
     * Simple model: YES prob = yesLiquidity / (yesLiquidity + noLiquidity)
     */
    estimateYesProbability(market: Market): number {
        // If we fetched premium already, we might want to trust that?
        // But for now keeping this logic separate or purely calculative.
        const total = market.yesLiquidity + market.noLiquidity;
        if (total === BigInt(0)) return 50; // No trading yet, assume 50/50

        const yesProb = Number((market.yesLiquidity * BigInt(100)) / total);
        return Math.round(yesProb);
    }

    /**
    * Get data usage logs from x402 client
    */
    getDataUsageLogs() {
        return this.x402Client.getUsageLogs();
    }

    /**
    * Get usage summary
    */
    getUsageSummary() {
        return this.x402Client.getUsageSummary();
    }

    private serializeMarket(market: Market): any {
        return {
            ...market,
            yesLiquidity: market.yesLiquidity.toString(),
            noLiquidity: market.noLiquidity.toString()
        };
    }
}
