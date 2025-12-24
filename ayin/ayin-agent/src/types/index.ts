export type Direction = 'YES' | 'NO';

export interface MarketSignal {
  marketId: string;
  probability: number; // 0–1
  direction: Direction;
}

export interface DelegationPolicy {
  maxAllocation: bigint;
  maxDrawdown: number;
  allowedMarkets: string[];
  expiresAt: number;
}


export interface AgentContext {
  agentId: number;
  operator: string;
}

export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, error?: Error | Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
}