# Agent Core (TypeScript) Implementation Tracker

## Overview
Build minimal off-chain agent runtime. Agents pull market state + mandates, run strategy logic, and execute trades via ERC-4337 user operations through Thirdweb.

---

## Architecture Decision: Tech Stack

**Chosen stack:**
- **Runtime:** Node.js 18+ with TypeScript
- **ERC-4337:** Thirdweb SDK (`@thirdweb-dev/sdk`)
- **Contract interaction:** ethers.js v6 (Thirdweb uses this under the hood)
- **Config:** dotenv for secrets
- **Testing:** Jest + ts-jest

**Why Thirdweb?**
- Battle-tested user operation creation
- Handles gas estimation, signature aggregation
- Native smart account support (SmartWallet)
- Base network support built-in

---

## ✅ Step 1: Project Setup

**Create agent directory:**
```bash
mkdir -p ayin-agent
cd ayin-agent

# Initialize Node project
npm init -y

# Install dependencies
npm install \
  @thirdweb-dev/sdk \
  ethers@^6 \
  dotenv \
  typescript \
  ts-node \
  @types/node

npm install -D \
  @types/jest \
  jest \
  ts-jest \
  prettier \
  eslint
```

**Create TypeScript config:**

**File:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Create Jest config:**

**File:** `jest.config.js`
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
```

**Create environment template:**

**File:** `.env.example`
```
# Agent identity
AGENT_PRIVATE_KEY=0x...
AGENT_ID=1

# Smart account (user's ERC-4337 account)
SMART_ACCOUNT_ADDRESS=0x...

# Contracts (deployed on testnet)
PREDICTION_MARKET_ADDRESS=0x...
DELEGATION_POLICY_ADDRESS=0x...
AGENT_REGISTRY_ADDRESS=0x...

# Network
CHAIN_ID=84532  # Base Sepolia
RPC_URL=https://sepolia.base.org

# Thirdweb
THIRDWEB_CLIENT_ID=your_client_id_here

# Strategy config
MAX_POSITION_SIZE=1000  # Max tokens per trade
REBALANCE_INTERVAL=3600  # Seconds between strategy checks
```

**File:** `.env` (local development, git-ignored)
```
# Copy from .env.example and fill in actual values
```

**Update package.json scripts:**

```json
{
  "scripts": {
    "build": "tsc",
    "dev": "ts-node src/index.ts",
    "start": "node dist/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.ts"
  }
}
```

**Status:** ⏳ TODO
- [ ] Run `npm init -y`
- [ ] Install dependencies
- [ ] Create `tsconfig.json`
- [ ] Create `jest.config.js`
- [ ] Create `.env.example` and `.env`
- [ ] Update `package.json` scripts
- [ ] Verify: `npx tsc --version` works

---

## Step 2: Define Type Interfaces

**File:** `src/types.ts`

```typescript
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
```

**Status:** ⏳ TODO
- [ ] Create `src/types.ts`
- [ ] Define all type interfaces

---

## Step 3: Create Config Module

**File:** `src/config.ts`

```typescript
import * as dotenv from 'dotenv';
import { AgentConfig } from './types';

dotenv.config();

function loadEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && defaultValue === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value || defaultValue!;
}

function loadEnvBigInt(key: string, defaultValue?: bigint): bigint {
  const value = loadEnv(key, defaultValue?.toString());
  return BigInt(value);
}

function loadEnvNumber(key: string, defaultValue?: number): number {
  const value = loadEnv(key, defaultValue?.toString());
  return Number(value);
}

export function loadConfig(): AgentConfig {
  return {
    agentPrivateKey: loadEnv('AGENT_PRIVATE_KEY'),
    agentId: loadEnvNumber('AGENT_ID', 1),
    smartAccountAddress: loadEnv('SMART_ACCOUNT_ADDRESS'),
    chainId: loadEnvNumber('CHAIN_ID', 84532),  // Base Sepolia
    rpcUrl: loadEnv('RPC_URL'),
    thirdwebClientId: loadEnv('THIRDWEB_CLIENT_ID'),
    
    predictionMarketAddress: loadEnv('PREDICTION_MARKET_ADDRESS'),
    delegationPolicyAddress: loadEnv('DELEGATION_POLICY_ADDRESS'),
    agentRegistryAddress: loadEnv('AGENT_REGISTRY_ADDRESS'),
    
    maxPositionSize: loadEnvBigInt('MAX_POSITION_SIZE', BigInt(1000e18)),
    rebalanceInterval: loadEnvNumber('REBALANCE_INTERVAL', 3600),
  };
}

export function validateConfig(config: AgentConfig): void {
  if (!config.agentPrivateKey.startsWith('0x')) {
    throw new Error('AGENT_PRIVATE_KEY must start with 0x');
  }
  
  if (!config.smartAccountAddress.startsWith('0x')) {
    throw new Error('SMART_ACCOUNT_ADDRESS must be valid Ethereum address');
  }
  
  if (config.maxPositionSize <= 0n) {
    throw new Error('MAX_POSITION_SIZE must be positive');
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/config.ts`
- [ ] Define loadConfig() and validateConfig()

---

## Step 4: Create Logger Module

**File:** `src/logger.ts`

```typescript
import { Logger, LogLevel } from './types';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export class ConsoleLogger implements Logger {
  private level: LogLevel;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  private shouldLog(msgLevel: LogLevel): boolean {
    return LOG_LEVELS[msgLevel] >= LOG_LEVELS[this.level];
  }

  private timestamp(): string {
    return new Date().toISOString();
  }

  info(msg: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      console.log(
        `[${this.timestamp()}] INFO  ${msg}`,
        data ? JSON.stringify(data) : ''
      );
    }
  }

  error(msg: string, error?: Error | Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      const errorStr = error instanceof Error 
        ? error.message 
        : JSON.stringify(error);
      console.error(`[${this.timestamp()}] ERROR ${msg}`, errorStr);
    }
  }

  warn(msg: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      console.warn(
        `[${this.timestamp()}] WARN  ${msg}`,
        data ? JSON.stringify(data) : ''
      );
    }
  }

  debug(msg: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      console.debug(
        `[${this.timestamp()}] DEBUG ${msg}`,
        data ? JSON.stringify(data) : ''
      );
    }
  }
}

export function createLogger(level: LogLevel = 'info'): Logger {
  return new ConsoleLogger(level);
}
```

**Status:** ⏳ TODO
- [ ] Create `src/logger.ts`
- [ ] Implement ConsoleLogger

---

## Step 5: Create Market State Fetcher

**File:** `src/marketFetcher.ts`

```typescript
import { ethers } from 'ethers';
import { Market, Logger } from './types';

// Minimal ABI for PredictionMarket
const MARKET_ABI = [
  'function getMarket(uint256 marketId) external view returns (tuple(uint256 marketId, string question, uint256 createdAt, uint256 resolutionTime, uint8 status, uint8 outcome, uint256 yesLiquidity, uint256 noLiquidity, address resolver))',
  'function isMarketOpen(uint256 marketId) external view returns (bool)',
];

export class MarketFetcher {
  private contract: ethers.Contract;
  private logger: Logger;

  constructor(
    marketAddress: string,
    rpcUrl: string,
    logger: Logger
  ) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(marketAddress, MARKET_ABI, provider);
    this.logger = logger;
  }

  /**
   * Fetch market state by ID
   */
  async getMarket(marketId: number): Promise<Market | null> {
    try {
      this.logger.debug('Fetching market', { marketId });

      const [
        id,
        question,
        createdAt,
        resolutionTime,
        status,
        outcome,
        yesLiquidity,
        noLiquidity,
        resolver,
      ] = await this.contract.getMarket(marketId);

      const statusEnum = ['OPEN', 'RESOLVED', 'SETTLED'][status] || 'UNKNOWN';

      const market: Market = {
        marketId: Number(id),
        question,
        createdAt: Number(createdAt),
        resolutionTime: Number(resolutionTime),
        status: statusEnum as any,
        outcome: Number(outcome),
        yesLiquidity: BigInt(yesLiquidity.toString()),
        noLiquidity: BigInt(noLiquidity.toString()),
        resolver,
      };

      this.logger.debug('Market fetched', { market });
      return market;
    } catch (error) {
      this.logger.error('Failed to fetch market', error as Error);
      return null;
    }
  }

  /**
   * Check if market is open for trading
   */
  async isMarketOpen(marketId: number): Promise<boolean> {
    try {
      return await this.contract.isMarketOpen(marketId);
    } catch (error) {
      this.logger.error('Failed to check market status', error as Error);
      return false;
    }
  }

  /**
   * Estimate YES probability based on liquidity ratio
   * Simple model: YES prob = yesLiquidity / (yesLiquidity + noLiquidity)
   */
  estimateYesProbability(market: Market): number {
    const total = market.yesLiquidity + market.noLiquidity;
    if (total === 0n) return 50; // No trading yet, assume 50/50

    const yesProb = Number(market.yesLiquidity * 100n) / Number(total);
    return Math.round(yesProb);
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/marketFetcher.ts`
- [ ] Implement MarketFetcher class

---

## Step 6: Create Mandate Fetcher

**File:** `src/mandateFetcher.ts`

```typescript
import { ethers } from 'ethers';
import { Mandate, Logger } from './types';

// Minimal ABI for DelegationPolicy
const POLICY_ABI = [
  'function getMandate(address smartAccount, address agent) external view returns (tuple(address agent, uint256 maxTradeSize, address[] allowedMarkets, uint256 expiryTime, bool isActive, uint256 createdAt))',
  'function isAgentAuthorized(address smartAccount, address agent) external view returns (bool)',
];

export class MandateFetcher {
  private contract: ethers.Contract;
  private logger: Logger;

  constructor(
    policyAddress: string,
    rpcUrl: string,
    logger: Logger
  ) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(policyAddress, POLICY_ABI, provider);
    this.logger = logger;
  }

  /**
   * Fetch mandate for agent on smart account
   */
  async getMandate(
    smartAccount: string,
    agentAddress: string
  ): Promise<Mandate | null> {
    try {
      this.logger.debug('Fetching mandate', { smartAccount, agentAddress });

      const [
        agent,
        maxTradeSize,
        allowedMarkets,
        expiryTime,
        isActive,
        createdAt,
      ] = await this.contract.getMandate(smartAccount, agentAddress);

      const mandate: Mandate = {
        agent,
        maxTradeSize: BigInt(maxTradeSize.toString()),
        allowedMarkets,
        expiryTime: Number(expiryTime),
        isActive,
        createdAt: Number(createdAt),
      };

      this.logger.debug('Mandate fetched', { mandate });
      return mandate;
    } catch (error) {
      this.logger.error('Failed to fetch mandate', error as Error);
      return null;
    }
  }

  /**
   * Check if agent is currently authorized
   */
  async isAuthorized(
    smartAccount: string,
    agentAddress: string
  ): Promise<boolean> {
    try {
      return await this.contract.isAgentAuthorized(smartAccount, agentAddress);
    } catch (error) {
      this.logger.error('Failed to check authorization', error as Error);
      return false;
    }
  }

  /**
   * Check if mandate has expired
   */
  isMandateExpired(mandate: Mandate): boolean {
    return mandate.expiryTime < Math.floor(Date.now() / 1000);
  }

  /**
   * Check if market is whitelisted
   */
  isMarketWhitelisted(mandate: Mandate, marketAddress: string): boolean {
    return mandate.allowedMarkets.some(
      (addr) => addr.toLowerCase() === marketAddress.toLowerCase()
    );
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/mandateFetcher.ts`
- [ ] Implement MandateFetcher class

---

## Step 7: Create Strategy Engine

**File:** `src/strategy.ts`

```typescript
import {
  StrategyContext,
  StrategyResult,
  TradeSignal,
  TradeDirection,
  Logger,
} from './types';
import { MarketFetcher } from './marketFetcher';

/**
 * Simple rule-based strategy for MVP
 *
 * Rules:
 * 1. If YES probability > 60%, buy YES
 * 2. If NO probability > 60%, buy NO
 * 3. Otherwise, no trade (wait)
 */
export class SimpleStrategy {
  private marketFetcher: MarketFetcher;
  private logger: Logger;
  private readonly YES_THRESHOLD = 60;  // 60% confidence to trade YES
  private readonly NO_THRESHOLD = 40;   // 40% or less to trade NO

  constructor(marketFetcher: MarketFetcher, logger: Logger) {
    this.marketFetcher = marketFetcher;
    this.logger = logger;
  }

  /**
   * Run strategy and generate trade signal
   */
  async run(context: StrategyContext): Promise<StrategyResult> {
    this.logger.info('Running strategy', { agentId: context.agentId });

    // Validate mandate is active
    if (!context.mandate.isActive) {
      this.logger.warn('Mandate is inactive, skipping trade', {
        agentId: context.agentId,
      });
      return {
        signal: null,
        nextCheckTime: context.timestamp + 60, // Recheck in 1 min
      };
    }

    // Find best market to trade
    for (const market of context.markets) {
      if (market.status !== 'OPEN') continue;

      const yesProbability = this.marketFetcher.estimateYesProbability(market);
      this.logger.debug('Market analysis', {
        marketId: market.marketId,
        yesProbability,
      });

      // Rule 1: YES signal
      if (yesProbability > this.YES_THRESHOLD) {
        return {
          signal: this.createTradeSignal(
            market.marketId,
            TradeDirection.YES,
            yesProbability,
            context
          ),
          nextCheckTime: context.timestamp + context.mandate.expiryTime,
        };
      }

      // Rule 2: NO signal
      if (yesProbability < this.NO_THRESHOLD) {
        return {
          signal: this.createTradeSignal(
            market.marketId,
            TradeDirection.NO,
            100 - yesProbability,
            context
          ),
          nextCheckTime: context.timestamp + context.mandate.expiryTime,
        };
      }
    }

    // No signal
    this.logger.info('No trade signal generated');
    return {
      signal: null,
      nextCheckTime: context.timestamp + 300, // Recheck in 5 min
    };
  }

  /**
   * Create a trade signal with position sizing
   */
  private createTradeSignal(
    marketId: number,
    direction: TradeDirection,
    confidence: number,
    context: StrategyContext
  ): TradeSignal {
    // Position sizing: smaller positions for lower confidence
    // confidence 60 → 50% of max
    // confidence 80 → 100% of max
    const sizeMultiplier = Math.max(0.5, (confidence - 50) / 30);
    const suggestedSize = (context.mandate.maxTradeSize * BigInt(Math.floor(sizeMultiplier * 100))) / 100n;

    return {
      marketId,
      direction,
      confidence: Math.round(confidence),
      reasoning: direction === TradeDirection.YES 
        ? `YES probability ${confidence.toFixed(1)}% > ${this.YES_THRESHOLD}% threshold`
        : `NO probability ${(100 - confidence).toFixed(1)}% > ${100 - this.NO_THRESHOLD}% threshold`,
      suggestedSize,
    };
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/strategy.ts`
- [ ] Implement SimpleStrategy class

---

## Step 8: Create Position Sizer

**File:** `src/positionSizer.ts`

```typescript
import { Mandate, Logger, TradeSignal } from './types';

export class PositionSizer {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Validate and size position according to mandate
   */
  sizePosition(signal: TradeSignal, mandate: Mandate): bigint {
    this.logger.debug('Sizing position', {
      signal: signal.suggestedSize.toString(),
      max: mandate.maxTradeSize.toString(),
    });

    // Enforce mandate max trade size
    const position = signal.suggestedSize > mandate.maxTradeSize
      ? mandate.maxTradeSize
      : signal.suggestedSize;

    this.logger.info('Position sized', {
      marketId: signal.marketId,
      direction: signal.direction,
      position: position.toString(),
      reasoning: signal.reasoning,
    });

    return position;
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/positionSizer.ts`
- [ ] Implement PositionSizer class

---

## Step 9: Create User Operation Builder

**File:** `src/userOpBuilder.ts`

```typescript
import { ethers } from 'ethers';
import { Logger, TradeDirection } from './types';

// Minimal ABI for PredictionMarket.trade()
const MARKET_ABI = [
  'function trade(uint256 marketId, uint256 agentId, uint256 shareSize, uint8 direction) external returns (uint256)',
];

export class UserOpBuilder {
  private marketAddress: string;
  private marketInterface: ethers.Interface;
  private logger: Logger;

  constructor(marketAddress: string, logger: Logger) {
    this.marketAddress = marketAddress;
    this.marketInterface = new ethers.Interface(MARKET_ABI);
    this.logger = logger;
  }

  /**
   * Build callData for trade execution
   */
  buildTradeCallData(
    marketId: number,
    agentId: number,
    position: bigint,
    direction: TradeDirection
  ): string {
    this.logger.debug('Building trade callData', {
      marketId,
      agentId,
      position: position.toString(),
      direction,
    });

    const callData = this.marketInterface.encodeFunctionData('trade', [
      marketId,
      agentId,
      position,
      direction,
    ]);

    this.logger.debug('CallData built', { callData });
    return callData;
  }

  /**
   * Build full user operation for Thirdweb
   * Returns the raw transaction data to be wrapped in UserOp
   */
  buildTradeTransaction(
    marketId: number,
    agentId: number,
    position: bigint,
    direction: TradeDirection
  ): {
    to: string;
    data: string;
    value: string;
  } {
    const callData = this.buildTradeCallData(
      marketId,
      agentId,
      position,
      direction
    );

    return {
      to: this.marketAddress,
      data: callData,
      value: '0', // No ETH value for this trade
    };
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/userOpBuilder.ts`
- [ ] Implement UserOpBuilder class

---

## Step 10: Create Execution Handler

**File:** `src/executor.ts`

```typescript
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { Account } from '@thirdweb-dev/sdk';
import { Logger, ExecutionResult, AgentConfig, TradeDirection } from './types';
import { UserOpBuilder } from './userOpBuilder';

export class Executor {
  private sdk: ThirdwebSDK;
  private smartAccount: Account;
  private userOpBuilder: UserOpBuilder;
  private logger: Logger;
  private config: AgentConfig;

  constructor(
    sdk: ThirdwebSDK,
    smartAccount: Account,
    userOpBuilder: UserOpBuilder,
    config: AgentConfig,
    logger: Logger
  ) {
    this.sdk = sdk;
    this.smartAccount = smartAccount;
    this.userOpBuilder = userOpBuilder;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Execute trade via Thirdweb smart account
   */
  async executeTrade(
    marketId: number,
    agentId: number,
    position: bigint,
    direction: TradeDirection
  ): Promise<ExecutionResult> {
    try {
      this.logger.info('Starting trade execution', {
        marketId,
        agentId,
        position: position.toString(),
        direction,
      });

      // Build transaction
      const tx = this.userOpBuilder.buildTradeTransaction(
        marketId,
        agentId,
        position,
        direction
      );

      this.logger.debug('Transaction built', { tx });

      // Send via smart account (handles user op creation + gas estimation)
      const receipt = await this.smartAccount.execute([tx]);

      this.logger.info('Trade executed successfully', {
        txHash: receipt.receipt?.transactionHash,
      });

      return {
        success: true,
        txHash: receipt.receipt?.transactionHash,
      };
    } catch (error) {
      this.logger.error('Trade execution failed', error as Error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/executor.ts`
- [ ] Implement Executor class

---

## Step 11: Create Agent Main Loop

**File:** `src/agent.ts`

```typescript
import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import {
  AgentConfig,
  Logger,
  Mandate,
  Market,
  StrategyContext,
} from './types';
import { MarketFetcher } from './marketFetcher';
import { MandateFetcher } from './mandateFetcher';
import { SimpleStrategy } from './strategy';
import { PositionSizer } from './positionSizer';
import { UserOpBuilder } from './userOpBuilder';
import { Executor } from './executor';

export class Agent {
  private config: AgentConfig;
  private logger: Logger;
  private marketFetcher: MarketFetcher;
  private mandateFetcher: MandateFetcher;
  private strategy: SimpleStrategy;
  private positionSizer: PositionSizer;
  private userOpBuilder: UserOpBuilder;
  private executor: Executor | null = null;
  private isRunning = false;

  constructor(
    config: AgentConfig,
    logger: Logger
  ) {
    this.config = config;
    this.logger = logger;

    this.marketFetcher = new MarketFetcher(
      config.predictionMarketAddress,
      config.rpcUrl,
      logger
    );

    this.mandateFetcher = new MandateFetcher(
      config.delegationPolicyAddress,
      config.rpcUrl,
      logger
    );

    this.strategy = new SimpleStrategy(this.marketFetcher, logger);
    this.positionSizer = new PositionSizer(logger);
    this.userOpBuilder = new UserOpBuilder(
      config.predictionMarketAddress,
      logger
    );
  }

  /**
   * Initialize Thirdweb SDK and smart account
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Thirdweb SDK');

      // TODO: Initialize Thirdweb SDK
      // const sdk = ThirdwebSDK.fromPrivateKey(
      //   this.config.agentPrivateKey,
      //   this.config.rpcUrl,
      //   { clientId: this.config.thirdwebClientId }
      // );

      // TODO: Connect to smart account
      // const smartAccount = await sdk.getContract(
      //   this.config.smartAccountAddress
      // );

      this.logger.info('Thirdweb SDK initialized');
    } catch (error) {
      this.logger.error('Failed to initialize SDK', error as Error);
      throw error;
    }
  }

  /**
   * Fetch mandate and markets
   */
  private async fetchContext(): Promise<StrategyContext | null> {
    try {
      // Get agent address from config
      const agentAddress = new (require('ethers')).Wallet(
        this.config.agentPrivateKey
      ).address;

      // Fetch mandate
      const mandate = await this.mandateFetcher.getMandate(
        this.config.smartAccountAddress,
        agentAddress
      );

      if (!mandate) {
        this.logger.error('No active mandate found');
        return null;
      }

      // Check if expired
      if (this.mandateFetcher.isMandateExpired(mandate)) {
        this.logger.warn('Mandate has expired');
        return null;
      }

      // Fetch all open markets (simplified: just marketId 1 for MVP)
      const market = await this.marketFetcher.getMarket(1);
      if (!market) {
        this.logger.error('Could not fetch market');
        return null;
      }

      return {
        markets: [market],
        position: null, // TODO: Fetch actual position
        mandate,
        agentId: this.config.agentId,
        timestamp: Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      this.logger.error('Failed to fetch context', error as Error);
      return null;
    }
  }

  /**
   * Main agent loop
   */
  async run(): Promise<void> {
    await this.initialize();
    this.isRunning = true;

    this.logger.info('Agent loop starting', {
      agentId: this.config.agentId,
      rebalanceInterval: this.config.rebalanceInterval,
    });

    while (this.isRunning) {
      try {
        const context = await this.fetchContext();
        if (!context) {
          this.logger.warn('Failed to fetch context, retrying in 60s');
          await this.sleep(60000);
          continue;
        }

        // Run strategy
        const { signal, nextCheckTime } = await this.strategy.run(context);

        if (signal) {
          // Size position
          const position = this.positionSizer.sizePosition(
            signal,
            context.mandate
          );

          // Execute via Thirdweb (placeholder)
          if (this.executor) {
            const result = await this.executor.executeTrade(
              signal.marketId,
              this.config.agentId,
              position,
              signal.direction
            );

            if (result.success) {
              this.logger.info('Trade executed', result);
            } else {
              this.logger.error('Trade failed', new Error(result.error));
            }
          }
        } else {
          this.logger.debug('No trade signal generated');
        }

        // Sleep until next check
        const sleepTime = Math.max(0, nextCheckTime - Math.floor(Date.now() / 1000)) * 1000;
        this.logger.debug('Sleeping', { sleepTime });
        await this.sleep(sleepTime);
      } catch (error) {
        this.logger.error('Agent loop error', error as Error);
        await this.sleep(60000); // Wait 60s before retry
      }
    }
  }

  /**
   * Stop the agent loop
   */
  stop(): void {
    this.logger.info('Stopping agent');
    this.isRunning = false;
  }

  /**
   * Utility: sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/agent.ts`
- [ ] Implement Agent class

---

## Step 12: Create Entry Point

**File:** `src/index.ts`

```typescript
import { loadConfig, validateConfig } from './config';
import { createLogger } from './logger';
import { Agent } from './agent';

async function main() {
  try {
    // Load and validate config
    const config = loadConfig();
    validateConfig(config);

    // Create logger
    const logger = createLogger(
      process.env.LOG_LEVEL as any || 'info'
    );

    logger.info('Ayin Agent starting', {
      agentId: config.agentId,
      network: config.chainId,
    });

    // Create and run agent
    const agent = new Agent(config, logger);
    await agent.run();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
```

**Status:** ⏳ TODO
- [ ] Create `src/index.ts`

---

## Step 13: Write Unit Tests

**File:** `src/__tests__/strategy.test.ts`

```typescript
import { SimpleStrategy } from '../strategy';
import { MarketFetcher } from '../marketFetcher';
import { createLogger } from '../logger';
import {
  Market,
  Mandate,
  StrategyContext,
  MarketStatus,
  Outcome,
  TradeDirection,
} from '../types';

describe('SimpleStrategy', () => {
  let strategy: SimpleStrategy;
  let mockMarketFetcher: jest.Mocked<MarketFetcher>;
  const logger = createLogger('debug');

  beforeEach(() => {
    mockMarketFetcher = {
      estimateYesProbability: jest.fn(),
    } as any;

    strategy = new SimpleStrategy(mockMarketFetcher, logger);
  });

  it('should generate YES signal when probability > 60%', async () => {
    mockMarketFetcher.estimateYesProbability.mockReturnValue(75);

    const market: Market = {
      marketId: 1,
      question: 'Test?',
      createdAt: Math.floor(Date.now() / 1000),
      resolutionTime: Math.floor(Date.now() / 1000) + 86400,
      status: MarketStatus.OPEN,
      outcome: Outcome.UNRESOLVED,
      yesLiquidity: BigInt(1000e18),
      noLiquidity: BigInt(500e18),
      resolver: '0x1234',
    };

    const mandate: Mandate = {
      agent: '0x5678',
      maxTradeSize: BigInt(100e18),
      allowedMarkets: ['0x1234'],
      expiryTime: Math.floor(Date.now() / 1000) + 86400,
      isActive: true,
      createdAt: Math.floor(Date.now() / 1000),
    };

    const context: StrategyContext = {
      markets: [market],
      position: null,
      mandate,
      agentId: 1,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const result = await strategy.run(context);

    expect(result.signal).not.toBeNull();
    expect(result.signal?.direction).toBe(TradeDirection.YES);
    expect(result.signal?.confidence).toBe(75);
  });

  it('should generate NO signal when probability < 40%', async () => {
    mockMarketFetcher.estimateYesProbability.mockReturnValue(25);

    const market: Market = {
      marketId: 1,
      question: 'Test?',
      createdAt: Math.floor(Date.now() / 1000),
      resolutionTime: Math.floor(Date.now() / 1000) + 86400,
      status: MarketStatus.OPEN,
      outcome: Outcome.UNRESOLVED,
      yesLiquidity: BigInt(500e18),
      noLiquidity: BigInt(1000e18),
      resolver: '0x1234',
    };

    const mandate: Mandate = {
      agent: '0x5678',
      maxTradeSize: BigInt(100e18),
      allowedMarkets: ['0x1234'],
      expiryTime: Math.floor(Date.now() / 1000) + 86400,
      isActive: true,
      createdAt: Math.floor(Date.now() / 1000),
    };

    const context: StrategyContext = {
      markets: [market],
      position: null,
      mandate,
      agentId: 1,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const result = await strategy.run(context);

    expect(result.signal).not.toBeNull();
    expect(result.signal?.direction).toBe(TradeDirection.NO);
    expect(result.signal?.confidence).toBe(75); // 100 - 25
  });

  it('should not generate signal when probability is neutral', async () => {
    mockMarketFetcher.estimateYesProbability.mockReturnValue(50);

    const market: Market = {
      marketId: 1,
      question: 'Test?',
      createdAt: Math.floor(Date.now() / 1000),
      resolutionTime: Math.floor(Date.now() / 1000) + 86400,
      status: MarketStatus.OPEN,
      outcome: Outcome.UNRESOLVED,
      yesLiquidity: BigInt(1000e18),
      noLiquidity: BigInt(1000e18),
      resolver: '0x1234',
    };

    const mandate: Mandate = {
      agent: '0x5678',
      maxTradeSize: BigInt(100e18),
      allowedMarkets: ['0x1234'],
      expiryTime: Math.floor(Date.now() / 1000) + 86400,
      isActive: true,
      createdAt: Math.floor(Date.now() / 1000),
    };

    const context: StrategyContext = {
      markets: [market],
      position: null,
      mandate,
      agentId: 1,
      timestamp: Math.floor(Date.now() / 1000),
    };

    const result = await strategy.run(context);

    expect(result.signal).toBeNull();
  });
});
```

**Status:** ⏳ TODO
- [ ] Create `src/__tests__/` directory
- [ ] Create `strategy.test.ts`
- [ ] Run: `npm test`

---

## Step 14: Integration Test (Simulation)

**File:** `src/__tests__/integration.test.ts`

```typescript
import { Agent } from '../agent';
import { loadConfig } from '../config';
import { createLogger } from '../logger';

describe('Agent Integration', () => {
  it('should initialize without errors', async () => {
    // This is a placeholder; real test would mock Thirdweb SDK
    const config = {
      agentPrivateKey: '0x' + '1'.repeat(64),
      agentId: 1,
      smartAccountAddress: '0x' + '2'.repeat(40),
      chainId: 84532,
      rpcUrl: 'http://localhost:8545',
      thirdwebClientId: 'test-client-id',
      predictionMarketAddress: '0x' + '3'.repeat(40),
      delegationPolicyAddress: '0x' + '4'.repeat(40),
      agentRegistryAddress: '0x' + '5'.repeat(40),
      maxPositionSize: BigInt(1000e18),
      rebalanceInterval: 3600,
    };

    const logger = createLogger('debug');
    const agent = new Agent(config, logger);

    // For real integration test, would:
    // 1. Start anvil with test contracts deployed
    // 2. Create test mandate
    // 3. Run agent for N iterations
    // 4. Verify trades were executed

    expect(agent).toBeDefined();
  });
});
```

**Status:** ⏳ TODO
- [ ] Create `integration.test.ts`

---

## Step 15: Run Locally

```bash
# Build TypeScript
npm run build

# Run with test config
export $(cat .env | grep -v '#' | xargs)
npm run dev

# Or via ts-node directly
npx ts-node src/index.ts
```

**Status:** ⏳ TODO
- [ ] Create `.env` from `.env.example`
- [ ] Run `npm run build`
- [ ] Run `npm run dev` (should connect to testnet)

---

## Summary Checklist

| Step | Task | Status |
|------|------|--------|
| 1 | Project setup | ⏳ TODO |
| 2 | Type interfaces | ⏳ TODO |
| 3 | Config module | ⏳ TODO |
| 4 | Logger | ⏳ TODO |
| 5 | Market fetcher | ⏳ TODO |
| 6 | Mandate fetcher | ⏳ TODO |
| 7 | Strategy engine | ⏳ TODO |
| 8 | Position sizer | ⏳ TODO |
| 9 | User op builder | ⏳ TODO |
| 10 | Executor | ⏳ TODO |
| 11 | Agent main loop | ⏳ TODO |
| 12 | Entry point | ⏳ TODO |
| 13 | Unit tests | ⏳ TODO |
| 14 | Integration test | ⏳ TODO |
| 15 | Run locally | ⏳ TODO |

---

## Agent Data Flow (Complete)

```
1. Agent starts (index.ts)
   ↓
2. Initialize Thirdweb SDK + SmartAccount
   ↓
3. Fetch mandate from chain
   - Check active?
   - Check not expired?
   - Get max trade size, allowed markets
   ↓
4. Fetch market states
   - Query liquidity ratios
   - Estimate YES/NO probabilities
   ↓
5. Run strategy
   - IF probability > 60% → signal YES
   - IF probability < 40% → signal NO
   - ELSE → wait
   ↓
6. Size position
   - Suggested size from strategy
   - Respect mandate maxTradeSize
   - Enforce liquidity limits
   ↓
7. Build user operation
   - Encode trade() callData
   - Set market address, agent ID, size, direction
   ↓
8. Execute via Thirdweb SmartAccount
   - Create UserOp
   - Estimate gas
   - Sign + send to bundler
   ↓
9. Emit event
   - TradeExecuted with agentId
   - Logged for reputation system
   ↓
10. Sleep and loop
    - Recheck in ~5 min
    - Or per mandate settings
```

---

## Key Design Patterns

**Why separate classes per concern?**
- `MarketFetcher` — Only reads market data
- `MandateFetcher` — Only reads mandate data
- `SimpleStrategy` — Only generates signals
- `PositionSizer` — Only sizes positions
- `UserOpBuilder` — Only builds transactions
- `Executor` — Only executes (via Thirdweb)
- `Agent` — Orchestrates the flow

**Why Thirdweb SDK?**
- Handles user op creation automatically
- Gas estimation built-in
- Smart account support for Base
- One line to execute: `smartAccount.execute([tx])`

**Why mock-friendly architecture?**
- Each component can be tested independently
- Easy to swap MarketFetcher with mock for tests
- Strategy tests don't need real chain

---

## Next: After Agent Core

1. **Connect to real Thirdweb SmartAccount** (replace TODOs in Executor)
2. **Deploy to Base Sepolia testnet**
3. **Create mandates and test agent execution**
4. **Add reputation tracking (off-chain indexing of events)**
5. **Multi-agent support (multiple agents on same smart account)**
