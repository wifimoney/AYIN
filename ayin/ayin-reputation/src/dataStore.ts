import Database from 'better-sqlite3';
import { Logger, AgentTrade, PnLEvent, TradeEvent } from './types';

export class DataStore {
    private db: Database.Database;
    private logger: Logger;

    constructor(dbPath: string, logger: Logger) {
        this.db = new Database(dbPath);
        this.logger = logger;
        this.initializeSchema();
    }

    /**
     * Initialize database schema
     */
    private initializeSchema(): void {
        this.db.exec(`
      -- Trade events from blockchain
      CREATE TABLE IF NOT EXISTS trade_events (
        id TEXT PRIMARY KEY,
        agent_id INTEGER NOT NULL,
        market_id INTEGER NOT NULL,
        direction TEXT NOT NULL,
        share_size TEXT NOT NULL,
        price REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        block_number INTEGER NOT NULL,
        tx_hash TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- PnL events from blockchain
      CREATE TABLE IF NOT EXISTS pnl_events (
        id TEXT PRIMARY KEY,
        agent_id INTEGER NOT NULL,
        market_id INTEGER NOT NULL,
        winnings TEXT NOT NULL,
        loss TEXT NOT NULL,
        pnl TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        block_number INTEGER NOT NULL,
        tx_hash TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Processed agent trades
      CREATE TABLE IF NOT EXISTS agent_trades (
        id TEXT PRIMARY KEY,
        agent_id INTEGER NOT NULL,
        market_id INTEGER NOT NULL,
        direction TEXT NOT NULL,
        entry_size TEXT NOT NULL,
        entry_price REAL NOT NULL,
        entry_time INTEGER NOT NULL,
        outcome TEXT,
        exit_time INTEGER,
        result TEXT,
        pnl TEXT,
        return_percent REAL,
        roi_percent REAL,
        time_in_market INTEGER,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Cached agent metrics
      CREATE TABLE IF NOT EXISTS agent_metrics (
        agent_id INTEGER PRIMARY KEY,
        total_trades INTEGER,
        winning_trades INTEGER,
        losing_trades INTEGER,
        break_even_trades INTEGER,
        win_rate REAL,
        avg_return REAL,
        median_return REAL,
        best_return REAL,
        worst_return REAL,
        max_drawdown REAL,
        sharpe_ratio REAL,
        total_capital_deployed TEXT,
        total_pnl TEXT,
        avg_time_in_market REAL,
        first_trade_at INTEGER,
        last_trade_at INTEGER,
        reputation_score REAL,
        computed_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_trade_agent ON trade_events(agent_id);
      CREATE INDEX IF NOT EXISTS idx_trade_timestamp ON trade_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_pnl_agent ON pnl_events(agent_id);
      CREATE INDEX IF NOT EXISTS idx_pnl_timestamp ON pnl_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_agent_trade_agent ON agent_trades(agent_id);
      CREATE INDEX IF NOT EXISTS idx_agent_trade_market ON agent_trades(market_id);
    `);

        this.logger.info('Database schema initialized');
    }

    /**
     * Store trade event
     */
    storeTradeEvent(event: TradeEvent): void {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO trade_events
      (id, agent_id, market_id, direction, share_size, price, timestamp, block_number, tx_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            event.id,
            event.agentId,
            event.marketId,
            event.direction,
            event.shareSize.toString(),
            event.price,
            event.timestamp,
            event.blockNumber,
            event.transactionHash
        );
    }

    /**
     * Store PnL event
     */
    storePnLEvent(event: PnLEvent): void {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pnl_events
      (id, agent_id, market_id, winnings, loss, pnl, timestamp, block_number, tx_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            event.id,
            event.agentId,
            event.marketId,
            event.winnings.toString(),
            event.loss.toString(),
            event.pnl.toString(),
            event.timestamp,
            event.blockNumber,
            event.transactionHash
        );
    }

    /**
     * Get all trades for agent
     */
    getAgentTrades(agentId: number): AgentTrade[] {
        const stmt = this.db.prepare(`
      SELECT * FROM agent_trades WHERE agent_id = ? ORDER BY entry_time DESC
    `);

        const rows = stmt.all(agentId) as any[];

        return rows.map((row) => ({
            id: row.id,
            agentId: row.agent_id,
            marketId: row.market_id,
            direction: row.direction,
            entrySize: BigInt(row.entry_size),
            entryPrice: row.entry_price,
            entryTime: row.entry_time,
            outcome: row.outcome,
            exitTime: row.exit_time,
            result: row.result,
            pnl: row.pnl ? BigInt(row.pnl) : undefined,
            returnPercent: row.return_percent,
            roiPercent: row.roi_percent,
            timeInMarket: row.time_in_market,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    }

    /**
     * Store agent trade
     */
    storeAgentTrade(trade: AgentTrade): void {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agent_trades
      (id, agent_id, market_id, direction, entry_size, entry_price, entry_time,
       outcome, exit_time, result, pnl, return_percent, roi_percent, time_in_market, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

        stmt.run(
            trade.id,
            trade.agentId,
            trade.marketId,
            trade.direction,
            trade.entrySize.toString(),
            trade.entryPrice,
            trade.entryTime,
            trade.outcome,
            trade.exitTime,
            trade.result,
            trade.pnl?.toString(),
            trade.returnPercent,
            trade.roiPercent,
            trade.timeInMarket,
            Math.floor(Date.now() / 1000)
        );
    }

    /**
     * Close database
     */
    close(): void {
        this.db.close();
    }
}
