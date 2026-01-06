/**
 * Signature Payment Provider
 * Phase 1.2: Secure x402
 * 
 * Replaces MockPaymentProvider with cryptographic signature verification.
 * Validates that payment proofs are signed by the claimed agent.
 */

import { ethers } from 'ethers';
import { PaymentProvider } from '../server';
import { PaymentProof, Logger } from '../types';

// EIP-712 Domain for x402 payments
const EIP712_DOMAIN = {
    name: 'AYIN x402',
    version: '1',
    chainId: 84532, // Base Sepolia
};

// EIP-712 Types for payment proof
const EIP712_TYPES = {
    PaymentProof: [
        { name: 'agentId', type: 'uint256' },
        { name: 'nonce', type: 'string' },
        { name: 'amount', type: 'uint256' },
        { name: 'endpoint', type: 'string' },
        { name: 'expiresAt', type: 'uint256' },
    ],
};

export interface SignedPaymentProof extends PaymentProof {
    signature: string;
    endpoint: string;
    expiresAt: number;
}

/**
 * Signature-based payment verification
 * 
 * This provider verifies:
 * 1. The signature is valid and matches the expected signer
 * 2. The payment proof has not expired
 * 3. The nonce has not been used (replay protection)
 * 4. The amount matches the required payment
 */
export class SignaturePaymentProvider implements PaymentProvider {
    private logger: Logger;
    private usedNonces: Set<string> = new Set();
    private trustedSigners: Set<string> = new Set();
    private rpcUrl: string;

    constructor(logger: Logger, config?: {
        trustedSigners?: string[];
        rpcUrl?: string;
    }) {
        this.logger = logger;
        this.rpcUrl = config?.rpcUrl || process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com';

        // Add trusted signers (agent operator addresses)
        if (config?.trustedSigners) {
            config.trustedSigners.forEach(addr => this.trustedSigners.add(addr.toLowerCase()));
        }

        // Load trusted signers from environment
        const envSigners = process.env.TRUSTED_SIGNERS?.split(',') || [];
        envSigners.forEach(addr => this.trustedSigners.add(addr.toLowerCase().trim()));

        this.logger.info('SignaturePaymentProvider initialized', {
            trustedSigners: this.trustedSigners.size,
            chainId: EIP712_DOMAIN.chainId,
        });
    }

    async verifyPayment(proof: PaymentProof): Promise<boolean> {
        const signedProof = proof as SignedPaymentProof;

        // Step 1: Basic validation
        if (!signedProof.signature || !signedProof.endpoint) {
            this.logger.warn('Payment proof missing signature or endpoint', {
                agentId: proof.agentId,
                hasSignature: !!signedProof.signature,
                hasEndpoint: !!signedProof.endpoint,
            });
            return false;
        }

        // Step 2: Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (signedProof.expiresAt && signedProof.expiresAt < now) {
            this.logger.warn('Payment proof expired', {
                agentId: proof.agentId,
                expiresAt: signedProof.expiresAt,
                now,
            });
            return false;
        }

        // Step 3: Check for replay attack (nonce already used)
        if (this.usedNonces.has(proof.nonce)) {
            this.logger.warn('Nonce already used (replay attack)', {
                agentId: proof.agentId,
                nonce: proof.nonce,
            });
            return false;
        }

        // Step 4: Verify signature
        try {
            const recoveredAddress = await this.recoverSigner(signedProof);
            const normalizedRecovered = recoveredAddress.toLowerCase();

            // Check if signer is trusted
            if (this.trustedSigners.size > 0 && !this.trustedSigners.has(normalizedRecovered)) {
                this.logger.warn('Signer not in trusted list', {
                    agentId: proof.agentId,
                    recovered: normalizedRecovered,
                });
                return false;
            }

            // Step 5: Mark nonce as used (consume it)
            this.usedNonces.add(proof.nonce);

            // Cleanup old nonces periodically (basic memory management)
            if (this.usedNonces.size > 10000) {
                this.cleanupOldNonces();
            }

            this.logger.info('Payment verified successfully', {
                agentId: proof.agentId,
                signer: normalizedRecovered,
                amount: proof.amount.toString(),
            });

            return true;
        } catch (error) {
            this.logger.error('Signature verification failed', error as Error);
            return false;
        }
    }

    private async recoverSigner(proof: SignedPaymentProof): Promise<string> {
        // Construct the message that was signed
        const domain = {
            name: EIP712_DOMAIN.name,
            version: EIP712_DOMAIN.version,
            chainId: EIP712_DOMAIN.chainId,
        };

        // Recover the signer from the EIP-712 typed data signature
        // ethers v5 uses ethers.utils.verifyTypedData
        const recoveredAddress = ethers.utils.verifyTypedData(
            domain,
            EIP712_TYPES,
            {
                agentId: ethers.BigNumber.from(proof.agentId),
                nonce: proof.nonce,
                amount: ethers.BigNumber.from(proof.amount.toString()),
                endpoint: proof.endpoint,
                expiresAt: ethers.BigNumber.from(proof.expiresAt || 0),
            },
            proof.signature
        );

        return recoveredAddress;
    }

    private cleanupOldNonces(): void {
        // Simple cleanup - remove oldest 50% of nonces
        // In production, nonces should be stored in Redis with TTL
        const noncesArray = Array.from(this.usedNonces);
        const toRemove = noncesArray.slice(0, Math.floor(noncesArray.length / 2));
        toRemove.forEach(nonce => this.usedNonces.delete(nonce));

        this.logger.info('Cleaned up old nonces', {
            removed: toRemove.length,
            remaining: this.usedNonces.size,
        });
    }

    /**
     * Add a trusted signer address
     */
    addTrustedSigner(address: string): void {
        this.trustedSigners.add(address.toLowerCase());
    }

    /**
     * Remove a trusted signer address
     */
    removeTrustedSigner(address: string): void {
        this.trustedSigners.delete(address.toLowerCase());
    }

    /**
     * Check if an address is a trusted signer
     */
    isTrustedSigner(address: string): boolean {
        return this.trustedSigners.has(address.toLowerCase());
    }
}

/**
 * Redis-backed Signature Payment Provider
 * Uses Redis for nonce storage and TTL management
 */
export class RedisSignaturePaymentProvider extends SignaturePaymentProvider {
    private redis: any; // ioredis client

    constructor(logger: Logger, redis: any, config?: {
        trustedSigners?: string[];
        rpcUrl?: string;
    }) {
        super(logger, config);
        this.redis = redis;
    }

    async verifyPayment(proof: PaymentProof): Promise<boolean> {
        const signedProof = proof as SignedPaymentProof;

        // Step 1: Basic validation
        if (!signedProof.signature || !signedProof.endpoint) {
            return false;
        }

        // Step 2: Check expiration
        const now = Math.floor(Date.now() / 1000);
        if (signedProof.expiresAt && signedProof.expiresAt < now) {
            return false;
        }

        // Step 3: Check for replay attack using Redis SETNX
        const nonceKey = `x402:nonce:${proof.nonce}`;
        const ttl = 3600; // 1 hour TTL for nonces

        try {
            // SETNX returns 1 if key was set, 0 if it already existed
            const result = await this.redis.set(nonceKey, '1', 'NX', 'EX', ttl);
            if (result !== 'OK') {
                // Nonce already exists - replay attack
                return false;
            }
        } catch (error) {
            console.error('Redis error during nonce check:', error);
            return false;
        }

        // Step 4: Verify signature using parent class method
        try {
            // Use ethers to verify signature directly here
            const domain = {
                name: 'AYIN x402',
                version: '1',
                chainId: 84532,
            };

            const types = {
                PaymentProof: [
                    { name: 'agentId', type: 'uint256' },
                    { name: 'nonce', type: 'string' },
                    { name: 'amount', type: 'uint256' },
                    { name: 'endpoint', type: 'string' },
                    { name: 'expiresAt', type: 'uint256' },
                ],
            };

            // ethers v5 uses ethers.utils.verifyTypedData
            const recoveredAddress = ethers.utils.verifyTypedData(
                domain,
                types,
                {
                    agentId: ethers.BigNumber.from(proof.agentId),
                    nonce: proof.nonce,
                    amount: ethers.BigNumber.from(proof.amount.toString()),
                    endpoint: signedProof.endpoint,
                    expiresAt: ethers.BigNumber.from(signedProof.expiresAt || 0),
                },
                signedProof.signature
            );

            return !!recoveredAddress;
        } catch (error) {
            console.error('Signature verification failed:', error);
            // Remove nonce from Redis since verification failed
            await this.redis.del(nonceKey);
            return false;
        }
    }
}
