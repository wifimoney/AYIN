/**
 * Shared types for x402 Server
 */

// ============================================================================
// LOGGER
// ============================================================================

export interface Logger {
    info(msg: string, data?: Record<string, unknown>): void;
    error(msg: string, error?: Error | Record<string, unknown>): void;
    warn(msg: string, data?: Record<string, unknown>): void;
    debug(msg: string, data?: Record<string, unknown>): void;
}

// ============================================================================
// PAYMENT CHALLENGE
// ============================================================================

export interface PaymentChallenge {
    paymentAddress: string;
    amount: bigint;
    token: string;
    nonce: string;
    expiresAt: number;
    minimumChainId?: number;
}

// ============================================================================
// PAYMENT PROOF
// ============================================================================

export interface PaymentProof {
    amount: bigint;
    paymentAddress: string;
    transactionHash: string;
    blockNumber: number;
    agentId: number;
    nonce: string;
    timestamp: number;
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
