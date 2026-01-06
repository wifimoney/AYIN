/**
 * RiskEngine Integration Tests
 * Phase 2: Production Hardening
 * 
 * Tests for:
 * - Trade size limits
 * - Rate limiting
 * - Circuit breaker
 * - Daily volume tracking
 */

import { RiskEngine, createRiskEngine, RiskConfig, TradeRequest, TradeRecord } from '../risk/risk-engine';

// Mock logger
const mockLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
};

describe('RiskEngine', () => {
    let riskEngine: RiskEngine;

    const defaultConfig: Partial<RiskConfig> = {
        maxTradeSizeWei: BigInt('1000000000000000000'), // 1 ETH
        maxTradesPerHour: 5,
        maxDrawdownPercent: 10,
        maxDailyVolumeWei: BigInt('10000000000000000000'), // 10 ETH
        maxOpenPositions: 10,
    };

    beforeEach(() => {
        jest.clearAllMocks();
        riskEngine = createRiskEngine(mockLogger, defaultConfig);
    });

    afterEach(() => {
        riskEngine.removeAllListeners();
    });

    describe('Trade Size Limits', () => {
        it('should allow trades within size limit', () => {
            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('500000000000000000'), // 0.5 ETH
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(true);
            expect(result.violations).toHaveLength(0);
        });

        it('should reject trades exceeding size limit', () => {
            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('2000000000000000000'), // 2 ETH
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(false);
            expect(result.violations).toContain('TRADE_SIZE_EXCEEDED');
            expect(result.details.tradeSizeLimit).toBeDefined();
        });

        it('should allow trade exactly at size limit', () => {
            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('1000000000000000000'), // 1 ETH exactly
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(true);
        });
    });

    describe('Rate Limiting', () => {
        it('should allow trades under rate limit', () => {
            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('100000000000000000'), // 0.1 ETH
            };

            // First 5 trades should be allowed
            for (let i = 0; i < 5; i++) {
                riskEngine.recordTrade({
                    id: `trade-${i}`,
                    timestamp: Date.now() - i * 1000,
                    marketId: '0x123',
                    direction: 'YES',
                    size: BigInt('100000000000000000'),
                });
            }

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(false);
            expect(result.violations).toContain('RATE_LIMIT_EXCEEDED');
        });

        it('should allow trades after rate limit window expires', () => {
            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('100000000000000000'),
            };

            // Record trades from 2 hours ago
            for (let i = 0; i < 5; i++) {
                riskEngine.recordTrade({
                    id: `trade-${i}`,
                    timestamp: Date.now() - 2 * 60 * 60 * 1000 - i * 1000, // 2 hours ago
                    marketId: '0x123',
                    direction: 'YES',
                    size: BigInt('100000000000000000'),
                });
            }

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(true);
        });
    });

    describe('Circuit Breaker', () => {
        it('should trigger on drawdown exceeding threshold', () => {
            const circuitBreakerHandler = jest.fn();
            riskEngine.on('circuit-breaker', circuitBreakerHandler);

            // Record initial portfolio value
            riskEngine.recordPortfolioValue(BigInt('10000000000000000000')); // 10 ETH

            // Simulate 15% drop (exceeds 10% threshold)
            riskEngine.recordPortfolioValue(BigInt('8500000000000000000')); // 8.5 ETH

            expect(circuitBreakerHandler).toHaveBeenCalled();
            expect(riskEngine.getStatus().isCircuitBroken).toBe(true);
        });

        it('should block all trades when circuit breaker is triggered', () => {
            // Trigger circuit breaker
            riskEngine.recordPortfolioValue(BigInt('10000000000000000000'));
            riskEngine.recordPortfolioValue(BigInt('8500000000000000000'));

            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('100000000000000000'),
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(false);
            expect(result.violations).toContain('CIRCUIT_BREAKER_TRIGGERED');
        });

        it('should allow trades after circuit breaker reset', () => {
            // Trigger circuit breaker
            riskEngine.recordPortfolioValue(BigInt('10000000000000000000'));
            riskEngine.recordPortfolioValue(BigInt('8500000000000000000'));

            expect(riskEngine.getStatus().isCircuitBroken).toBe(true);

            // Reset circuit breaker
            riskEngine.resetCircuitBreaker();

            expect(riskEngine.getStatus().isCircuitBroken).toBe(false);

            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('100000000000000000'),
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(true);
        });

        it('should not trigger on small drawdowns', () => {
            const circuitBreakerHandler = jest.fn();
            riskEngine.on('circuit-breaker', circuitBreakerHandler);

            // Record initial portfolio value
            riskEngine.recordPortfolioValue(BigInt('10000000000000000000')); // 10 ETH

            // Simulate 5% drop (below 10% threshold)
            riskEngine.recordPortfolioValue(BigInt('9500000000000000000')); // 9.5 ETH

            expect(circuitBreakerHandler).not.toHaveBeenCalled();
            expect(riskEngine.getStatus().isCircuitBroken).toBe(false);
        });
    });

    describe('Daily Volume Tracking', () => {
        it('should reject trades exceeding daily volume limit', () => {
            // Record trades totaling 9 ETH
            for (let i = 0; i < 9; i++) {
                riskEngine.recordTrade({
                    id: `trade-${i}`,
                    timestamp: Date.now() - 60 * 60 * 1000 - i * 1000, // 1 hour ago
                    marketId: '0x123',
                    direction: 'YES',
                    size: BigInt('1000000000000000000'), // 1 ETH each
                });
            }

            // Try to trade 2 ETH (would exceed 10 ETH daily limit)
            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('2000000000000000000'),
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(false);
            expect(result.violations).toContain('DAILY_VOLUME_EXCEEDED');
        });
    });

    describe('Position Limits', () => {
        it('should reject trades when max positions exceeded', () => {
            // Open 10 positions
            for (let i = 0; i < 10; i++) {
                riskEngine.updatePositions(1);
            }

            expect(riskEngine.getStatus().openPositions).toBe(10);

            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('100000000000000000'),
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(false);
            expect(result.violations).toContain('MAX_POSITIONS_EXCEEDED');
        });

        it('should allow trades after closing positions', () => {
            // Open and close positions
            for (let i = 0; i < 10; i++) {
                riskEngine.updatePositions(1);
            }
            riskEngine.updatePositions(-2); // Close 2 positions

            expect(riskEngine.getStatus().openPositions).toBe(8);

            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('100000000000000000'),
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(true);
        });
    });

    describe('Market Allowlist', () => {
        it('should reject trades on non-allowed markets', () => {
            const restrictedEngine = createRiskEngine(mockLogger, {
                ...defaultConfig,
                allowedMarkets: ['0xabc', '0xdef'],
            });

            const request: TradeRequest = {
                marketId: '0x123', // Not in allowlist
                direction: 'YES',
                size: BigInt('100000000000000000'),
            };

            const result = restrictedEngine.checkTrade(request);

            expect(result.allowed).toBe(false);
            expect(result.violations).toContain('MARKET_NOT_ALLOWED');
        });

        it('should allow trades on allowed markets', () => {
            const restrictedEngine = createRiskEngine(mockLogger, {
                ...defaultConfig,
                allowedMarkets: ['0xabc', '0x123'],
            });

            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('100000000000000000'),
            };

            const result = restrictedEngine.checkTrade(request);

            expect(result.allowed).toBe(true);
        });
    });

    describe('Configuration Updates', () => {
        it('should apply config updates', () => {
            // Initial config allows 1 ETH max
            let request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('1500000000000000000'), // 1.5 ETH
            };

            let result = riskEngine.checkTrade(request);
            expect(result.allowed).toBe(false);

            // Update config to allow 2 ETH
            riskEngine.updateConfig({
                maxTradeSizeWei: BigInt('2000000000000000000'),
            });

            result = riskEngine.checkTrade(request);
            expect(result.allowed).toBe(true);
        });
    });

    describe('Status Reporting', () => {
        it('should report accurate status', () => {
            // Record some trades
            riskEngine.recordTrade({
                id: 'trade-1',
                timestamp: Date.now(),
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('500000000000000000'),
            });

            riskEngine.updatePositions(2);
            riskEngine.recordPortfolioValue(BigInt('10000000000000000000'));

            const status = riskEngine.getStatus();

            expect(status.isCircuitBroken).toBe(false);
            expect(status.tradesInLastHour).toBe(1);
            expect(status.dailyVolumeWei).toBe('500000000000000000');
            expect(status.openPositions).toBe(2);
            expect(status.currentDrawdownPercent).toBe(0);
        });
    });

    describe('Multiple Violations', () => {
        it('should report all violations at once', () => {
            // Trigger circuit breaker
            riskEngine.recordPortfolioValue(BigInt('10000000000000000000'));
            riskEngine.recordPortfolioValue(BigInt('8500000000000000000'));

            // Max out positions
            for (let i = 0; i < 10; i++) {
                riskEngine.updatePositions(1);
            }

            // Huge trade request
            const request: TradeRequest = {
                marketId: '0x123',
                direction: 'YES',
                size: BigInt('100000000000000000000'), // 100 ETH
            };

            const result = riskEngine.checkTrade(request);

            expect(result.allowed).toBe(false);
            expect(result.violations.length).toBeGreaterThan(1);
            expect(result.violations).toContain('CIRCUIT_BREAKER_TRIGGERED');
            expect(result.violations).toContain('TRADE_SIZE_EXCEEDED');
            expect(result.violations).toContain('MAX_POSITIONS_EXCEEDED');
            expect(result.violations).toContain('DAILY_VOLUME_EXCEEDED');
        });
    });
});
