import { StrategyContext, StrategyResult, Logger } from './types';
import { MarketFetcher } from './marketFetcher';
/**
 * Simple rule-based strategy for MVP
 *
 * Rules:
 * 1. If YES probability > 60%, buy YES
 * 2. If NO probability > 60%, buy NO
 * 3. Otherwise, no trade (wait)
 */
export declare class SimpleStrategy {
    private marketFetcher;
    private logger;
    private readonly YES_THRESHOLD;
    private readonly NO_THRESHOLD;
    constructor(marketFetcher: MarketFetcher, logger: Logger);
    /**
     * Run strategy and generate trade signal
     */
    run(context: StrategyContext): Promise<StrategyResult>;
    /**
     * Create a trade signal with position sizing
     */
    private createTradeSignal;
}
//# sourceMappingURL=strategy.d.ts.map