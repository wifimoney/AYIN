import {
    StrategyContext,
    StrategyResult,
    TradeSignal,
    TradeDirection,
    Logger,
} from './types';
import { MarketFetcher } from './marketFetcher';

/**
 * Simple rule-based strategy for MVP
 *
 * Rules:
 * 1. If YES probability > 60%, buy YES
 * 2. If NO probability > 60%, buy NO
 * 3. Otherwise, no trade (wait)
 */
export class SimpleStrategy {
    private marketFetcher: MarketFetcher;
    private logger: Logger;
    private readonly YES_THRESHOLD = 60;  // 60% confidence to trade YES
    private readonly NO_THRESHOLD = 40;   // 40% or less to trade NO

    constructor(marketFetcher: MarketFetcher, logger: Logger) {
        this.marketFetcher = marketFetcher;
        this.logger = logger;
    }

    /**
     * Run strategy and generate trade signal
     */
    async run(context: StrategyContext): Promise<StrategyResult> {
        this.logger.info('Running strategy', { agentId: context.agentId });

        // Validate mandate is active
        if (!context.mandate.isActive) {
            this.logger.warn('Mandate is inactive, skipping trade', {
                agentId: context.agentId,
            });
            return {
                signal: null,
                nextCheckTime: context.timestamp + 60, // Recheck in 1 min
            };
        }

        // Find best market to trade
        for (const market of context.markets) {
            if (market.status !== 'OPEN') continue;

            const yesProbability = this.marketFetcher.estimateYesProbability(market);
            this.logger.debug('Market analysis', {
                marketId: market.marketId,
                yesProbability,
            });

            // Rule 1: YES signal
            if (yesProbability > this.YES_THRESHOLD) {
                return {
                    signal: this.createTradeSignal(
                        market.marketId,
                        TradeDirection.YES,
                        yesProbability,
                        context
                    ),
                    nextCheckTime: context.timestamp + context.mandate.expiryTime,
                };
            }

            // Rule 2: NO signal
            if (yesProbability < this.NO_THRESHOLD) {
                return {
                    signal: this.createTradeSignal(
                        market.marketId,
                        TradeDirection.NO,
                        100 - yesProbability,
                        context
                    ),
                    nextCheckTime: context.timestamp + context.mandate.expiryTime,
                };
            }
        }

        // No signal
        this.logger.info('No trade signal generated');
        return {
            signal: null,
            nextCheckTime: context.timestamp + 300, // Recheck in 5 min
        };
    }

    /**
     * Create a trade signal with position sizing
     */
    private createTradeSignal(
        marketId: number,
        direction: TradeDirection,
        confidence: number,
        context: StrategyContext
    ): TradeSignal {
        // Position sizing: smaller positions for lower confidence
        // confidence 60 → 50% of max
        // confidence 80 → 100% of max
        const sizeMultiplier = Math.max(0.5, (confidence - 50) / 30);
        const suggestedSize = (context.mandate.maxTradeSize * BigInt(Math.floor(sizeMultiplier * 100))) / BigInt(100);

        return {
            marketId,
            direction,
            confidence: Math.round(confidence),
            reasoning: direction === TradeDirection.YES
                ? `YES probability ${confidence.toFixed(1)}% > ${this.YES_THRESHOLD}% threshold`
                : `NO probability ${(100 - confidence).toFixed(1)}% > ${100 - this.NO_THRESHOLD}% threshold`,
            suggestedSize,
        };
    }
}
