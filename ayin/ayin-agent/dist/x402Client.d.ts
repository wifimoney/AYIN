import { DataRequest, DataResponse, PaymentConfig, DataUsageLog } from './x402Types';
import { Logger } from './types';
/**
 * x402 Client: Handles payment-gated data requests
 */
export declare class X402Client {
    private baseUrl;
    private config;
    private logger;
    private paymentCache;
    private usageLogs;
    constructor(baseUrl: string, config: PaymentConfig, logger: Logger);
    /**
     * Fetch data with automatic payment handling
     */
    fetchData<T>(request: DataRequest): Promise<DataResponse<T>>;
    /**
     * Make HTTP request with x402 payment handling
     */
    private makeRequest;
    /**
     * Parse x402 challenge from 402 response
     */
    private parseChallenge;
    /**
     * Create payment proof (implements PaymentMethod)
     */
    private createPaymentProof;
    /**
     * Create mock proof (development only)
     */
    private createMockProof;
    /**
     * Create blockchain proof (real payment)
     * For MVP: simulate blockchain call
     */
    private createBlockchainProof;
    /**
     * Use cached payment proof (if available)
     */
    private createCachedProof;
    /**
     * Get usage logs
     */
    getUsageLogs(): DataUsageLog[];
    /**
     * Get usage summary by agent
     */
    getUsageSummary(): Record<string, {
        count: number;
        totalCost: bigint;
    }>;
    /**
     * Clear logs (for testing)
     */
    clearLogs(): void;
    /**
     * Generate unique request ID
     */
    private generateRequestId;
    /**
     * Serialize proof for JSON transport
     */
    private serializeProof;
}
//# sourceMappingURL=x402Client.d.ts.map