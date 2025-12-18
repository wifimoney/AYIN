import { Mandate, Logger, TradeSignal } from './types';
export declare class PositionSizer {
    private logger;
    constructor(logger: Logger);
    /**
     * Validate and size position according to mandate
     */
    sizePosition(signal: TradeSignal, mandate: Mandate): bigint;
}
//# sourceMappingURL=positionSizer.d.ts.map