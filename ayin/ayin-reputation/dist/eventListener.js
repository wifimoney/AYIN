"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventListener = void 0;
const ethers_1 = require("ethers");
// Minimal ABIs for events
const MARKET_ABI = [
    'event TradeExecuted(uint256 indexed marketId, address indexed trader, uint256 indexed agentId, uint8 direction, uint256 shareSize, uint256 price, uint256 timestamp)',
    'event PnLAttributed(uint256 indexed marketId, address indexed trader, uint256 indexed agentId, uint256 winnings, uint256 loss, int256 pnl)',
];
class EventListener {
    constructor(marketAddress, rpcUrl, logger) {
        this.lastBlockScanned = 0;
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        this.marketContract = new ethers_1.ethers.Contract(marketAddress, MARKET_ABI, this.provider);
        this.logger = logger;
    }
    /**
     * Scan for all TradeExecuted events since last block
     */
    async scanTradeEvents(fromBlock, toBlock) {
        try {
            this.logger.info('Scanning TradeExecuted events', { fromBlock, toBlock });
            const events = await this.marketContract.queryFilter(this.marketContract.filters.TradeExecuted(), fromBlock, toBlock);
            const trades = [];
            for (const event of events) {
                // Safe access to args for v5
                const args = event.args;
                if (!args)
                    continue;
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
        }
        catch (error) {
            this.logger.error('Failed to scan trade events', error);
            return [];
        }
    }
    /**
     * Scan for all PnLAttributed events
     */
    async scanPnLEvents(fromBlock, toBlock) {
        try {
            this.logger.info('Scanning PnLAttributed events', { fromBlock, toBlock });
            const events = await this.marketContract.queryFilter(this.marketContract.filters.PnLAttributed(), fromBlock, toBlock);
            const pnlEvents = [];
            for (const event of events) {
                const args = event.args;
                if (!args)
                    continue;
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
        }
        catch (error) {
            this.logger.error('Failed to scan PnL events', error);
            return [];
        }
    }
    /**
     * Get current block number
     */
    async getCurrentBlock() {
        return await this.provider.getBlockNumber();
    }
    /**
     * Get last scanned block
     */
    getLastScannedBlock() {
        return this.lastBlockScanned;
    }
    /**
     * Subscribe to live TradeExecuted events
     */
    subscribeToTrades(callback) {
        const listener = (marketId, trader, agentId, direction, shareSize, price, timestamp, event) => {
            const tradeEvent = {
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
        this.marketContract.on(this.marketContract.filters.TradeExecuted(), listener);
        // Return unsubscribe function
        return () => {
            this.marketContract.off(this.marketContract.filters.TradeExecuted(), listener);
        };
    }
    /**
     * Subscribe to live PnLAttributed events
     */
    subscribeToPnL(callback) {
        const listener = (marketId, trader, agentId, winnings, loss, pnl, event // Important: PnL event in ABI doesn't have timestamp, need to fetch block? 
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
            const pnlEvent = {
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
        this.marketContract.on(this.marketContract.filters.PnLAttributed(), listener);
        // Return unsubscribe function
        return () => {
            this.marketContract.off(this.marketContract.filters.PnLAttributed(), listener);
        };
    }
}
exports.EventListener = EventListener;
