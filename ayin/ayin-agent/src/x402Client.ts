import {
    DataRequest,
    DataResponse,
    PaymentChallenge,
    PaymentProof,
    PaymentMethod,
    PaymentConfig,
    DataUsageLog,
} from './x402Types';
import { Logger } from './types';

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
                amountPaid: BigInt(0),
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
        // Note: We need a fetch implementation. Node 18+ has global fetch.
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
                    'Authorization': `x402 ${JSON.stringify(this.serializeProof(proof))}`,
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
                : BigInt(0),
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
                summary[key] = { count: 0, totalCost: BigInt(0) };
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

    /**
     * Serialize proof for JSON transport
     */
    private serializeProof(proof: PaymentProof): any {
        return {
            ...proof,
            amount: proof.amount.toString()
        };
    }
}
