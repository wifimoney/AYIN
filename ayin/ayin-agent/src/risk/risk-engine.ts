/**
 * RiskEngine
 * Phase 2.2: Agent Guardrails
 * 
 * Enforces hard-coded risk limits:
 * - Max trade size (1 ETH)
 * - Max trades per hour (5)
 * - Circuit breaker (10% portfolio drop in 1 hour)
 * 
 * This is a FAIL-LOUD system - if any limit is breached, the trade is rejected
 * and the agent may be killed.
 */

import { Logger } from '../types';
import { EventEmitter } from 'events';

// ============================================
// CONFIGURATION
// ============================================

export interface RiskConfig {
    // Trade limits
    maxTradeSizeWei: bigint;        // Max size per trade (default: 1 ETH)
    maxTradesPerHour: number;       // Max trades in sliding window (default: 5)

    // Circuit breaker
    maxDrawdownPercent: number;     // Max portfolio drop before kill (default: 10)
    drawdownWindowMs: number;       // Time window for drawdown calculation (default: 1 hour)

    // Global limits
    maxDailyVolumeWei: bigint;      // Max total volume per day
    maxOpenPositions: number;       // Max concurrent open positions

    // Allowlists
    allowedMarkets: string[];       // Only trade on these markets
    allowedTokens: string[];        // Only trade these tokens
}

const DEFAULT_CONFIG: RiskConfig = {
    maxTradeSizeWei: BigInt('1000000000000000000'), // 1 ETH in wei
    maxTradesPerHour: 5,
    maxDrawdownPercent: 10,
    drawdownWindowMs: 60 * 60 * 1000, // 1 hour
    maxDailyVolumeWei: BigInt('10000000000000000000'), // 10 ETH
    maxOpenPositions: 10,
    allowedMarkets: [],
    allowedTokens: [],
};

// ============================================
// TYPES
// ============================================

export interface TradeRequest {
    marketId: string;
    direction: 'YES' | 'NO';
    size: bigint;           // Trade size in wei
    tokenAddress?: string;
}

export interface TradeRecord {
    id: string;
    timestamp: number;
    marketId: string;
    direction: 'YES' | 'NO';
    size: bigint;
    executionPrice?: number;
}

export interface PortfolioSnapshot {
    timestamp: number;
    totalValueWei: bigint;
    openPositions: number;
}

export type RiskViolation =
    | 'TRADE_SIZE_EXCEEDED'
    | 'RATE_LIMIT_EXCEEDED'
    | 'CIRCUIT_BREAKER_TRIGGERED'
    | 'DAILY_VOLUME_EXCEEDED'
    | 'MAX_POSITIONS_EXCEEDED'
    | 'MARKET_NOT_ALLOWED'
    | 'TOKEN_NOT_ALLOWED';

export interface RiskCheckResult {
    allowed: boolean;
    violations: RiskViolation[];
    details: Record<string, unknown>;
}

// ============================================
// RISK ENGINE
// ============================================

export class RiskEngine extends EventEmitter {
    private config: RiskConfig;
    private logger: Logger;

    // State
    private tradeHistory: TradeRecord[] = [];
    private portfolioHistory: PortfolioSnapshot[] = [];
    private dailyVolume: bigint = BigInt(0);
    private dailyVolumeResetTime: number = 0;
    private openPositions: number = 0;
    private isCircuitBroken: boolean = false;
    private initialPortfolioValue: bigint = BigInt(0);

    constructor(logger: Logger, config: Partial<RiskConfig> = {}) {
        super();
        this.logger = logger;
        this.config = { ...DEFAULT_CONFIG, ...config };

        // Reset daily volume at midnight
        this.dailyVolumeResetTime = this.getMidnightTimestamp();

        this.logger.info('RiskEngine initialized', {
            maxTradeSizeWei: this.config.maxTradeSizeWei.toString(),
            maxTradesPerHour: this.config.maxTradesPerHour,
            maxDrawdownPercent: this.config.maxDrawdownPercent,
        });
    }

    // ============================================
    // MAIN CHECK
    // ============================================

    /**
     * Check if a trade is allowed by all risk policies
     * FAIL-LOUD: Returns detailed rejection reasons
     */
    checkTrade(request: TradeRequest): RiskCheckResult {
        const violations: RiskViolation[] = [];
        const details: Record<string, unknown> = {};

        // 1. Circuit breaker check (most critical)
        if (this.isCircuitBroken) {
            violations.push('CIRCUIT_BREAKER_TRIGGERED');
            details.circuitBreaker = 'Agent is halted due to drawdown limit';
        }

        // 2. Trade size check
        if (request.size > this.config.maxTradeSizeWei) {
            violations.push('TRADE_SIZE_EXCEEDED');
            details.tradeSizeLimit = {
                requested: request.size.toString(),
                limit: this.config.maxTradeSizeWei.toString(),
            };
        }

        // 3. Rate limit check (trades per hour)
        const recentTrades = this.getTradesInWindow(60 * 60 * 1000);
        if (recentTrades.length >= this.config.maxTradesPerHour) {
            violations.push('RATE_LIMIT_EXCEEDED');
            details.rateLimit = {
                tradesInLastHour: recentTrades.length,
                limit: this.config.maxTradesPerHour,
                oldestTradeAge: Date.now() - recentTrades[0].timestamp,
            };
        }

        // 4. Daily volume check
        this.checkDailyVolumeReset();
        if (this.dailyVolume + request.size > this.config.maxDailyVolumeWei) {
            violations.push('DAILY_VOLUME_EXCEEDED');
            details.dailyVolume = {
                current: this.dailyVolume.toString(),
                requested: request.size.toString(),
                limit: this.config.maxDailyVolumeWei.toString(),
            };
        }

        // 5. Open positions check
        if (this.openPositions >= this.config.maxOpenPositions) {
            violations.push('MAX_POSITIONS_EXCEEDED');
            details.positions = {
                current: this.openPositions,
                limit: this.config.maxOpenPositions,
            };
        }

        // 6. Market allowlist check
        if (this.config.allowedMarkets.length > 0 &&
            !this.config.allowedMarkets.includes(request.marketId)) {
            violations.push('MARKET_NOT_ALLOWED');
            details.market = {
                requested: request.marketId,
                allowed: this.config.allowedMarkets,
            };
        }

        // 7. Token allowlist check
        if (request.tokenAddress &&
            this.config.allowedTokens.length > 0 &&
            !this.config.allowedTokens.includes(request.tokenAddress)) {
            violations.push('TOKEN_NOT_ALLOWED');
            details.token = {
                requested: request.tokenAddress,
                allowed: this.config.allowedTokens,
            };
        }

        const allowed = violations.length === 0;

        if (!allowed) {
            this.logger.warn('Trade rejected by RiskEngine', {
                violations,
                details,
                request: {
                    marketId: request.marketId,
                    size: request.size.toString(),
                },
            });
        }

        return { allowed, violations, details };
    }

    // ============================================
    // TRADE RECORDING
    // ============================================

    /**
     * Record a completed trade for risk tracking
     */
    recordTrade(trade: TradeRecord): void {
        this.tradeHistory.push(trade);
        this.dailyVolume += trade.size;

        // Keep only last 24 hours of trades
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        this.tradeHistory = this.tradeHistory.filter(t => t.timestamp > cutoff);

        this.logger.info('Trade recorded', {
            id: trade.id,
            marketId: trade.marketId,
            size: trade.size.toString(),
            tradesInLastHour: this.getTradesInWindow(60 * 60 * 1000).length,
        });
    }

    /**
     * Update open position count
     */
    updatePositions(delta: number): void {
        this.openPositions = Math.max(0, this.openPositions + delta);
        this.logger.debug('Positions updated', { openPositions: this.openPositions });
    }

    // ============================================
    // PORTFOLIO & CIRCUIT BREAKER
    // ============================================

    /**
     * Record portfolio value for drawdown calculation
     */
    recordPortfolioValue(totalValueWei: bigint): void {
        const now = Date.now();

        // Set initial value if not set
        if (this.initialPortfolioValue === BigInt(0)) {
            this.initialPortfolioValue = totalValueWei;
        }

        this.portfolioHistory.push({
            timestamp: now,
            totalValueWei,
            openPositions: this.openPositions,
        });

        // Keep only snapshots within window
        const cutoff = now - this.config.drawdownWindowMs;
        this.portfolioHistory = this.portfolioHistory.filter(s => s.timestamp > cutoff);

        // Check for circuit breaker
        this.checkCircuitBreaker(totalValueWei);
    }

    /**
     * Check if circuit breaker should trigger
     */
    private checkCircuitBreaker(currentValue: bigint): void {
        if (this.isCircuitBroken) return;
        if (this.portfolioHistory.length < 2) return;

        // Get highest value in window
        const highWaterMark = this.portfolioHistory.reduce(
            (max, s) => s.totalValueWei > max ? s.totalValueWei : max,
            BigInt(0)
        );

        if (highWaterMark === BigInt(0)) return;

        // Calculate drawdown percentage
        const drawdownBps = Number((highWaterMark - currentValue) * BigInt(10000) / highWaterMark);
        const drawdownPercent = drawdownBps / 100;

        this.logger.debug('Drawdown check', {
            highWaterMark: highWaterMark.toString(),
            currentValue: currentValue.toString(),
            drawdownPercent: drawdownPercent.toFixed(2),
            threshold: this.config.maxDrawdownPercent,
        });

        if (drawdownPercent >= this.config.maxDrawdownPercent) {
            this.triggerCircuitBreaker(drawdownPercent, highWaterMark, currentValue);
        }
    }

    /**
     * Trigger circuit breaker - KILLS the agent
     */
    private triggerCircuitBreaker(
        drawdownPercent: number,
        highWaterMark: bigint,
        currentValue: bigint
    ): void {
        this.isCircuitBroken = true;

        const event = {
            reason: 'DRAWDOWN_LIMIT_EXCEEDED',
            drawdownPercent,
            highWaterMark: highWaterMark.toString(),
            currentValue: currentValue.toString(),
            threshold: this.config.maxDrawdownPercent,
            timestamp: Date.now(),
        };

        this.logger.error('🚨 CIRCUIT BREAKER TRIGGERED - Agent halted', event);

        // Emit event for external handlers
        this.emit('circuit-breaker', event);

        // In production: immediately exit process
        // process.exit(1);
    }

    /**
     * Manually reset circuit breaker (admin only)
     */
    resetCircuitBreaker(): void {
        if (!this.isCircuitBroken) return;

        this.isCircuitBroken = false;
        this.portfolioHistory = [];
        this.initialPortfolioValue = BigInt(0);

        this.logger.warn('Circuit breaker reset manually');
        this.emit('circuit-breaker-reset');
    }

    // ============================================
    // HELPERS
    // ============================================

    private getTradesInWindow(windowMs: number): TradeRecord[] {
        const cutoff = Date.now() - windowMs;
        return this.tradeHistory.filter(t => t.timestamp > cutoff);
    }

    private checkDailyVolumeReset(): void {
        const currentMidnight = this.getMidnightTimestamp();
        if (currentMidnight > this.dailyVolumeResetTime) {
            this.dailyVolume = BigInt(0);
            this.dailyVolumeResetTime = currentMidnight;
            this.logger.info('Daily volume reset');
        }
    }

    private getMidnightTimestamp(): number {
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return now.getTime();
    }

    // ============================================
    // STATE GETTERS
    // ============================================

    getStatus(): {
        isCircuitBroken: boolean;
        tradesInLastHour: number;
        dailyVolumeWei: string;
        openPositions: number;
        currentDrawdownPercent: number;
    } {
        const recentTrades = this.getTradesInWindow(60 * 60 * 1000);

        let currentDrawdownPercent = 0;
        if (this.portfolioHistory.length > 1) {
            const highWaterMark = this.portfolioHistory.reduce(
                (max, s) => s.totalValueWei > max ? s.totalValueWei : max,
                BigInt(0)
            );
            const currentValue = this.portfolioHistory[this.portfolioHistory.length - 1]?.totalValueWei || BigInt(0);
            if (highWaterMark > BigInt(0)) {
                currentDrawdownPercent = Number((highWaterMark - currentValue) * BigInt(10000) / highWaterMark) / 100;
            }
        }

        return {
            isCircuitBroken: this.isCircuitBroken,
            tradesInLastHour: recentTrades.length,
            dailyVolumeWei: this.dailyVolume.toString(),
            openPositions: this.openPositions,
            currentDrawdownPercent,
        };
    }

    getConfig(): RiskConfig {
        return { ...this.config };
    }

    /**
     * Update configuration (for dynamic policy updates)
     */
    updateConfig(updates: Partial<RiskConfig>): void {
        this.config = { ...this.config, ...updates };
        this.logger.info('RiskEngine config updated', {
            maxTradeSizeWei: this.config.maxTradeSizeWei.toString(),
            maxTradesPerHour: this.config.maxTradesPerHour,
            maxDrawdownPercent: this.config.maxDrawdownPercent,
        });
    }
}

/**
 * Create a default RiskEngine instance
 */
export function createRiskEngine(logger: Logger, config?: Partial<RiskConfig>): RiskEngine {
    return new RiskEngine(logger, config);
}
