// SPDX-License-Identifier: MIT

/**
 * Core types for Ayin agent
 */

// ============================================================================
// MARKET TYPES
// ============================================================================

export enum MarketStatus {
    OPEN = 'OPEN',
    RESOLVED = 'RESOLVED',
    SETTLED = 'SETTLED',
}

export enum Outcome {
    UNRESOLVED = 0,
    YES = 1,
    NO = 2,
}

export interface Market {
    marketId: number;
    question: string;
    createdAt: number;
    resolutionTime: number;
    status: MarketStatus;
    outcome: Outcome;
    yesLiquidity: bigint;
    noLiquidity: bigint;
    resolver: string;
}

export interface Position {
    yesShares: bigint;
    noShares: bigint;
    pnl: bigint;
    settled: boolean;
}

// ============================================================================
// MANDATE TYPES
// ============================================================================

export interface Mandate {
    agent: string;
    maxTradeSize: bigint;
    allowedMarkets: string[];
    expiryTime: number;
    isActive: boolean;
    createdAt: number;
}

// ============================================================================
// STRATEGY TYPES
// ============================================================================

export enum TradeDirection {
    YES = 1,
    NO = 2,
}

export interface TradeSignal {
    marketId: number;
    direction: TradeDirection;
    confidence: number;          // 0-100, confidence in this trade
    reasoning: string;           // Why this trade was generated
    suggestedSize: bigint;       // In tokens
}

export interface StrategyContext {
    markets: Market[];
    position: Position | null;
    mandate: Mandate;
    agentId: number;
    timestamp: number;
}

export interface StrategyResult {
    signal: TradeSignal | null;
    nextCheckTime: number;
}

// ============================================================================
// USER OPERATION TYPES
// ============================================================================

export interface UserOperation {
    sender: string;
    nonce: number;
    initCode: string;
    callData: string;
    accountGasLimits: string;
    preVerificationGas: string;
    gasPricesInfo: string;
    signature: string;
}

export interface ExecutionResult {
    success: boolean;
    txHash?: string;
    error?: string;
    gasUsed?: bigint;
}

// ============================================================================
// AGENT CONFIG
// ============================================================================

export interface AgentConfig {
    agentPrivateKey: string;
    agentId: number;
    smartAccountAddress: string;
    chainId: number;
    rpcUrl: string;
    thirdwebClientId: string;

    // Contracts
    predictionMarketAddress: string;
    delegationPolicyAddress: string;
    agentRegistryAddress: string;

    // Strategy
    maxPositionSize: bigint;
    rebalanceInterval: number;  // seconds
}

// ============================================================================
// LOGGER
// ============================================================================

export interface Logger {
    info(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, error?: Error | Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    debug(msg: string, data?: Record<string, unknown>): void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
