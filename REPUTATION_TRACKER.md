# Reputation & Observability (MVP) Implementation Tracker

## Overview
Build off-chain reputation system. Listen to on-chain events (TradeExecuted, PnLAttributed), store trade history, compute metrics, and expose queryable API for agent performance.

---

## Architecture Decision: Off-Chain Indexing

**For MVP:**
- Listen to PredictionMarket events (on Testnet)
- Store in SQLite (local) or PostgreSQL (shared)
- Compute metrics off-chain (no gas)
- Query via REST API
- Display in simple HTML dashboard

**Why off-chain for MVP?**
- No gas costs
- Easy to iterate (change metrics without contract redeploy)
- Can handle complex queries (best agent by month, etc.)
- Works immediately on testnet

**Future upgrade:** Move to Subgraph (The Graph) for decentralized indexing.

---

## ✅ Step 1: Define Reputation Data Models

**File:** `ayin-reputation/src/models.ts`

```typescript
/**
 * Reputation system data models
 */

// ============================================================================
// TRADE EVENT (from blockchain)
// ============================================================================

export interface TradeEvent {
  id: string;                    // Unique ID (txHash + logIndex)
  agentId: number;
  marketId: number;
  direction: 'YES' | 'NO';       // Outcome direction
  shareSize: bigint;             // Amount traded
  price: number;                 // Price per share (basis points)
  timestamp: number;             // Block timestamp
  blockNumber: number;
  transactionHash: string;
  
  // Computed on settlement
  outcome?: 'YES' | 'NO';        // Market resolution
  settledAt?: number;
}

// ============================================================================
// PNL EVENT (from blockchain)
// ============================================================================

export interface PnLEvent {
  id: string;
  agentId: number;
  marketId: number;
  winnings: bigint;              // Winning shares
  loss: bigint;                  // Losing shares
  pnl: bigint;                   // Net profit/loss (signed)
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

// ============================================================================
// AGENT TRADE RECORD (computed)
// ============================================================================

export interface AgentTrade {
  id: string;
  agentId: number;
  marketId: number;
  
  // Entry
  direction: 'YES' | 'NO';
  entrySize: bigint;
  entryPrice: number;            // Average price paid
  entryTime: number;
  
  // Exit (after settlement)
  outcome?: 'YES' | 'NO';
  exitTime?: number;
  
  // Performance
  result?: 'WIN' | 'LOSS' | 'BREAK';
  pnl?: bigint;
  returnPercent?: number;        // (exit - entry) / entry
  roiPercent?: number;           // (pnl / entrySize) * 100
  timeInMarket?: number;         // seconds
  
  // Metadata
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// AGENT METRICS (aggregate)
// ============================================================================

export interface AgentMetrics {
  agentId: number;
  
  // Count metrics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  
  // Performance metrics
  winRate: number;               // % of winning trades
  avgReturn: number;             // Average % return
  medianReturn: number;          // Median % return
  bestReturn: number;            // Best single trade return
  worstReturn: number;           // Worst single trade return
  
  // Risk metrics
  maxDrawdown: number;           // Largest peak-to-trough decline
  sharpeRatio: number;           // Risk-adjusted returns
  
  // Capital metrics
  totalCapitalDeployed: bigint;  // Sum of entry sizes
  totalPnL: bigint;              // Total profit/loss
  
  // Time metrics
  avgTimeInMarket: number;       // Average seconds per trade
  firstTradeAt: number;
  lastTradeAt: number;
  daysSinceFirstTrade: number;
  
  // Reputation score (0-100)
  reputationScore: number;
  
  // Computed at
  computedAt: number;
}

// ============================================================================
// LEADERBOARD ENTRY
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  agentId: number;
  reputationScore: number;
  winRate: number;
  totalPnL: bigint;
  totalTrades: number;
}

// ============================================================================
// AGENT PROFILE (public-facing)
// ============================================================================

export interface AgentProfile {
  agentId: number;
  operatorAddress?: string;      // From AgentRegistry
  strategyType?: string;         // DIRECTIONAL, LIQUIDITY, ARB
  registeredAt?: number;
  
  metrics: AgentMetrics;
  recentTrades: AgentTrade[];    // Last 10 trades
  monthlyPerformance: {
    month: string;               // YYYY-MM
    trades: number;
    pnl: bigint;
    winRate: number;
  }[];
}
```

**Status:** ⏳ TODO
- [ ] Create `src/models.ts`
- [ ] Define all data structures

---

## Step 2: Create Event Listener (Indexer)

**File:** `ayin-reputation/src/eventListener.ts`

```typescript
import { ethers } from 'ethers';
import { Logger, TradeEvent, PnLEvent } from './types';

// Minimal ABIs for events
const MARKET_ABI = [
  'event TradeExecuted(uint256 indexed marketId, address indexed trader, uint256 indexed agentId, uint8 direction, uint256 shareSize, uint256 price, uint256 timestamp)',
  'event PnLAttributed(uint256 indexed marketId, address indexed trader, uint256 indexed agentId, uint256 winnings, uint256 loss, int256 pnl)',
];

export class EventListener {
  private provider: ethers.JsonRpcProvider;
  private marketContract: ethers.Contract;
  private logger: Logger;
  private lastBlockScanned = 0;

  constructor(
    marketAddress: string,
    rpcUrl: string,
    logger: Logger
  ) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
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
        const args = event.args as any;

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
        const args = event.args as any;

        pnlEvents.push({
          id: `${event.transactionHash}-${event.logIndex}`,
          agentId: Number(args.agentId),
          marketId: Number(args.marketId),
          winnings: BigInt(args.winnings.toString()),
          loss: BigInt(args.loss.toString()),
          pnl: BigInt(args.pnl.toString()),
          timestamp: Number(args.timestamp),
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
      event: any
    ) => {
      const pnlEvent: PnLEvent = {
        id: `${event.transactionHash}-${event.logIndex}`,
        agentId: Number(agentId),
        marketId: Number(marketId),
        winnings: BigInt(winnings.toString()),
        loss: BigInt(loss.toString()),
        pnl: BigInt(pnl.toString()),
        timestamp: Number(event.timestamp || Math.floor(Date.now() / 1000)),
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
```

**Status:** ⏳ TODO
- [ ] Create `src/eventListener.ts`
- [ ] Implement EventListener class

---

## Step 3: Create Data Store (SQLite)

**File:** `ayin-reputation/src/dataStore.ts`

```typescript
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
```

**Status:** ⏳ TODO
- [ ] Create `src/dataStore.ts`
- [ ] Implement DataStore class
- [ ] Install: `npm install better-sqlite3`

---

## Step 4: Create Metrics Calculator

**File:** `ayin-reputation/src/metricsCalculator.ts`

```typescript
import { Logger, AgentTrade, AgentMetrics } from './types';

/**
 * Calculate agent metrics from trade history
 */
export class MetricsCalculator {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Compute metrics for an agent
   */
  computeMetrics(agentId: number, trades: AgentTrade[]): AgentMetrics {
    this.logger.info('Computing metrics', { agentId, tradeCount: trades.length });

    // Filter settled trades
    const settledTrades = trades.filter(
      (t) => t.result && t.pnl !== undefined
    );

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
    const totalCapitalDeployed = settledTrades.reduce(
      (sum, t) => sum + t.entrySize,
      0n
    );
    const totalPnL = settledTrades.reduce(
      (sum, t) => sum + (t.pnl || 0n),
      0n
    );

    // Time metrics
    const timeInMarkets = settledTrades
      .filter((t) => t.timeInMarket !== undefined)
      .map((t) => t.timeInMarket || 0);
    const avgTimeInMarket =
      timeInMarkets.length > 0
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
  private calculateMaxDrawdown(trades: AgentTrade[]): number {
    if (trades.length === 0) return 0;

    let peak = 0;
    let maxDD = 0;

    for (const trade of trades) {
      const value = Number(trade.pnl || 0n);
      if (value > peak) peak = value;

      const dd = (peak - value) / Math.max(peak, 1);
      if (dd > maxDD) maxDD = dd;
    }

    return maxDD * 100; // As percentage
  }

  /**
   * Calculate Sharpe ratio (simplified)
   * Assumes risk-free rate = 0
   */
  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0; // Annualized
  }

  /**
   * Calculate median
   */
  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

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
  private calculateReputationScore(params: {
    winRate: number;
    sharpeRatio: number;
    totalTrades: number;
    avgReturn: number;
  }): number {
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
  private getDefaultMetrics(agentId: number): AgentMetrics {
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

**Status:** ✅ DONE
- [x] Create `src/metricsCalculator.ts`
- [x] Implement MetricsCalculator class

---

## Step 5: Create API Service

**File:** `ayin-reputation/src/api.ts`

```typescript
import express, { Request, Response } from 'express';
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

      res.json(metrics);
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

      res.json(profile);
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

      res.json({
        trades: paginated,
        total: trades.length,
        offset,
        limit,
      });
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
        byMonth[month] = { trades: [], pnl: 0n, wins: 0 };
      }

      byMonth[month].trades.push(trade);
      if (trade.pnl) {
        byMonth[month].pnl += trade.pnl;
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
}
```

**Status:** ✅ DONE
- [x] Create `src/api.ts`
- [x] Implement ReputationAPI class

---

## Step 6: Create Indexer Loop

**File:** `ayin-reputation/src/indexer.ts`

```typescript
import {
  Logger,
  EventListener,
  DataStore,
  MetricsCalculator,
  TradeEvent,
  PnLEvent,
  AgentTrade,
} from './types';

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
    // TODO: Implement metrics caching

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
```

**Status:** ✅ DONE
- [x] Create `src/indexer.ts`
- [x] Implement ReputationIndexer class

---

## Step 7: Create Main Entry Point

**File:** `ayin-reputation/src/index.ts`

```typescript
import { loadConfig } from './config';
import { createLogger } from './logger';
import { EventListener } from './eventListener';
import { DataStore } from './dataStore';
import { MetricsCalculator } from './metricsCalculator';
import { ReputationIndexer } from './indexer';
import { ReputationAPI } from './api';

async function main() {
  const config = loadConfig();
  const logger = createLogger(
    (process.env.LOG_LEVEL as any) || 'info'
  );

  logger.info('Starting reputation system', {
    network: config.chainId,
    market: config.predictionMarketAddress,
  });

  // Initialize components
  const eventListener = new EventListener(
    config.predictionMarketAddress,
    config.rpcUrl,
    logger
  );

  const dataStore = new DataStore('./reputation.db', logger);
  const metricsCalculator = new MetricsCalculator(logger);
  const indexer = new ReputationIndexer(
    eventListener,
    dataStore,
    metricsCalculator,
    logger
  );

  const api = new ReputationAPI(dataStore, metricsCalculator, logger);

  // Start API
  const apiPort = parseInt(process.env.API_PORT || '3001', 10);
  api.start(apiPort);

  // Start indexer
  await indexer.start();
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

**Status:** ✅ DONE
- [x] Create `src/index.ts`

---

## Step 8: Create Simple Dashboard

**File:** `ayin-reputation/public/index.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ayin - Agent Reputation Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
            background: #0f172a;
            color: #e2e8f0;
            line-height: 1.6;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            border-bottom: 1px solid #334155;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        h1 {
            font-size: 32px;
            margin-bottom: 10px;
        }

        .search-box {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        input {
            flex: 1;
            padding: 10px 15px;
            background: #1e293b;
            border: 1px solid #334155;
            color: #e2e8f0;
            border-radius: 6px;
        }

        button {
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        }

        button:hover {
            background: #2563eb;
        }

        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .metric-card {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 20px;
        }

        .metric-label {
            color: #94a3b8;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .metric-value {
            font-size: 28px;
            font-weight: 700;
            color: #60a5fa;
        }

        .trade-history {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            overflow: hidden;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th {
            background: #0f172a;
            padding: 15px;
            text-align: left;
            color: #94a3b8;
            font-weight: 600;
            border-bottom: 1px solid #334155;
        }

        td {
            padding: 15px;
            border-bottom: 1px solid #334155;
        }

        tr:hover {
            background: #334155;
        }

        .win {
            color: #10b981;
        }

        .loss {
            color: #ef4444;
        }

        .break {
            color: #94a3b8;
        }

        .monthly-chart {
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 40px;
        }

        .chart-placeholder {
            height: 300px;
            background: #0f172a;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #64748b;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🎯 Ayin Agent Reputation Dashboard</h1>
            <div class="search-box">
                <input type="text" id="agentIdInput" placeholder="Enter agent ID..." />
                <button onclick="searchAgent()">Search</button>
            </div>
        </header>

        <div id="content">
            <p style="color: #64748b; text-align: center;">Enter an agent ID to view reputation metrics</p>
        </div>
    </div>

    <script>
        async function searchAgent() {
            const agentId = document.getElementById('agentIdInput').value;
            if (!agentId) return;

            try {
                const response = await fetch(`/agents/${agentId}/profile`);
                const profile = await response.json();

                displayProfile(profile);
            } catch (error) {
                console.error('Error fetching profile:', error);
                alert('Failed to fetch agent profile');
            }
        }

        function displayProfile(profile) {
            const { agentId, metrics, recentTrades, monthlyPerformance } = profile;

            let html = `
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-label">Reputation Score</div>
                        <div class="metric-value">${metrics.reputationScore}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Win Rate</div>
                        <div class="metric-value">${metrics.winRate.toFixed(1)}%</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Total Trades</div>
                        <div class="metric-value">${metrics.totalTrades}</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Total PnL</div>
                        <div class="metric-value" style="color: ${metrics.totalPnL > 0n ? '#10b981' : '#ef4444'}">
                            ${(Number(metrics.totalPnL) / 1e18).toFixed(2)}
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Avg Return</div>
                        <div class="metric-value">${metrics.avgReturn.toFixed(2)}%</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-label">Sharpe Ratio</div>
                        <div class="metric-value">${metrics.sharpeRatio.toFixed(2)}</div>
                    </div>
                </div>

                <div class="monthly-chart">
                    <h3>Monthly Performance</h3>
                    <div class="chart-placeholder">
                        ${monthlyPerformance.length > 0 
                            ? monthlyPerformance.map(m => 
                                `${m.month}: ${m.trades} trades, ${m.winRate.toFixed(1)}% WR`
                              ).join(' | ')
                            : 'No monthly data'}
                    </div>
                </div>

                <div class="trade-history">
                    <table>
                        <thead>
                            <tr>
                                <th>Market</th>
                                <th>Direction</th>
                                <th>Entry Size</th>
                                <th>Result</th>
                                <th>ROI</th>
                                <th>Time in Market</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${recentTrades.map(trade => `
                                <tr>
                                    <td>#${trade.marketId}</td>
                                    <td>${trade.direction}</td>
                                    <td>${(Number(trade.entrySize) / 1e18).toFixed(2)}</td>
                                    <td class="${trade.result ? trade.result.toLowerCase() : ''}">
                                        ${trade.result || 'OPEN'}
                                    </td>
                                    <td>${trade.roiPercent ? trade.roiPercent.toFixed(2) + '%' : 'N/A'}</td>
                                    <td>${trade.timeInMarket ? formatTime(trade.timeInMarket) : 'N/A'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            document.getElementById('content').innerHTML = html;
        }

        function formatTime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }

        // Allow Enter key
        document.getElementById('agentIdInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') searchAgent();
        });
    </script>
</body>
</html>
```

**Status:** ⏳ TODO
- [ ] Create `public/index.html`

---

## Step 9: Serve Dashboard

**File:** `ayin-reputation/src/index.ts` (updated)

```typescript
// Add to ReputationAPI setupRoutes():

this.app.use(express.static('public'));

// Root route
this.app.get('/', (req: Request, res: Response) => {
  res.sendFile('public/index.html', { root: '.' });
});
```

**Status:** ⏳ TODO
- [ ] Update to serve static files

---

## Step 10: Write Tests

**File:** `ayin-reputation/src/__tests__/metricsCalculator.test.ts`

```typescript
import { MetricsCalculator } from '../metricsCalculator';
import { createLogger } from '../logger';
import { AgentTrade } from '../types';

describe('MetricsCalculator', () => {
  let calculator: MetricsCalculator;
  const logger = createLogger('debug');

  beforeEach(() => {
    calculator = new MetricsCalculator(logger);
  });

  it('should calculate metrics for winning trades', () => {
    const trades: AgentTrade[] = [
      {
        id: '1',
        agentId: 1,
        marketId: 1,
        direction: 'YES',
        entrySize: BigInt(100e18),
        entryPrice: 0.5,
        entryTime: 1000,
        exitTime: 2000,
        outcome: 'YES',
        result: 'WIN',
        pnl: BigInt(50e18),
        roiPercent: 50,
        timeInMarket: 1000,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ];

    const metrics = calculator.computeMetrics(1, trades);

    expect(metrics.totalTrades).toBe(1);
    expect(metrics.winningTrades).toBe(1);
    expect(metrics.winRate).toBe(100);
    expect(metrics.reputationScore).toBeGreaterThan(0);
  });

  it('should calculate reputation score', () => {
    const trades: AgentTrade[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      agentId: 1,
      marketId: i + 1,
      direction: 'YES',
      entrySize: BigInt(100e18),
      entryPrice: 0.5,
      entryTime: 1000 + i * 100,
      exitTime: 2000 + i * 100,
      outcome: 'YES',
      result: i % 2 === 0 ? 'WIN' : 'LOSS',
      pnl: i % 2 === 0 ? BigInt(50e18) : BigInt(-50e18),
      roiPercent: i % 2 === 0 ? 50 : -50,
      timeInMarket: 1000,
      createdAt: 1000 + i * 100,
      updatedAt: 2000 + i * 100,
    }));

    const metrics = calculator.computeMetrics(1, trades);

    expect(metrics.reputationScore).toBeGreaterThan(0);
    expect(metrics.reputationScore).toBeLessThanOrEqual(100);
    expect(metrics.winRate).toBe(50);
  });
});
```

**Status:** ⏳ TODO
- [ ] Create `src/__tests__/metricsCalculator.test.ts`
- [ ] Run tests

---

## Step 11: Integration Test

**File:** `ayin-reputation/src/__tests__/indexer.test.ts`

```typescript
import { ReputationIndexer } from '../indexer';
import { EventListener } from '../eventListener';
import { DataStore } from '../dataStore';
import { MetricsCalculator } from '../metricsCalculator';
import { createLogger } from '../logger';
import { TradeEvent } from '../types';

describe('ReputationIndexer', () => {
  let indexer: ReputationIndexer;
  let eventListener: jest.Mocked<EventListener>;
  let dataStore: DataStore;
  let metricsCalculator: MetricsCalculator;
  const logger = createLogger('debug');

  beforeEach(() => {
    dataStore = new DataStore(':memory:', logger);
    metricsCalculator = new MetricsCalculator(logger);

    eventListener = {
      subscribeToTrades: jest.fn(() => jest.fn()),
      subscribeToPnL: jest.fn(() => jest.fn()),
    } as any;

    indexer = new ReputationIndexer(
      eventListener,
      dataStore,
      metricsCalculator,
      logger
    );
  });

  it('should process trade events', () => {
    const event: TradeEvent = {
      id: 'trade-1',
      agentId: 1,
      marketId: 1,
      direction: 'YES',
      shareSize: BigInt(100e18),
      price: 5000,
      timestamp: 1000,
      blockNumber: 100,
      transactionHash: '0x123',
    };

    // Handle event
    (indexer as any).handleTradeEvent(event);

    // Verify stored
    const trades = dataStore.getAgentTrades(1);
    expect(trades.length).toBe(1);
  });
});
```

**Status:** ⏳ TODO
- [ ] Create integration tests

---

## Step 12: Package Setup

**File:** `ayin-reputation/package.json`

```json
{
  "name": "ayin-reputation",
  "version": "0.1.0",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "start": "node dist/index.js",
    "test": "jest"
  },
  "dependencies": {
    "ethers": "^6.x",
    "express": "^4.18.2",
    "better-sqlite3": "^9.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "ts-node": "^10.x",
    "@types/express": "^4.17.x",
    "@types/node": "^20.x",
    "@types/jest": "^29.x",
    "jest": "^29.x",
    "ts-jest": "^29.x"
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `package.json`

---

## Step 13: Configuration

**File:** `ayin-reputation/.env.example`

```
# Network
CHAIN_ID=84532  # Base Sepolia
RPC_URL=https://sepolia.base.org
PREDICTION_MARKET_ADDRESS=0x...

# Database
DB_PATH=./reputation.db

# API
API_PORT=3001

# Logging
LOG_LEVEL=info
```

**Status:** ⏳ TODO
- [ ] Create `.env.example`

---

## Summary Checklist

| Step | Task | Status |
|------|------|--------|
| 1 | Define data models | ⏳ TODO |
| 2 | Event listener | ⏳ TODO |
| 3 | SQLite data store | ⏳ TODO |
| 4 | Metrics calculator | ⏳ TODO |
| 5 | REST API | ⏳ TODO |
| 6 | Indexer loop | ⏳ TODO |
| 7 | Entry point | ⏳ TODO |
| 8 | Dashboard UI | ⏳ TODO |
| 9 | Serve dashboard | ⏳ TODO |
| 10 | Unit tests | ⏳ TODO |
| 11 | Integration tests | ⏳ TODO |
| 12 | Package setup | ⏳ TODO |
| 13 | Configuration | ⏳ TODO |

---

## Key Metrics (Explained)

**Win Rate** = (Winning Trades) / (Total Trades) × 100
- Simple: 5 wins out of 10 = 50%

**ROI** = (PnL / Entry Size) × 100
- Profit divided by risk

**Sharpe Ratio** = Mean Return / Std Dev of Returns
- Risk-adjusted performance (higher is better)
- >1 = good, >2 = excellent

**Max Drawdown** = (Peak - Trough) / Peak
- Worst peak-to-trough decline

**Reputation Score** (0-100)
- 40% win rate
- 30% Sharpe ratio
- 20% consistency (log of trade count)
- 10% activity bonus

---

## Data Flow: Complete

```
1. TradeExecuted event emitted on chain
   ↓
2. EventListener captures it
   ↓
3. ReputationIndexer.handleTradeEvent()
   ↓ (stores in SQLite)
4. DataStore.storeTradeEvent()
   ↓
5. Creates AgentTrade record
   ↓
6. DataStore.storeAgentTrade()
   ↓
7. MetricsCalculator.computeMetrics()
   ↓ (calculates win rate, PnL, etc.)
8. Cache metrics (for fast API queries)
   ↓
9. REST API endpoint returns metrics
   ↓
10. Dashboard displays: win rate, PnL, reputation
```

---

## API Endpoints

```
GET /agents/:agentId/metrics      → Agent metrics snapshot
GET /agents/:agentId/profile       → Full profile + recent trades
GET /agents/:agentId/trades        → Paginated trade history
GET /leaderboard                   → Top agents by reputation
GET /health                        → Health check

Dashboard:
GET / → Serve index.html
```

---

## Next Steps After MVP

1. **Subgraph indexing** — Decentralized (use The Graph)
2. **Compute-on-demand** — Aggregate metrics across multiple testnet instances
3. **ML features** — Add advanced metrics (autocorrelation, regime detection)
4. **Multi-chain** — Track agents across Base, Optimism, etc.
5. **Badges** — Achievement system (100 trades, 90% win rate, etc.)
