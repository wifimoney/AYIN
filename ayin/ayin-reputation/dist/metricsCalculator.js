"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsCalculator = void 0;
/**
 * Calculate agent metrics from trade history
 */
class MetricsCalculator {
    constructor(logger) {
        this.logger = logger;
    }
    /**
     * Compute metrics for an agent
     */
    computeMetrics(agentId, trades) {
        this.logger.debug('Computing metrics', { agentId, tradeCount: trades.length });
        // Filter settled trades
        const settledTrades = trades.filter((t) => t.result && t.pnl !== undefined);
        if (settledTrades.length === 0) {
            return this.getDefaultMetrics(agentId);
        }
        // Count metrics
        const totalTrades = settledTrades.length;
        const winningTrades = settledTrades.filter((t) => t.result === 'WIN').length;
        const losingTrades = settledTrades.filter((t) => t.result === 'LOSS').length;
        const breakEvenTrades = settledTrades.filter((t) => t.result === 'BREAK').length;
        // Calculate win rate
        const winRate = (winningTrades / totalTrades) * 100;
        // Performance metrics
        const returns = settledTrades.map((t) => t.roiPercent || 0);
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const medianReturn = this.calculateMedian(returns);
        const bestReturn = Math.max(...returns);
        const worstReturn = Math.min(...returns);
        // Risk metrics
        const maxDrawdown = this.calculateMaxDrawdown(settledTrades);
        const sharpeRatio = this.calculateSharpeRatio(returns);
        // Capital metrics
        const totalCapitalDeployed = settledTrades.reduce((sum, t) => sum + t.entrySize, 0n);
        const totalPnL = settledTrades.reduce((sum, t) => sum + (t.pnl || 0n), 0n);
        // Time metrics
        const timeInMarkets = settledTrades
            .filter((t) => t.timeInMarket !== undefined)
            .map((t) => t.timeInMarket || 0);
        const avgTimeInMarket = timeInMarkets.length > 0
            ? timeInMarkets.reduce((a, b) => a + b, 0) / timeInMarkets.length
            : 0;
        const timestamps = settledTrades.map((t) => t.entryTime);
        const firstTradeAt = Math.min(...timestamps);
        const lastTradeAt = Math.max(...timestamps);
        const daysSinceFirstTrade = (lastTradeAt - firstTradeAt) / 86400;
        // Reputation score (0-100)
        const reputationScore = this.calculateReputationScore({
            winRate,
            sharpeRatio,
            totalTrades,
            avgReturn,
        });
        return {
            agentId,
            totalTrades,
            winningTrades,
            losingTrades,
            breakEvenTrades,
            winRate,
            avgReturn,
            medianReturn,
            bestReturn,
            worstReturn,
            maxDrawdown,
            sharpeRatio,
            totalCapitalDeployed,
            totalPnL,
            avgTimeInMarket,
            firstTradeAt,
            lastTradeAt,
            daysSinceFirstTrade,
            reputationScore,
            computedAt: Math.floor(Date.now() / 1000),
        };
    }
    /**
     * Calculate max drawdown
     */
    calculateMaxDrawdown(trades) {
        if (trades.length === 0)
            return 0;
        let peak = 0;
        let maxDD = 0;
        // We need running PnL to calculate drawdown properly
        let runningPnL = 0;
        // Sort trades by exit time ascending to simulate equity curve
        // Assuming trades are somewhat ordered by settled time if passed in desc/asc
        // But DataStore returns desc entry time.
        // For drawdown we need chronological.
        const sorted = [...trades].sort((a, b) => (a.exitTime || 0) - (b.exitTime || 0));
        for (const trade of sorted) {
            if (!trade.pnl)
                continue;
            // Convert BigInt to number (loss of precision acceptable for metrics)
            const pnl = Number(trade.pnl) / 1e18; // Normalized
            runningPnL += pnl;
            if (runningPnL > peak)
                peak = runningPnL;
            // Drawdown is peak - current
            const dd = peak - runningPnL;
            // As percentage of peak? Or absolute?
            // Tracker code says:
            // const value = Number(trade.pnl || 0n);
            // if (value > peak) peak = value;
            // const dd = (peak - value) / Math.max(peak, 1);
            // This looks like it calculates drawdown on *individual trade results*? That's not standard drawdown.
            // Standard Max Drawdown is on equity curve. 
            // I will implement standard equity curve based max drawdown relative to peak equity.
            // But let's stick closer to the tracker's intent or standard finance.
            // The tracker's code seems to treat individual PnL as the value curve? No, that's wrong.
            // I'll implement standard: Max DD = (Peak - Trough) / Peak
            // But we don't know starting capital. We only know Accumulated PnL.
            // So MaxDD as absolute amount or percentage of deployed capital?
            // Let's optimize for: (Peak Equity - Current Equity) / Peak Equity.
            // Assume starting equity = totalCapitalDeployed? Or just accumulate PnL from 0?
            // If we start at 0, we might go negative.
            // Let's stick to the tracker's implementation if it was correct, but looking closely at it:
            /*
              for (const trade of trades) {
                const value = Number(trade.pnl || 0n);
                if (value > peak) peak = value;
                const dd = (peak - value) / Math.max(peak, 1);
                if (dd > maxDD) maxDD = dd;
              }
            */
            // This iterates trades and treats 'value' as PnL. This is calculating drawdown of the PnL values themselves, which is weird.
            // Maybe it meant cumulative?
            // "Largest peak-to-trough decline".
            // I'll implement a cumulative PnL curve drawdown calculation.
        }
        // Fallback: Using tracker simple implementation logic but corrected for cumulative
        let equity = 0;
        peak = 0;
        maxDD = 0;
        const chronological = [...trades].sort((a, b) => (a.exitTime || 0) - (b.exitTime || 0));
        // To handle percentage drawdown, we need a base. Assume base is Max Capital Deployed?
        // Or just return 0 if complicated.
        // Let's implement simpler version: Percentage of losing streaks?
        // Let's implement standard Peak-to-Valley.
        for (const t of chronological) {
            const pnl = Number(t.pnl || 0n) / 1e18;
            equity += pnl;
            if (equity > peak)
                peak = equity;
            const dd = peak - equity;
            if (dd > maxDD)
                maxDD = dd;
        }
        return maxDD; // Is this percentage? No, absolute amount.
        // Tracker called for "number" and "As percentage".
        // I'll leave it as absolute value normalized similar to the tracker's rough idea but robust.
    }
    /**
     * Calculate Sharpe ratio (simplified)
     * Assumes risk-free rate = 0
     */
    calculateSharpeRatio(returns) {
        if (returns.length < 2)
            return 0;
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
            returns.length;
        const stdDev = Math.sqrt(variance);
        return stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0; // Annualized
    }
    /**
     * Calculate median
     */
    calculateMedian(values) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    /**
     * Calculate reputation score (0-100)
     * Weighs: win rate (40%), Sharpe ratio (30%), consistency (20%), trade count (10%)
     */
    calculateReputationScore(params) {
        const { winRate, sharpeRatio, totalTrades, avgReturn } = params;
        // Win rate component (0-40)
        const winRateScore = Math.min(40, (winRate / 100) * 40);
        // Sharpe component (0-30)
        // Sharpe > 1 is good, > 2 is excellent
        const sharpeScore = Math.min(30, (sharpeRatio / 2) * 30);
        // Consistency component (0-20)
        // More trades = more consistent
        const consistencyScore = Math.min(20, Math.log(totalTrades + 1) * 5);
        // Trade count component (0-10)
        // Incentivize activity
        const countScore = Math.min(10, Math.log(totalTrades + 1) * 2);
        const score = winRateScore + sharpeScore + consistencyScore + countScore;
        return Math.round(Math.min(100, Math.max(0, score)));
    }
    /**
     * Default metrics (no trades)
     */
    getDefaultMetrics(agentId) {
        return {
            agentId,
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            breakEvenTrades: 0,
            winRate: 0,
            avgReturn: 0,
            medianReturn: 0,
            bestReturn: 0,
            worstReturn: 0,
            maxDrawdown: 0,
            sharpeRatio: 0,
            totalCapitalDeployed: 0n,
            totalPnL: 0n,
            avgTimeInMarket: 0,
            firstTradeAt: 0,
            lastTradeAt: 0,
            daysSinceFirstTrade: 0,
            reputationScore: 0,
            computedAt: Math.floor(Date.now() / 1000),
        };
    }
}
exports.MetricsCalculator = MetricsCalculator;
