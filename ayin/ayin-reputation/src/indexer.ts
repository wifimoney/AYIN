import {
    Logger,
    TradeEvent,
    PnLEvent,
    AgentTrade,
} from './types';
import { EventListener } from './eventListener';
import { DataStore } from './dataStore';
import { MetricsCalculator } from './metricsCalculator';

/**
 * Main indexer loop: listen to events, process, store metrics
 */
export class ReputationIndexer {
    private eventListener: EventListener;
    private dataStore: DataStore;
    private metricsCalculator: MetricsCalculator;
    private logger: Logger;
    private isRunning = false;
    private scanInterval = 10000; // 10 seconds

    constructor(
        eventListener: EventListener,
        dataStore: DataStore,
        metricsCalculator: MetricsCalculator,
        logger: Logger
    ) {
        this.eventListener = eventListener;
        this.dataStore = dataStore;
        this.metricsCalculator = metricsCalculator;
        this.logger = logger;
    }

    /**
     * Start indexing
     */
    async start(): Promise<void> {
        this.isRunning = true;
        this.logger.info('Starting reputation indexer');

        // Subscribe to live events
        const unsubscribeTrades = this.eventListener.subscribeToTrades(
            (event) => this.handleTradeEvent(event)
        );

        const unsubscribePnL = this.eventListener.subscribeToPnL((event) =>
            this.handlePnLEvent(event)
        );

        // Periodic scanning
        while (this.isRunning) {
            try {
                await this.scan();
                await this.sleep(this.scanInterval);
            } catch (error) {
                this.logger.error('Indexer error', error as Error);
                await this.sleep(60000); // Wait 1 min on error
            }
        }

        // Cleanup
        unsubscribeTrades();
        unsubscribePnL();
    }

    /**
     * Stop indexing
     */
    stop(): void {
        this.logger.info('Stopping reputation indexer');
        this.isRunning = false;
    }

    /**
     * Scan for new events
     */
    private async scan(): Promise<void> {
        const lastBlock = this.eventListener.getLastScannedBlock();
        const currentBlock = await this.eventListener.getCurrentBlock();

        if (lastBlock >= currentBlock) {
            return; // No new blocks
        }

        // Scan in chunks (e.g., 100 blocks at a time)
        const chunkSize = 100;
        let fromBlock = lastBlock + 1;

        while (fromBlock <= currentBlock) {
            const toBlock = Math.min(fromBlock + chunkSize - 1, currentBlock);

            // Scan trades
            const trades = await this.eventListener.scanTradeEvents(
                fromBlock,
                toBlock
            );
            for (const trade of trades) {
                this.handleTradeEvent(trade);
            }

            // Scan PnL
            const pnlEvents = await this.eventListener.scanPnLEvents(
                fromBlock,
                toBlock
            );
            for (const pnl of pnlEvents) {
                this.handlePnLEvent(pnl);
            }

            fromBlock = toBlock + 1;
        }

        this.logger.debug('Scan complete', { blocks: currentBlock - lastBlock });
    }

    /**
     * Handle TradeExecuted event
     */
    private handleTradeEvent(event: TradeEvent): void {
        this.logger.debug('Processing trade event', {
            agentId: event.agentId,
            marketId: event.marketId,
        });

        // Store event
        this.dataStore.storeTradeEvent(event);

        // Create agent trade record
        const agentTrade: AgentTrade = {
            id: event.id,
            agentId: event.agentId,
            marketId: event.marketId,
            direction: event.direction,
            entrySize: event.shareSize,
            entryPrice: event.price / 10000, // Convert from basis points to decimal
            entryTime: event.timestamp,
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
        };

        this.dataStore.storeAgentTrade(agentTrade);

        // Recompute metrics for this agent
        this.recomputeMetrics(event.agentId);
    }

    /**
     * Handle PnLAttributed event
     */
    private handlePnLEvent(event: PnLEvent): void {
        this.logger.debug('Processing PnL event', {
            agentId: event.agentId,
            marketId: event.marketId,
        });

        // Store event
        this.dataStore.storePnLEvent(event);

        // Update agent trade with settlement info
        // Find the corresponding trade and update it
        const trades = this.dataStore.getAgentTrades(event.agentId);
        const trade = trades.find((t) => t.marketId === event.marketId);

        if (trade) {
            trade.outcome = event.pnl >= 0n ? 'YES' : 'NO'; // Simplified
            trade.exitTime = event.timestamp;
            trade.pnl = event.pnl;

            // Calculate result
            if (event.pnl > 0n) {
                trade.result = 'WIN';
            } else if (event.pnl < 0n) {
                trade.result = 'LOSS';
            } else {
                trade.result = 'BREAK';
            }

            // Calculate return %
            if (trade.entrySize > 0n) {
                trade.roiPercent =
                    Number((event.pnl * 100n) / trade.entrySize);
                trade.returnPercent =
                    Number(event.pnl) / Number(trade.entrySize);
            }

            // Calculate time in market
            if (trade.exitTime && trade.entryTime) {
                trade.timeInMarket = trade.exitTime - trade.entryTime;
            }

            trade.updatedAt = Math.floor(Date.now() / 1000);

            this.dataStore.storeAgentTrade(trade);
        }

        // Recompute metrics
        this.recomputeMetrics(event.agentId);
    }

    /**
     * Recompute and cache metrics for agent
     */
    private recomputeMetrics(agentId: number): void {
        const trades = this.dataStore.getAgentTrades(agentId);
        const metrics = this.metricsCalculator.computeMetrics(agentId, trades);

        // Cache in database
        // TODO: Implement metrics caching in DataStore if needed, but for now we compute on fly in API or just here?
        // Tracker code "TODO: Implement metrics caching" suggests it's not in DataStore yet.
        // I won't add it to DataStore interface to keep it simple as per tracker.

        this.logger.debug('Metrics recomputed', {
            agentId,
            winRate: metrics.winRate,
            reputationScore: metrics.reputationScore,
        });
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
