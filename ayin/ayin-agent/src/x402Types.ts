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
    agentId?: number;              // Agent ID for tracking
}
