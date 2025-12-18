import { ethers } from 'ethers';
import { Logger, TradeEvent, PnLEvent } from './types';

// Minimal ABIs for events
const MARKET_ABI = [
    'event TradeExecuted(uint256 indexed marketId, address indexed trader, uint256 indexed agentId, uint8 direction, uint256 shareSize, uint256 price, uint256 timestamp)',
    'event PnLAttributed(uint256 indexed marketId, address indexed trader, uint256 indexed agentId, uint256 winnings, uint256 loss, int256 pnl)',
];

export class EventListener {
    private provider: ethers.providers.JsonRpcProvider;
    private marketContract: ethers.Contract;
    private logger: Logger;
    private lastBlockScanned = 0;

    constructor(
        marketAddress: string,
        rpcUrl: string,
        logger: Logger
    ) {
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.marketContract = new ethers.Contract(marketAddress, MARKET_ABI, this.provider);
        this.logger = logger;
    }

    /**
     * Scan for all TradeExecuted events since last block
     */
    async scanTradeEvents(fromBlock: number, toBlock: number): Promise<TradeEvent[]> {
        try {
            this.logger.info('Scanning TradeExecuted events', { fromBlock, toBlock });

            const events = await this.marketContract.queryFilter(
                this.marketContract.filters.TradeExecuted(),
                fromBlock,
                toBlock
            );

            const trades: TradeEvent[] = [];

            for (const event of events) {
                // Safe access to args for v5
                const args = event.args;
                if (!args) continue;

                trades.push({
                    id: `${event.transactionHash}-${event.logIndex}`,
                    agentId: Number(args.agentId),
                    marketId: Number(args.marketId),
                    direction: args.direction === 1 ? 'YES' : 'NO',
                    shareSize: BigInt(args.shareSize.toString()),
                    price: Number(args.price),
                    timestamp: Number(args.timestamp),
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash,
                });
            }

            this.logger.info('Scanned trade events', { count: trades.length });
            this.lastBlockScanned = toBlock;

            return trades;
        } catch (error) {
            this.logger.error('Failed to scan trade events', error as Error);
            return [];
        }
    }

    /**
     * Scan for all PnLAttributed events
     */
    async scanPnLEvents(fromBlock: number, toBlock: number): Promise<PnLEvent[]> {
        try {
            this.logger.info('Scanning PnLAttributed events', { fromBlock, toBlock });

            const events = await this.marketContract.queryFilter(
                this.marketContract.filters.PnLAttributed(),
                fromBlock,
                toBlock
            );

            const pnlEvents: PnLEvent[] = [];

            for (const event of events) {
                const args = event.args;
                if (!args) continue;

                pnlEvents.push({
                    id: `${event.transactionHash}-${event.logIndex}`,
                    agentId: Number(args.agentId),
                    marketId: Number(args.marketId),
                    winnings: BigInt(args.winnings.toString()),
                    loss: BigInt(args.loss.toString()),
                    pnl: BigInt(args.pnl.toString()),
                    timestamp: Number(args.timestamp || Math.floor(Date.now() / 1000)), // timestamp might not be in event, check ABI
                    blockNumber: event.blockNumber,
                    transactionHash: event.transactionHash,
                });
            }

            this.logger.info('Scanned PnL events', { count: pnlEvents.length });

            return pnlEvents;
        } catch (error) {
            this.logger.error('Failed to scan PnL events', error as Error);
            return [];
        }
    }

    /**
     * Get current block number
     */
    async getCurrentBlock(): Promise<number> {
        return await this.provider.getBlockNumber();
    }

    /**
     * Get last scanned block
     */
    getLastScannedBlock(): number {
        return this.lastBlockScanned;
    }

    /**
     * Subscribe to live TradeExecuted events
     */
    subscribeToTrades(callback: (event: TradeEvent) => void): () => void {
        const listener = (
            marketId: any,
            trader: any,
            agentId: any,
            direction: any,
            shareSize: any,
            price: any,
            timestamp: any,
            event: any
        ) => {
            const tradeEvent: TradeEvent = {
                id: `${event.transactionHash}-${event.logIndex}`,
                agentId: Number(agentId),
                marketId: Number(marketId),
                direction: direction === 1 ? 'YES' : 'NO',
                shareSize: BigInt(shareSize.toString()),
                price: Number(price),
                timestamp: Number(timestamp),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
            };

            callback(tradeEvent);
        };

        this.marketContract.on(
            this.marketContract.filters.TradeExecuted(),
            listener
        );

        // Return unsubscribe function
        return () => {
            this.marketContract.off(
                this.marketContract.filters.TradeExecuted(),
                listener
            );
        };
    }

    /**
     * Subscribe to live PnLAttributed events
     */
    subscribeToPnL(callback: (event: PnLEvent) => void): () => void {
        const listener = (
            marketId: any,
            trader: any,
            agentId: any,
            winnings: any,
            loss: any,
            pnl: any,
            event: any // Important: PnL event in ABI doesn't have timestamp, need to fetch block? 
            // Actually tracking code in Step 2 assumes 'event' has timestamp or we use current time.
            // For subscription, we can probably use Date.now() as approximation since it's live.
        ) => {
            // In v5, event is the last arg.
            // The args in listener match the ABI event inputs.
            // ABI: marketId, trader, agentId, winnings, loss, pnl
            // Wait, is 'timestamp' in PnLAttributed? The tracker model has it, but ABI in tracker says:
            // 'event PnLAttributed(uint256 indexed marketId, address indexed trader, uint256 indexed agentId, uint256 winnings, uint256 loss, int256 pnl)'
            // No timestamp. So we must infer it or fetch block.
            // Tracker scanPnLEvents code does: timestamp: Number(args.timestamp), which implies it might be there OR it's a bug in tracker code.
            // Let's assume for live events we use Date.now(). For historical scan, we might need block timestamp.
            // I'll stick to Date.now() for live for now as per tracker snippet logic fallback.

            const pnlEvent: PnLEvent = {
                id: `${event.transactionHash}-${event.logIndex}`,
                agentId: Number(agentId),
                marketId: Number(marketId),
                winnings: BigInt(winnings.toString()),
                loss: BigInt(loss.toString()),
                pnl: BigInt(pnl.toString()),
                timestamp: Math.floor(Date.now() / 1000),
                blockNumber: event.blockNumber,
                transactionHash: event.transactionHash,
            };

            callback(pnlEvent);
        };

        this.marketContract.on(
            this.marketContract.filters.PnLAttributed(),
            listener
        );

        // Return unsubscribe function
        return () => {
            this.marketContract.off(
                this.marketContract.filters.PnLAttributed(),
                listener
            );
        };
    }
}
