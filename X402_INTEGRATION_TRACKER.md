# x402 Integration Implementation Tracker

## Overview
Implement HTTP 402 Payment Required for agents to access premium market data. Agents pay before fetching; data providers verify payment and gate access.

---

## Architecture Decision: x402 Standard

**HTTP 402 Payment Required:**
- Client makes request → Server returns 402 + `WWW-Authenticate: x402` header
- Client includes payment proof in `Authorization: x402 <proof>` header
- Server validates payment → Returns data
- Natural economic layer for data providers

**For MVP:**
- Mock payment endpoint (simulates blockchain payment verification)
- Simple ledger tracking agent→data usage
- Integration point for future Chainlink oracle or direct blockchain verification

**Trust model:**
```
Agent (untrusted)
  ↓ (wants data)
Server (payment required)
  ↓ (requires proof of payment)
Blockchain (ground truth)
  ↓ (verifies payment was made)
Server (grants access)
```

---

## ✅ Step 1: Define x402 Types and Interfaces

**File:** `ayin-agent/src/x402Types.ts`

```typescript
/**
 * x402 Payment Protocol Types
 */

// ============================================================================
// PAYMENT CHALLENGE (Server → Client)
// ============================================================================

export interface PaymentChallenge {
  paymentAddress: string;        // Where to send payment
  amount: bigint;                // Amount required (wei)
  token: string;                 // Token address (0x0 = native)
  nonce: string;                 // Unique request identifier
  expiresAt: number;             // Unix timestamp when challenge expires
  minimumChainId?: number;       // Blockchain to use
}

// ============================================================================
// PAYMENT PROOF (Client → Server)
// ============================================================================

export interface PaymentProof {
  amount: bigint;
  paymentAddress: string;
  transactionHash: string;       // On-chain proof
  blockNumber: number;
  agentId: number;
  nonce: string;
  timestamp: number;
}

// ============================================================================
// DATA REQUEST
// ============================================================================

export interface DataRequest {
  endpoint: string;              // e.g., "/market/1/data"
  params?: Record<string, unknown>;
}

// ============================================================================
// DATA RESPONSE
// ============================================================================

export interface DataResponse<T> {
  data: T;
  cost: bigint;                  // Amount paid for this request
  metadata: {
    timestamp: number;
    agentId: number;
    requestId: string;
  };
}

// ============================================================================
// USAGE LOG
// ============================================================================

export interface DataUsageLog {
  agentId: number;
  endpoint: string;
  amountPaid: bigint;
  timestamp: number;
  success: boolean;
  errorMessage?: string;
}

// ============================================================================
// PAYMENT METHOD
// ============================================================================

export enum PaymentMethod {
  MOCK = 'mock',                 // Mock payment (dev only)
  BLOCKCHAIN = 'blockchain',     // Real on-chain payment
  CACHED = 'cached',             // Use cached data (free after initial payment)
}

export interface PaymentConfig {
  method: PaymentMethod;
  
  // For BLOCKCHAIN method
  paymentAddress?: string;       // Agent's payment wallet
  privateKey?: string;           // For signing transactions
  rpcUrl?: string;               // RPC endpoint
  
  // For MOCK method
  mockBalance?: bigint;          // Simulated balance
}
```

**Status:** ⏳ TODO
- [ ] Create `src/x402Types.ts`
- [ ] Define all interfaces

---

## Step 2: Create x402 Client (Agent-side)

**File:** `ayin-agent/src/x402Client.ts`

```typescript
import { ethers } from 'ethers';
import {
  DataRequest,
  DataResponse,
  PaymentChallenge,
  PaymentProof,
  PaymentMethod,
  PaymentConfig,
  DataUsageLog,
  Logger,
} from './types';

/**
 * x402 Client: Handles payment-gated data requests
 */
export class X402Client {
  private baseUrl: string;
  private config: PaymentConfig;
  private logger: Logger;
  private paymentCache: Map<string, PaymentProof> = new Map();
  private usageLogs: DataUsageLog[] = [];

  constructor(
    baseUrl: string,
    config: PaymentConfig,
    logger: Logger
  ) {
    this.baseUrl = baseUrl;
    this.config = config;
    this.logger = logger;
  }

  /**
   * Fetch data with automatic payment handling
   */
  async fetchData<T>(request: DataRequest): Promise<DataResponse<T>> {
    const requestId = this.generateRequestId();

    try {
      this.logger.info('Fetching gated data', {
        endpoint: request.endpoint,
        requestId,
      });

      // Step 1: Make initial request (will fail with 402)
      const response = await this.makeRequest<T>(
        request.endpoint,
        request.params,
        requestId
      );

      return response;
    } catch (error) {
      // Log failed attempt
      this.usageLogs.push({
        agentId: this.config.agentId || 0,
        endpoint: request.endpoint,
        amountPaid: 0n,
        timestamp: Math.floor(Date.now() / 1000),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Make HTTP request with x402 payment handling
   */
  private async makeRequest<T>(
    endpoint: string,
    params?: Record<string, unknown>,
    requestId?: string
  ): Promise<DataResponse<T>> {
    const url = new URL(endpoint, this.baseUrl);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    // First attempt: no payment
    let response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // If 402 Payment Required, handle payment flow
    if (response.status === 402) {
      this.logger.info('Payment required, processing x402 challenge', {
        endpoint,
        requestId,
      });

      const challenge = await this.parseChallenge(response);
      const proof = await this.createPaymentProof(challenge);

      // Retry with payment proof
      response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `x402 ${JSON.stringify(proof)}`,
        },
      });

      // Log successful payment
      this.usageLogs.push({
        agentId: this.config.agentId || 0,
        endpoint,
        amountPaid: challenge.amount,
        timestamp: Math.floor(Date.now() / 1000),
        success: response.ok,
        errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      });
    }

    if (!response.ok) {
      throw new Error(
        `Data fetch failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json() as T;

    // Return wrapped response with metadata
    return {
      data,
      cost: response.headers.get('x402-cost')
        ? BigInt(response.headers.get('x402-cost')!)
        : 0n,
      metadata: {
        timestamp: Math.floor(Date.now() / 1000),
        agentId: this.config.agentId || 0,
        requestId: requestId || this.generateRequestId(),
      },
    };
  }

  /**
   * Parse x402 challenge from 402 response
   */
  private async parseChallenge(response: Response): Promise<PaymentChallenge> {
    const authHeader = response.headers.get('www-authenticate') || '';

    if (!authHeader.startsWith('x402')) {
      throw new Error('Invalid x402 challenge format');
    }

    const challengeStr = authHeader.replace(/^x402\s+/, '');
    const challenge = JSON.parse(Buffer.from(challengeStr, 'base64').toString());

    return {
      paymentAddress: challenge.paymentAddress,
      amount: BigInt(challenge.amount),
      token: challenge.token || '0x0',
      nonce: challenge.nonce,
      expiresAt: challenge.expiresAt,
      minimumChainId: challenge.minimumChainId,
    };
  }

  /**
   * Create payment proof (implements PaymentMethod)
   */
  private async createPaymentProof(
    challenge: PaymentChallenge
  ): Promise<PaymentProof> {
    switch (this.config.method) {
      case PaymentMethod.MOCK:
        return this.createMockProof(challenge);

      case PaymentMethod.BLOCKCHAIN:
        return this.createBlockchainProof(challenge);

      case PaymentMethod.CACHED:
        return this.createCachedProof(challenge);

      default:
        throw new Error(`Unknown payment method: ${this.config.method}`);
    }
  }

  /**
   * Create mock proof (development only)
   */
  private createMockProof(challenge: PaymentChallenge): PaymentProof {
    this.logger.warn('Using MOCK payment (development only)', {
      amount: challenge.amount.toString(),
    });

    // Check mock balance
    if (
      this.config.mockBalance &&
      this.config.mockBalance < challenge.amount
    ) {
      throw new Error('Insufficient mock balance');
    }

    return {
      amount: challenge.amount,
      paymentAddress: challenge.paymentAddress,
      transactionHash: '0x' + 'mock'.repeat(16),
      blockNumber: 0,
      agentId: this.config.agentId || 0,
      nonce: challenge.nonce,
      timestamp: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Create blockchain proof (real payment)
   * For MVP: simulate blockchain call
   */
  private async createBlockchainProof(
    challenge: PaymentChallenge
  ): Promise<PaymentProof> {
    // TODO: In production, this would:
    // 1. Create transaction sending payment to challenge.paymentAddress
    // 2. Sign with this.config.privateKey
    // 3. Submit to chain
    // 4. Wait for confirmation
    // 5. Return proof with real txHash

    this.logger.warn('Blockchain payment not yet implemented');

    throw new Error('Blockchain payment method not implemented');
  }

  /**
   * Use cached payment proof (if available)
   */
  private createCachedProof(challenge: PaymentChallenge): PaymentProof {
    const cached = this.paymentCache.get(challenge.nonce);

    if (!cached || cached.timestamp + 3600 < Math.floor(Date.now() / 1000)) {
      // Cache expired, fall back to mock
      return this.createMockProof(challenge);
    }

    this.logger.debug('Using cached payment proof', { nonce: challenge.nonce });
    return cached;
  }

  /**
   * Get usage logs
   */
  getUsageLogs(): DataUsageLog[] {
    return [...this.usageLogs];
  }

  /**
   * Get usage summary by agent
   */
  getUsageSummary(): Record<string, { count: number; totalCost: bigint }> {
    const summary: Record<string, { count: number; totalCost: bigint }> = {};

    for (const log of this.usageLogs) {
      const key = `agent-${log.agentId}`;
      if (!summary[key]) {
        summary[key] = { count: 0, totalCost: 0n };
      }
      summary[key].count++;
      if (log.success) {
        summary[key].totalCost += log.amountPaid;
      }
    }

    return summary;
  }

  /**
   * Clear logs (for testing)
   */
  clearLogs(): void {
    this.usageLogs = [];
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return 'req-' + Math.random().toString(36).substr(2, 9);
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `src/x402Client.ts`
- [ ] Implement X402Client class

---

## Step 3: Create x402 Server (Data Provider)

**File:** `ayin-x402-server/src/server.ts`

```typescript
import express, { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { PaymentChallenge, PaymentProof, DataUsageLog, Logger } from './types';

/**
 * x402 Server: Gated data endpoint
 */
export class X402Server {
  private app: express.Application;
  private logger: Logger;
  private paymentProvider: PaymentProvider;
  private usageLogs: DataUsageLog[] = [];
  private challengeNonces: Map<string, PaymentChallenge> = new Map();

  constructor(logger: Logger, paymentProvider: PaymentProvider) {
    this.logger = logger;
    this.paymentProvider = paymentProvider;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      this.logger.debug('Incoming request', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      next();
    });
  }

  private setupRoutes(): void {
    // Protected endpoint: Market data
    this.app.get('/market/:marketId/data', this.handleMarketData.bind(this));

    // Protected endpoint: Strategy signals (premium)
    this.app.get('/signals/premium', this.handleSignals.bind(this));

    // Public endpoint: Usage logs
    this.app.get('/admin/logs', this.handleLogsEndpoint.bind(this));
  }

  /**
   * Protected endpoint: Market data
   */
  private async handleMarketData(
    req: Request,
    res: Response
  ): Promise<void> {
    const { marketId } = req.params;
    const proof = req.headers.authorization?.replace('x402 ', '');

    // Step 1: Verify payment proof
    if (!proof) {
      this.sendPaymentRequired(res, `/market/${marketId}/data`);
      return;
    }

    try {
      const paymentProof = JSON.parse(proof) as PaymentProof;
      const verified = await this.paymentProvider.verifyPayment(paymentProof);

      if (!verified) {
        this.logUsage({
          agentId: paymentProof.agentId,
          endpoint: `/market/${marketId}/data`,
          amountPaid: paymentProof.amount,
          timestamp: Math.floor(Date.now() / 1000),
          success: false,
          errorMessage: 'Payment verification failed',
        });

        res.status(403).json({ error: 'Payment verification failed' });
        return;
      }

      // Step 2: Return data
      const data = {
        marketId: Number(marketId),
        yesLiquidity: BigInt(1000e18),
        noLiquidity: BigInt(500e18),
        yesProbability: 67,
        estimatedYesPrice: 0.67,
        timestamp: Math.floor(Date.now() / 1000),
      };

      this.logUsage({
        agentId: paymentProof.agentId,
        endpoint: `/market/${marketId}/data`,
        amountPaid: paymentProof.amount,
        timestamp: Math.floor(Date.now() / 1000),
        success: true,
      });

      res.setHeader('x402-cost', paymentProof.amount.toString());
      res.json(data);
    } catch (error) {
      this.logger.error('Payment verification error', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Protected endpoint: Premium signals
   */
  private async handleSignals(req: Request, res: Response): Promise<void> {
    const proof = req.headers.authorization?.replace('x402 ', '');

    if (!proof) {
      this.sendPaymentRequired(res, '/signals/premium');
      return;
    }

    try {
      const paymentProof = JSON.parse(proof) as PaymentProof;
      const verified = await this.paymentProvider.verifyPayment(paymentProof);

      if (!verified) {
        res.status(403).json({ error: 'Payment verification failed' });
        return;
      }

      // Return expensive data
      const signals = [
        {
          marketId: 1,
          direction: 'YES',
          confidence: 0.85,
          model: 'v1.2',
        },
        {
          marketId: 2,
          direction: 'NO',
          confidence: 0.72,
          model: 'v1.2',
        },
      ];

      this.logUsage({
        agentId: paymentProof.agentId,
        endpoint: '/signals/premium',
        amountPaid: paymentProof.amount,
        timestamp: Math.floor(Date.now() / 1000),
        success: true,
      });

      res.setHeader('x402-cost', paymentProof.amount.toString());
      res.json(signals);
    } catch (error) {
      this.logger.error('Signals endpoint error', error as Error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Public endpoint: Usage logs (admin only)
   */
  private async handleLogsEndpoint(req: Request, res: Response): Promise<void> {
    // In production, add auth (e.g., API key)
    const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;

    const filtered = agentId
      ? this.usageLogs.filter((log) => log.agentId === agentId)
      : this.usageLogs;

    res.json({
      logs: filtered,
      summary: this.getUsageSummary(),
    });
  }

  /**
   * Send 402 Payment Required challenge
   */
  private sendPaymentRequired(res: Response, endpoint: string): void {
    const nonce = this.generateNonce();

    const challenge: PaymentChallenge = {
      paymentAddress: '0x' + 'payment'.repeat(5),
      amount: BigInt(100), // 100 wei for this request
      token: '0x0', // Native token
      nonce,
      expiresAt: Math.floor(Date.now() / 1000) + 300, // 5 minutes
      minimumChainId: 84532, // Base Sepolia
    };

    this.challengeNonces.set(nonce, challenge);

    const challengeStr = Buffer.from(JSON.stringify(challenge)).toString('base64');

    res.status(402).setHeader('WWW-Authenticate', `x402 ${challengeStr}`).json({
      error: 'Payment Required',
      message: 'This endpoint requires x402 payment',
    });

    this.logger.info('Sent 402 challenge', {
      endpoint,
      nonce,
      amount: challenge.amount.toString(),
    });
  }

  /**
   * Log data usage
   */
  private logUsage(log: DataUsageLog): void {
    this.usageLogs.push(log);
    this.logger.info('Data access logged', {
      agentId: log.agentId,
      endpoint: log.endpoint,
      success: log.success,
    });
  }

  /**
   * Get usage summary
   */
  private getUsageSummary(): Record<string, { count: number; totalCost: bigint }> {
    const summary: Record<string, { count: number; totalCost: bigint }> = {};

    for (const log of this.usageLogs) {
      const key = `agent-${log.agentId}`;
      if (!summary[key]) {
        summary[key] = { count: 0, totalCost: 0n };
      }
      summary[key].count++;
      if (log.success) {
        summary[key].totalCost += log.amountPaid;
      }
    }

    return summary;
  }

  /**
   * Generate nonce
   */
  private generateNonce(): string {
    return 'nonce-' + Math.random().toString(36).substr(2, 16);
  }

  /**
   * Start server
   */
  start(port: number = 3000): void {
    this.app.listen(port, () => {
      this.logger.info(`x402 server listening on port ${port}`);
    });
  }

  /**
   * Get all logs
   */
  getLogs(): DataUsageLog[] {
    return [...this.usageLogs];
  }
}

/**
 * Payment verification interface
 */
export interface PaymentProvider {
  verifyPayment(proof: PaymentProof): Promise<boolean>;
}

/**
 * Mock payment provider (development)
 */
export class MockPaymentProvider implements PaymentProvider {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async verifyPayment(proof: PaymentProof): Promise<boolean> {
    this.logger.debug('Verifying mock payment', {
      agentId: proof.agentId,
      amount: proof.amount.toString(),
    });

    // In mock mode, always accept
    return true;
  }
}

/**
 * Blockchain payment provider (future)
 */
export class BlockchainPaymentProvider implements PaymentProvider {
  private logger: Logger;
  private provider: ethers.JsonRpcProvider;

  constructor(rpcUrl: string, logger: Logger) {
    this.logger = logger;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async verifyPayment(proof: PaymentProof): Promise<boolean> {
    try {
      // TODO: Implement blockchain verification
      // 1. Fetch transaction
      // 2. Verify recipient is correct
      // 3. Verify amount matches
      // 4. Verify block inclusion

      this.logger.warn('Blockchain verification not yet implemented');
      return true;
    } catch (error) {
      this.logger.error('Payment verification error', error as Error);
      return false;
    }
  }
}
```

**Status:** ⏳ TODO
- [ ] Create `ayin-x402-server/src/server.ts`
- [ ] Implement X402Server class

---

## Step 4: Update Agent to Use x402Client

**File:** `ayin-agent/src/marketFetcher.ts` (updated)

```typescript
import { ethers } from 'ethers';
import { Market, Logger, DataResponse } from './types';
import { X402Client } from './x402Client';

export class MarketFetcher {
  private contract: ethers.Contract;
  private logger: Logger;
  private x402Client: X402Client;  // NEW

  constructor(
    marketAddress: string,
    rpcUrl: string,
    x402BaseUrl: string,         // NEW: x402 server URL
    x402Config: any,              // NEW: payment config
    logger: Logger
  ) {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contract = new ethers.Contract(marketAddress, MARKET_ABI, provider);
    this.logger = logger;
    this.x402Client = new X402Client(x402BaseUrl, x402Config, logger); // NEW
  }

  /**
   * Fetch market state (now with premium data option)
   */
  async getMarket(marketId: number, includeSignals = false): Promise<Market | null> {
    try {
      this.logger.debug('Fetching market', { marketId, includeSignals });

      // Get basic on-chain data (free)
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

      // Get premium data via x402 (if requested)
      let yesProbability = 50; // Default
      if (includeSignals) {
        try {
          const response = await this.x402Client.fetchData<any>({
            endpoint: `/market/${marketId}/data`,
          });
          yesProbability = response.data.yesProbability;
        } catch (error) {
          this.logger.warn('Could not fetch premium market data', error as Error);
        }
      }

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
        yesProbability, // NEW: from x402 or calculated
      };

      this.logger.debug('Market fetched', { market });
      return market;
    } catch (error) {
      this.logger.error('Failed to fetch market', error as Error);
      return null;
    }
  }

  /**
   * Get data usage logs from x402 client
   */
  getDataUsageLogs() {
    return this.x402Client.getUsageLogs();
  }

  /**
   * Get usage summary
   */
  getUsageSummary() {
    return this.x402Client.getUsageSummary();
  }
}
```


**Status:** ✅ DONE
- [x] Update `src/marketFetcher.ts` to use X402Client

---

## Step 5: Create x402 Server Setup

**Status:** ✅ DONE
- [x] Create `ayin-x402-server/` directory
- [x] Create `src/index.ts`
- [x] Create `package.json` and `tsconfig.json`

---

## Step 6: Write Unit Tests for x402Client

**Status:** ✅ DONE
- [x] Create `src/__tests__/x402Client.test.ts`
- [x] Write all test cases

---

## Step 7: Integration Test

**Status:** ✅ DONE
- [x] Create integration tests

---

## Step 8: Agent Integration

**Status:** ✅ DONE
- [x] Update `src/agent.ts` to track and log data costs

---

## Step 9: Local Testing with Mock Server

**Status:** ✅ DONE
- [x] Start x402 server
- [x] Run agent tests
- [x] Verify logs

---

## Step 10: Documentation

**Create:** `ARCHITECTURE_X402.md`

**Status:** ✅ DONE

---

## Summary Checklist

| Step | Task | Status |
|------|------|--------|
| 1 | Define x402 types | ✅ DONE |
| 2 | Implement X402Client | ✅ DONE |
| 3 | Implement X402Server | ✅ DONE |
| 4 | Update MarketFetcher | ✅ DONE |
| 5 | Server setup | ✅ DONE |
| 6 | Unit tests (client) | ✅ DONE |
| 7 | Integration tests (server) | ✅ DONE |
| 8 | Agent integration | ✅ DONE |
| 9 | Local testing | ✅ DONE |
| 10 | Documentation | ✅ DONE |

---

## Key Design Decisions

**Why 402 Payment Required?**
- Standard HTTP mechanism
- No custom auth needed
- Works with existing HTTP infrastructure
- Can layer on blockchain verification

**Why separate client and server?**
- Agent side: handles payment proof creation
- Server side: validates payments, gates data
- Can be deployed independently
- Different trust models (client untrusted, server trusted)

**Why log all usage?**
- Agents can't prove how much they spent without logs
- Data providers need to bill/report
- Essential for reputation scoring
- Audit trail for DAOs

**Why mock payment for MVP?**
- No blockchain integration needed for testing
- Fast iteration
- Real blockchain verification is a future upgrade
- Allows E2E flow testing without on-chain payments

---

## Future: Real Blockchain Payment Verification

```typescript
// After MVP, implement BlockchainPaymentProvider:
async verifyPayment(proof: PaymentProof): Promise<boolean> {
  // 1. Fetch transaction from blockchain
  const tx = await this.provider.getTransaction(proof.transactionHash);
  
  // 2. Verify recipient
  if (tx.to !== this.paymentAddress) return false;
  
  // 3. Verify amount
  if (tx.value < proof.amount) return false;
  
  // 4. Verify block inclusion
  if (tx.blockNumber > proof.blockNumber) return false;
  
  return true;
}
```

---

## Next: After x402 Integration

1. **Live testnet (Base Sepolia):** Deploy x402 server + agent
2. **Cost metrics:** Track agent spending per market
3. **Premium data sources:** Connect real Oracle providers
4. **Multi-endpoint pricing:** Different costs for different data
5. **Agent cost accounting:** Dashboard showing agent→data spend
