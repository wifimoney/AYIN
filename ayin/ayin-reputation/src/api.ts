import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { Logger, AgentMetrics, AgentProfile } from './types';
import { DataStore } from './dataStore';
import { MetricsCalculator } from './metricsCalculator';

export class ReputationAPI {
    private app: express.Application;
    private dataStore: DataStore;
    private metricsCalculator: MetricsCalculator;
    private logger: Logger;

    constructor(
        dataStore: DataStore,
        metricsCalculator: MetricsCalculator,
        logger: Logger
    ) {
        this.dataStore = dataStore;
        this.metricsCalculator = metricsCalculator;
        this.logger = logger;
        this.app = express();
        this.setupRoutes();
    }

    private setupRoutes(): void {
        // Middleware
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.static(path.join(__dirname, '../public')));

        // Get agent metrics
        this.app.get('/agents/:agentId/metrics', this.getMetrics.bind(this));

        // Get agent profile (metrics + recent trades)
        this.app.get('/agents/:agentId/profile', this.getProfile.bind(this));

        // Get agent trade history
        this.app.get('/agents/:agentId/trades', this.getTrades.bind(this));

        // Get leaderboard
        this.app.get('/leaderboard', this.getLeaderboard.bind(this));

        // Health check
        this.app.get('/health', (req: Request, res: Response) => {
            res.json({ status: 'ok' });
        });
    }

    /**
     * GET /agents/:agentId/metrics
     */
    private getMetrics(req: Request, res: Response): void {
        try {
            const agentId = Number(req.params.agentId);

            // Get trades
            const trades = this.dataStore.getAgentTrades(agentId);

            // Compute metrics
            const metrics = this.metricsCalculator.computeMetrics(agentId, trades);

            // Fix BigInt serialization for JSON
            res.json(this.serialize(metrics));
        } catch (error) {
            this.logger.error('Failed to get metrics', error as Error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /agents/:agentId/profile
     */
    private getProfile(req: Request, res: Response): void {
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

            const profile: AgentProfile = {
                agentId,
                metrics,
                recentTrades,
                monthlyPerformance,
            };

            res.json(this.serialize(profile));
        } catch (error) {
            this.logger.error('Failed to get profile', error as Error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /agents/:agentId/trades
     */
    private getTrades(req: Request, res: Response): void {
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
        } catch (error) {
            this.logger.error('Failed to get trades', error as Error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /leaderboard
     */
    private getLeaderboard(req: Request, res: Response): void {
        try {
            // TODO: Implement leaderboard
            // For now, return empty
            res.json({
                leaderboard: [],
                updatedAt: Math.floor(Date.now() / 1000),
            });
        } catch (error) {
            this.logger.error('Failed to get leaderboard', error as Error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Compute monthly performance
     */
    private computeMonthlyPerformance(
        trades: any[]
    ): { month: string; trades: number; pnl: bigint; winRate: number }[] {
        const byMonth: Record<
            string,
            { trades: any[]; pnl: bigint; wins: number }
        > = {};

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
    start(port: number = 3001): void {
        this.app.listen(port, () => {
            this.logger.info(`Reputation API listening on port ${port}`);
        });
    }

    /**
     * Get Express app (for testing)
     */
    getApp(): express.Application {
        return this.app;
    }

    /**
     * Helper to serialize BigInt
     */
    private serialize(data: any): any {
        return JSON.parse(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        ));
    }
}
