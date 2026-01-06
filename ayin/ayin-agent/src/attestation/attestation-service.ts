/**
 * Attestation Service - TEE Integration
 * Phase 3.2: Verifiable Compute
 * 
 * Provides cryptographic attestations for RiskEngine decisions.
 */

import { ethers } from 'ethers';
import { Logger } from '../types';

export interface RiskDecision {
    agentId: number;
    marketId: string;
    tradeSize: string;
    direction: 'YES' | 'NO';
    allowed: boolean;
    violations: string[];
    currentDrawdown: number;
    tradesInLastHour: number;
    dailyVolume: string;
    circuitBroken: boolean;
    timestamp: number;
    nonce: string;
}

export interface Attestation {
    decision: RiskDecision;
    attesterId: string;
    timestamp: number;
    signature: string;
    messageHash: string;
    enclaveId?: string;
}

const EIP712_DOMAIN = {
    name: 'AYIN Risk Attestation',
    version: '1',
    chainId: 84532,
};

const EIP712_TYPES = {
    RiskDecision: [
        { name: 'agentId', type: 'uint256' },
        { name: 'marketId', type: 'string' },
        { name: 'tradeSize', type: 'uint256' },
        { name: 'direction', type: 'string' },
        { name: 'allowed', type: 'bool' },
        { name: 'violations', type: 'string' },
        { name: 'currentDrawdown', type: 'uint256' },
        { name: 'tradesInLastHour', type: 'uint256' },
        { name: 'circuitBroken', type: 'bool' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
    ],
};

export class AttestationService {
    private wallet: ethers.Wallet;
    private logger: Logger;
    private chainId: number;
    private enclaveId: string;
    private attestations: Attestation[] = [];

    constructor(logger: Logger, config?: { privateKey?: string; chainId?: number; enclaveId?: string }) {
        this.logger = logger;
        this.chainId = config?.chainId || 84532;
        this.enclaveId = config?.enclaveId || 'ayin-risk-engine-v1';
        this.wallet = new ethers.Wallet(config?.privateKey || ethers.Wallet.createRandom().privateKey);
        this.logger.info('AttestationService initialized', { attester: this.wallet.address });
    }

    async attest(decision: Omit<RiskDecision, 'nonce'>): Promise<Attestation> {
        const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));
        const fullDecision: RiskDecision = { ...decision, nonce };

        const domain = { ...EIP712_DOMAIN, chainId: this.chainId };
        const message = {
            agentId: fullDecision.agentId,
            marketId: fullDecision.marketId,
            tradeSize: BigInt(fullDecision.tradeSize),
            direction: fullDecision.direction,
            allowed: fullDecision.allowed,
            violations: fullDecision.violations.join(','),
            currentDrawdown: Math.floor(fullDecision.currentDrawdown * 100),
            tradesInLastHour: fullDecision.tradesInLastHour,
            circuitBroken: fullDecision.circuitBroken,
            timestamp: fullDecision.timestamp,
            nonce,
        };

        const signature = await this.wallet._signTypedData(domain, EIP712_TYPES, message);
        const messageHash = ethers.utils._TypedDataEncoder.hash(domain, EIP712_TYPES, message);

        const attestation: Attestation = {
            decision: fullDecision,
            attesterId: this.wallet.address,
            timestamp: Date.now(),
            signature,
            messageHash,
            enclaveId: this.enclaveId,
        };

        this.attestations.push(attestation);
        if (this.attestations.length > 10000) this.attestations = this.attestations.slice(-5000);

        this.logger.debug('Attestation created', { messageHash, allowed: decision.allowed });
        return attestation;
    }

    verify(attestation: Attestation): { valid: boolean; signer?: string; error?: string } {
        try {
            const domain = { ...EIP712_DOMAIN, chainId: this.chainId };
            const message = {
                agentId: attestation.decision.agentId,
                marketId: attestation.decision.marketId,
                tradeSize: BigInt(attestation.decision.tradeSize),
                direction: attestation.decision.direction,
                allowed: attestation.decision.allowed,
                violations: attestation.decision.violations.join(','),
                currentDrawdown: Math.floor(attestation.decision.currentDrawdown * 100),
                tradesInLastHour: attestation.decision.tradesInLastHour,
                circuitBroken: attestation.decision.circuitBroken,
                timestamp: attestation.decision.timestamp,
                nonce: attestation.decision.nonce,
            };

            const recoveredAddress = ethers.utils.verifyTypedData(domain, EIP712_TYPES, message, attestation.signature);
            const valid = recoveredAddress.toLowerCase() === attestation.attesterId.toLowerCase();
            return { valid, signer: recoveredAddress, error: valid ? undefined : 'Signer mismatch' };
        } catch (error) {
            return { valid: false, error: error instanceof Error ? error.message : 'Verification failed' };
        }
    }

    getAttesterAddress(): string {
        return this.wallet.address;
    }

    getStats() {
        const allowed = this.attestations.filter(a => a.decision.allowed).length;
        return {
            totalAttestations: this.attestations.length,
            allowedDecisions: allowed,
            rejectedDecisions: this.attestations.length - allowed,
        };
    }
}

export function createAttestationService(logger: Logger, config?: { privateKey?: string; chainId?: number }): AttestationService {
    return new AttestationService(logger, config);
}
