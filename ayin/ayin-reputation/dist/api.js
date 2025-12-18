"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReputationAPI = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
class ReputationAPI {
    constructor(dataStore, metricsCalculator, logger) {
        this.dataStore = dataStore;
        this.metricsCalculator = metricsCalculator;
        this.logger = logger;
        this.app = (0, express_1.default)();
        this.setupRoutes();
    }
    setupRoutes() {
        // Middleware
        this.app.use((0, cors_1.default)());
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.static(path_1.default.join(__dirname, '../public')));
        // Get agent metrics
        this.app.get('/agents/:agentId/metrics', this.getMetrics.bind(this));
        // Get agent profile (metrics + recent trades)
        this.app.get('/agents/:agentId/profile', this.getProfile.bind(this));
        // Get agent trade history
        this.app.get('/agents/:agentId/trades', this.getTrades.bind(this));
        // Get leaderboard
        this.app.get('/leaderboard', this.getLeaderboard.bind(this));
        // Health check
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
    }
    /**
     * GET /agents/:agentId/metrics
     */
    getMetrics(req, res) {
        try {
            const agentId = Number(req.params.agentId);
            // Get trades
            const trades = this.dataStore.getAgentTrades(agentId);
            // Compute metrics
            const metrics = this.metricsCalculator.computeMetrics(agentId, trades);
            // Fix BigInt serialization for JSON
            res.json(this.serialize(metrics));
        }
        catch (error) {
            this.logger.error('Failed to get metrics', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * GET /agents/:agentId/profile
     */
    getProfile(req, res) {
        try {
            const agentId = Number(req.params.agentId);
            // Get trades
            const trades = this.dataStore.getAgentTrades(agentId);
            // Compute metrics
            const metrics = this.metricsCalculator.computeMetrics(agentId, trades);
            // Get recent trades (last 10)
            const recentTrades = trades.slice(0, 10);
            // Compute monthly performance
            const monthlyPerformance = this.computeMonthlyPerformance(trades);
            const profile = {
                agentId,
                metrics,
                recentTrades,
                monthlyPerformance,
            };
            res.json(this.serialize(profile));
        }
        catch (error) {
            this.logger.error('Failed to get profile', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * GET /agents/:agentId/trades
     */
    getTrades(req, res) {
        try {
            const agentId = Number(req.params.agentId);
            const limit = Math.min(Number(req.query.limit || 50), 500);
            const offset = Number(req.query.offset || 0);
            const trades = this.dataStore.getAgentTrades(agentId);
            const paginated = trades.slice(offset, offset + limit);
            res.json(this.serialize({
                trades: paginated,
                total: trades.length,
                offset,
                limit,
            }));
        }
        catch (error) {
            this.logger.error('Failed to get trades', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * GET /leaderboard
     */
    getLeaderboard(req, res) {
        try {
            // TODO: Implement leaderboard
            // For now, return empty
            res.json({
                leaderboard: [],
                updatedAt: Math.floor(Date.now() / 1000),
            });
        }
        catch (error) {
            this.logger.error('Failed to get leaderboard', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Compute monthly performance
     */
    computeMonthlyPerformance(trades) {
        const byMonth = {};
        for (const trade of trades) {
            const date = new Date(trade.entryTime * 1000);
            const month = date.toISOString().slice(0, 7); // YYYY-MM
            if (!byMonth[month]) {
                byMonth[month] = { trades: [], pnl: BigInt(0), wins: 0 };
            }
            byMonth[month].trades.push(trade);
            if (trade.pnl) {
                byMonth[month].pnl = BigInt(byMonth[month].pnl) + BigInt(trade.pnl);
            }
            if (trade.result === 'WIN') {
                byMonth[month].wins++;
            }
        }
        return Object.entries(byMonth)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([month, data]) => ({
            month,
            trades: data.trades.length,
            pnl: data.pnl,
            winRate: (data.wins / data.trades.length) * 100,
        }));
    }
    /**
     * Start API server
     */
    start(port = 3001) {
        this.app.listen(port, () => {
            this.logger.info(`Reputation API listening on port ${port}`);
        });
    }
    /**
     * Get Express app (for testing)
     */
    getApp() {
        return this.app;
    }
    /**
     * Helper to serialize BigInt
     */
    serialize(data) {
        return JSON.parse(JSON.stringify(data, (key, value) => typeof value === 'bigint' ? value.toString() : value));
    }
}
exports.ReputationAPI = ReputationAPI;
