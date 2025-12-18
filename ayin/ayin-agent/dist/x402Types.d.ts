/**
 * x402 Payment Protocol Types
 */
export interface PaymentChallenge {
    paymentAddress: string;
    amount: bigint;
    token: string;
    nonce: string;
    expiresAt: number;
    minimumChainId?: number;
}
export interface PaymentProof {
    amount: bigint;
    paymentAddress: string;
    transactionHash: string;
    blockNumber: number;
    agentId: number;
    nonce: string;
    timestamp: number;
}
export interface DataRequest {
    endpoint: string;
    params?: Record<string, unknown>;
}
export interface DataResponse<T> {
    data: T;
    cost: bigint;
    metadata: {
        timestamp: number;
        agentId: number;
        requestId: string;
    };
}
export interface DataUsageLog {
    agentId: number;
    endpoint: string;
    amountPaid: bigint;
    timestamp: number;
    success: boolean;
    errorMessage?: string;
}
export declare enum PaymentMethod {
    MOCK = "mock",// Mock payment (dev only)
    BLOCKCHAIN = "blockchain",// Real on-chain payment
    CACHED = "cached"
}
export interface PaymentConfig {
    method: PaymentMethod;
    paymentAddress?: string;
    privateKey?: string;
    rpcUrl?: string;
    mockBalance?: bigint;
    agentId?: number;
}
//# sourceMappingURL=x402Types.d.ts.map