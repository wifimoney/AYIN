import { SimpleStrategy } from '../strategy';
import { MarketFetcher } from '../marketFetcher';
import { createLogger } from '../logger';
import {
    Market,
    Mandate,
    StrategyContext,
    MarketStatus,
    Outcome,
    TradeDirection,
} from '../types';

describe('SimpleStrategy', () => {
    let strategy: SimpleStrategy;
    let mockMarketFetcher: jest.Mocked<MarketFetcher>;
    const logger = createLogger('debug');

    beforeEach(() => {
        mockMarketFetcher = {
            estimateYesProbability: jest.fn(),
        } as any;

        strategy = new SimpleStrategy(mockMarketFetcher, logger);
    });

    it('should generate YES signal when probability > 60%', async () => {
        mockMarketFetcher.estimateYesProbability.mockReturnValue(75);

        const market: Market = {
            marketId: 1,
            question: 'Test?',
            createdAt: Math.floor(Date.now() / 1000),
            resolutionTime: Math.floor(Date.now() / 1000) + 86400,
            status: MarketStatus.OPEN,
            outcome: Outcome.UNRESOLVED,
            yesLiquidity: BigInt(1000e18),
            noLiquidity: BigInt(500e18),
            resolver: '0x1234',
        };

        const mandate: Mandate = {
            agent: '0x5678',
            maxTradeSize: BigInt(100e18),
            allowedMarkets: ['0x1234'],
            expiryTime: Math.floor(Date.now() / 1000) + 86400,
            isActive: true,
            createdAt: Math.floor(Date.now() / 1000),
        };

        const context: StrategyContext = {
            markets: [market],
            position: null,
            mandate,
            agentId: 1,
            timestamp: Math.floor(Date.now() / 1000),
        };

        const result = await strategy.run(context);

        expect(result.signal).not.toBeNull();
        expect(result.signal?.direction).toBe(TradeDirection.YES);
        expect(result.signal?.confidence).toBe(75);
    });

    it('should generate NO signal when probability < 40%', async () => {
        mockMarketFetcher.estimateYesProbability.mockReturnValue(25);

        const market: Market = {
            marketId: 1,
            question: 'Test?',
            createdAt: Math.floor(Date.now() / 1000),
            resolutionTime: Math.floor(Date.now() / 1000) + 86400,
            status: MarketStatus.OPEN,
            outcome: Outcome.UNRESOLVED,
            yesLiquidity: BigInt(500e18),
            noLiquidity: BigInt(1000e18),
            resolver: '0x1234',
        };

        const mandate: Mandate = {
            agent: '0x5678',
            maxTradeSize: BigInt(100e18),
            allowedMarkets: ['0x1234'],
            expiryTime: Math.floor(Date.now() / 1000) + 86400,
            isActive: true,
            createdAt: Math.floor(Date.now() / 1000),
        };

        const context: StrategyContext = {
            markets: [market],
            position: null,
            mandate,
            agentId: 1,
            timestamp: Math.floor(Date.now() / 1000),
        };

        const result = await strategy.run(context);

        expect(result.signal).not.toBeNull();
        expect(result.signal?.direction).toBe(TradeDirection.NO);
        expect(result.signal?.confidence).toBe(75); // 100 - 25
    });

    it('should not generate signal when probability is neutral', async () => {
        mockMarketFetcher.estimateYesProbability.mockReturnValue(50);

        const market: Market = {
            marketId: 1,
            question: 'Test?',
            createdAt: Math.floor(Date.now() / 1000),
            resolutionTime: Math.floor(Date.now() / 1000) + 86400,
            status: MarketStatus.OPEN,
            outcome: Outcome.UNRESOLVED,
            yesLiquidity: BigInt(1000e18),
            noLiquidity: BigInt(1000e18),
            resolver: '0x1234',
        };

        const mandate: Mandate = {
            agent: '0x5678',
            maxTradeSize: BigInt(100e18),
            allowedMarkets: ['0x1234'],
            expiryTime: Math.floor(Date.now() / 1000) + 86400,
            isActive: true,
            createdAt: Math.floor(Date.now() / 1000),
        };

        const context: StrategyContext = {
            markets: [market],
            position: null,
            mandate,
            agentId: 1,
            timestamp: Math.floor(Date.now() / 1000),
        };

        const result = await strategy.run(context);

        expect(result.signal).toBeNull();
    });
});
