/**
 * Reputation system data models
 */

// ============================================================================
// LOGGER
// ============================================================================

export interface Logger {
    info(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, error?: Error | Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    debug(msg: string, data?: Record<string, unknown>): void;
}

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
