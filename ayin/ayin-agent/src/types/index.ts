/**
 * Agent Types
 * Phase 2: Production Hardening
 */

// ============================================
// TRADING TYPES
// ============================================

export type Direction = 'YES' | 'NO';

export interface MarketSignal {
  marketId: string;
  probability: number; // 0–1
  direction: Direction;
  confidence?: number; // 0–1, optional signal strength
  timestamp?: number;
}

// ============================================
// POLICY TYPES
// ============================================

export interface DelegationPolicy {
  maxAllocation: bigint;
  maxDrawdown: number;      // Percentage (e.g., 10 = 10%)
  allowedMarkets: string[]; // Market addresses
  expiresAt: number;        // Unix timestamp
}

export interface OnchainMandate {
  agent: string;           // Agent address
  maxTradeSize: bigint;    // Max size per trade in wei
  allowedMarkets: string[];
  expiryTime: number;
  isActive: boolean;
  createdAt: number;
  mandateId: number;
}

// ============================================
// AGENT CONTEXT
// ============================================

export interface AgentContext {
  agentId: number;
  operator: string;
  smartWalletAddress?: string;
  chainId: number;
}

// ============================================
// LOGGING
// ============================================

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, error?: Error | Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
}

// ============================================
// EXECUTION TYPES
// ============================================

export interface TradeResult {
  success: boolean;
  txHash?: string;
  blockNumber?: number;
  tokensReceived?: bigint;
  gasCost?: bigint;
  error?: string;
}

export interface ExecutionMetrics {
  totalTrades: number;
  successfulTrades: number;
  failedTrades: number;
  totalVolume: bigint;
  totalGasCost: bigint;
  averageExecutionTimeMs: number;
}

// ============================================
// RISK TYPES
// ============================================

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskAssessment {
  level: RiskLevel;
  violations: string[];
  metrics: {
    currentDrawdown: number;
    tradesInLastHour: number;
    dailyVolume: bigint;
    openPositions: number;
  };
  allowed: boolean;
}

// ============================================
// MARKET TYPES
// ============================================

export interface MarketState {
  marketId: string;
  isActive: boolean;
  yesPrice: bigint;
  noPrice: bigint;
  totalVolume: bigint;
  expiryTime: number;
  question?: string;
}

export interface MarketPosition {
  marketId: string;
  isYes: boolean;
  tokens: bigint;
  averagePrice: bigint;
  unrealizedPnL: bigint;
}

// ============================================
// EVENT TYPES
// ============================================

export interface ChainEvent {
  type: string;
  blockNumber: number;
  txHash: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface AgentEvent {
  type: 'trade' | 'position_update' | 'risk_alert' | 'circuit_breaker';
  timestamp: number;
  data: Record<string, unknown>;
}