/**
 * Core types for Ayin agent
 */
export declare enum MarketStatus {
    OPEN = "OPEN",
    RESOLVED = "RESOLVED",
    SETTLED = "SETTLED"
}
export declare enum Outcome {
    UNRESOLVED = 0,
    YES = 1,
    NO = 2
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
export interface Mandate {
    agent: string;
    maxTradeSize: bigint;
    allowedMarkets: string[];
    expiryTime: number;
    isActive: boolean;
    createdAt: number;
}
export declare enum TradeDirection {
    YES = 1,
    NO = 2
}
export interface TradeSignal {
    marketId: number;
    direction: TradeDirection;
    confidence: number;
    reasoning: string;
    suggestedSize: bigint;
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
export interface AgentConfig {
    agentPrivateKey: string;
    agentId: number;
    smartAccountAddress: string;
    chainId: number;
    rpcUrl: string;
    thirdwebClientId: string;
    predictionMarketAddress: string;
    delegationPolicyAddress: string;
    agentRegistryAddress: string;
    maxPositionSize: bigint;
    rebalanceInterval: number;
}
export interface Logger {
    info(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, error?: Error | Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    debug(msg: string, data?: Record<string, unknown>): void;
}
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
//# sourceMappingURL=types.d.ts.map