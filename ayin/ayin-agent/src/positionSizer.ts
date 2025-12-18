import { Mandate, Logger, TradeSignal } from './types';

export class PositionSizer {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    /**
     * Validate and size position according to mandate
     */
    sizePosition(signal: TradeSignal, mandate: Mandate): bigint {
        this.logger.debug('Sizing position', {
            signal: signal.suggestedSize.toString(),
            max: mandate.maxTradeSize.toString(),
        });

        // Enforce mandate max trade size
        const position = signal.suggestedSize > mandate.maxTradeSize
            ? mandate.maxTradeSize
            : signal.suggestedSize;

        this.logger.info('Position sized', {
            marketId: signal.marketId,
            direction: signal.direction,
            position: position.toString(),
            reasoning: signal.reasoning,
        });

        return position;
    }
}
