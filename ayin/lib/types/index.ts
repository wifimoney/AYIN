/**
 * Domain types for AYIN prediction market platform
 * These types are frontend-owned but should match backend API responses
 */

// Agent status enumeration
export type AgentStatus = 'Active' | 'Paused' | 'Risk';

// Risk level enumeration
export type RiskLevel = 'Low' | 'Medium' | 'High';

// Delegation status enumeration
export type DelegationStatus = 'pending' | 'active' | 'failed' | 'expired';

/**
 * Represents an autonomous trading agent
 * Combines offchain metadata with onchain ERC-8004 registry data
 */
export interface Agent {
  id: string;
  name: string;
  type: string;
  reputation: number;
  status: AgentStatus;
  winRate: string;
  drawdown: string;
  aum: string;
  risk: RiskLevel;
  strategy?: string;
  // ERC-8004 onchain data (optional, populated from AgentRegistry)
  onchainId?: number; // Agent ID from AgentRegistry contract
  onchainType?: number; // 0=DIRECTIONAL, 1=LIQUIDITY, 2=ARB
  strategyHash?: string; // Commitment hash of strategy code
  operator?: string; // Address that controls this agent
  registeredAt?: number; // Timestamp of onchain registration
  verifiedOnchain?: boolean; // Whether agent exists in AgentRegistry
}

/**
 * Represents a prediction market
 */
export interface Market {
  id: string;
  title: string;
  volume: string;
  probability: number;
  confidence: number;
  endDate: string;
  category: string;
  address?: string; // Contract address for the market
  costWei?: number; // Live cost to fetch data
  x402Cost?: number; // Legacy or alternative cost field
}

/**
 * Represents the intent to delegate capital to an agent
 * This is submitted by the user before backend validation
 */
export interface DelegationIntent {
  agentId: string;
  allocation: number;
  duration: number;
  maxDrawdown: number;
  maxPosition: number;
  deltaNeutral: boolean;
  stopLoss: boolean;
  approvedMarkets?: string[];
}

/**
 * Represents an active or historical delegation
 */
export interface Delegation {
  id: string;
  agentId: string;
  agentName?: string;
  status: DelegationStatus;
  constraints: DelegationIntent;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Represents an agent's reputation score and history
 */
export interface Reputation {
  agentId: string;
  score: number;
  history: ReputationHistoryEntry[];
}

export interface ReputationHistoryEntry {
  date: string;
  score: number;
}

/**
 * Represents an action taken by an agent
 */
export interface AgentAction {
  id: string;
  agentId: string;
  agentName: string;
  type: 'buy' | 'sell' | 'adjust' | 'stop';
  action: string;
  market: string;
  timestamp: string;
  txHash?: string;
}

/**
 * Network statistics for the platform
 */
export interface NetworkStats {
  activeAgents: number;
  totalValueLocked: string;
  volume24h: string;
}

/**
 * API response wrapper for consistent error handling
 */
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

/**
 * Pagination parameters for list endpoints
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

