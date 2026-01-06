/**
 * On-Chain Event Listener
 * Phase 2.1: Smart Contract Integration
 * 
 * Listens for on-chain events instead of trusting frontend.
 * - MandateCreated: New delegation created on-chain
 * - MandateRevoked: Delegation revoked
 * - MandateExecution: Trade executed via mandate
 * - Trade: Prediction market trade events
 */

import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { Logger, DelegationPolicy } from '../types';

// ============================================
// TYPES
// ============================================

export interface ChainConfig {
    rpcUrl: string;
    chainId: number;
    delegationPolicyAddress: string;
    predictionMarketAddress: string;
    agentRegistryAddress?: string;

    // Polling
    pollingInterval: number;  // ms
    confirmations: number;    // Blocks to wait for finality
}

export interface MandateEvent {
    type: 'created' | 'revoked' | 'executed';
    smartAccount: string;
    agent: string;
    mandateId?: number;
    maxTradeSize?: bigint;
    expiryTime?: number;
    allowedMarkets?: string[];
    market?: string;
    tradeSize?: bigint;
    blockNumber: number;
    txHash: string;
    timestamp: number;
}

export interface TradeEvent {
    trader: string;
    marketId: string;
    isYes: boolean;
    amount: bigint;
    tokens: bigint;
    blockNumber: number;
    txHash: string;
    timestamp: number;
}

// ABI for event listening
const DELEGATION_POLICY_ABI = [
    'event MandateCreated(address indexed smartAccount, address indexed agent, uint256 maxTradeSize, uint256 expiryTime, address[] allowedMarkets)',
    'event MandateRevoked(address indexed smartAccount, address indexed agent)',
    'event MandateExecution(address indexed smartAccount, address indexed agent, address market, uint256 tradeSize)',
];

const PREDICTION_MARKET_ABI = [
    'event Trade(address indexed trader, uint256 indexed marketId, bool isYes, uint256 amount, uint256 tokens)',
    'event MarketCreated(uint256 indexed marketId, string question, uint256 expiryTime)',
    'event MarketResolved(uint256 indexed marketId, bool outcome)',
];

// ============================================
// EVENT LISTENER
// ============================================

export class OnChainEventListener extends EventEmitter {
    private provider: ethers.providers.JsonRpcProvider;
    private logger: Logger;
    private config: ChainConfig;

    private delegationPolicy: ethers.Contract;
    private predictionMarket: ethers.Contract;

    private isListening: boolean = false;
    private lastProcessedBlock: number = 0;

    constructor(logger: Logger, config: ChainConfig) {
        super();
        this.logger = logger;
        this.config = config;

        this.provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);

        this.delegationPolicy = new ethers.Contract(
            config.delegationPolicyAddress,
            DELEGATION_POLICY_ABI,
            this.provider
        );

        this.predictionMarket = new ethers.Contract(
            config.predictionMarketAddress,
            PREDICTION_MARKET_ABI,
            this.provider
        );

        this.logger.info('OnChainEventListener initialized', {
            chainId: config.chainId,
            delegationPolicy: config.delegationPolicyAddress,
            predictionMarket: config.predictionMarketAddress,
        });
    }

    // ============================================
    // LIFECYCLE
    // ============================================

    async start(): Promise<void> {
        if (this.isListening) return;

        // Verify network
        const network = await this.provider.getNetwork();
        if (network.chainId !== this.config.chainId) {
            throw new Error(`Wrong network: expected ${this.config.chainId}, got ${network.chainId}`);
        }

        // Get current block
        this.lastProcessedBlock = await this.provider.getBlockNumber();

        this.isListening = true;
        this.logger.info('Event listener started', {
            startBlock: this.lastProcessedBlock,
            pollingInterval: this.config.pollingInterval,
        });

        // Start listening to events
        this.setupEventListeners();
    }

    stop(): void {
        if (!this.isListening) return;

        this.delegationPolicy.removeAllListeners();
        this.predictionMarket.removeAllListeners();

        this.isListening = false;
        this.logger.info('Event listener stopped');
    }

    // ============================================
    // EVENT LISTENERS
    // ============================================

    private setupEventListeners(): void {
        // Delegation Policy Events
        this.delegationPolicy.on('MandateCreated',
            async (smartAccount, agent, maxTradeSize, expiryTime, allowedMarkets, event) => {
                const timestamp = await this.getBlockTimestamp(event.blockNumber);

                const mandateEvent: MandateEvent = {
                    type: 'created',
                    smartAccount,
                    agent,
                    maxTradeSize: maxTradeSize.toBigInt(),
                    expiryTime: expiryTime.toNumber(),
                    allowedMarkets,
                    blockNumber: event.blockNumber,
                    txHash: event.transactionHash,
                    timestamp,
                };

                this.logger.info('MandateCreated event', mandateEvent as unknown as Record<string, unknown>);
                this.emit('mandate:created', mandateEvent);
            }
        );

        this.delegationPolicy.on('MandateRevoked',
            async (smartAccount, agent, event) => {
                const timestamp = await this.getBlockTimestamp(event.blockNumber);

                const mandateEvent: MandateEvent = {
                    type: 'revoked',
                    smartAccount,
                    agent,
                    blockNumber: event.blockNumber,
                    txHash: event.transactionHash,
                    timestamp,
                };

                this.logger.info('MandateRevoked event', mandateEvent as unknown as Record<string, unknown>);
                this.emit('mandate:revoked', mandateEvent);
            }
        );

        this.delegationPolicy.on('MandateExecution',
            async (smartAccount, agent, market, tradeSize, event) => {
                const timestamp = await this.getBlockTimestamp(event.blockNumber);

                const mandateEvent: MandateEvent = {
                    type: 'executed',
                    smartAccount,
                    agent,
                    market,
                    tradeSize: tradeSize.toBigInt(),
                    blockNumber: event.blockNumber,
                    txHash: event.transactionHash,
                    timestamp,
                };

                this.logger.info('MandateExecution event', mandateEvent as unknown as Record<string, unknown>);
                this.emit('mandate:executed', mandateEvent);
            }
        );

        // Prediction Market Events
        this.predictionMarket.on('Trade',
            async (trader, marketId, isYes, amount, tokens, event) => {
                const timestamp = await this.getBlockTimestamp(event.blockNumber);

                const tradeEvent: TradeEvent = {
                    trader,
                    marketId: marketId.toString(),
                    isYes,
                    amount: amount.toBigInt(),
                    tokens: tokens.toBigInt(),
                    blockNumber: event.blockNumber,
                    txHash: event.transactionHash,
                    timestamp,
                };

                this.logger.debug('Trade event', tradeEvent as unknown as Record<string, unknown>);
                this.emit('trade', tradeEvent);
            }
        );
    }

    // ============================================
    // HISTORICAL EVENT FETCHING
    // ============================================

    /**
     * Fetch historical mandate events for a specific agent
     */
    async fetchMandatesForAgent(
        agentAddress: string,
        fromBlock: number = 0
    ): Promise<MandateEvent[]> {
        const filter = this.delegationPolicy.filters.MandateCreated(null, agentAddress);
        const events = await this.delegationPolicy.queryFilter(filter, fromBlock);

        const mandates: MandateEvent[] = [];

        for (const event of events) {
            const timestamp = await this.getBlockTimestamp(event.blockNumber);
            const args = event.args!;

            mandates.push({
                type: 'created',
                smartAccount: args.smartAccount,
                agent: args.agent,
                maxTradeSize: args.maxTradeSize.toBigInt(),
                expiryTime: args.expiryTime.toNumber(),
                allowedMarkets: args.allowedMarkets,
                blockNumber: event.blockNumber,
                txHash: event.transactionHash,
                timestamp,
            });
        }

        return mandates;
    }

    /**
     * Fetch recent trades for a market
     */
    async fetchRecentTrades(
        marketId: string,
        fromBlock: number
    ): Promise<TradeEvent[]> {
        const filter = this.predictionMarket.filters.Trade(null, marketId);
        const events = await this.predictionMarket.queryFilter(filter, fromBlock);

        const trades: TradeEvent[] = [];

        for (const event of events) {
            const timestamp = await this.getBlockTimestamp(event.blockNumber);
            const args = event.args!;

            trades.push({
                trader: args.trader,
                marketId: args.marketId.toString(),
                isYes: args.isYes,
                amount: args.amount.toBigInt(),
                tokens: args.tokens.toBigInt(),
                blockNumber: event.blockNumber,
                txHash: event.transactionHash,
                timestamp,
            });
        }

        return trades;
    }

    // ============================================
    // DELEGATION VERIFICATION
    // ============================================

    /**
     * Verify a delegation exists on-chain (don't trust frontend)
     */
    async verifyDelegation(
        smartAccount: string,
        agentAddress: string
    ): Promise<{
        isValid: boolean;
        policy?: DelegationPolicy;
        error?: string;
    }> {
        try {
            const mandate = await this.delegationPolicy.getMandate(smartAccount, agentAddress);

            // Check if mandate is valid
            if (mandate.agent === ethers.constants.AddressZero) {
                return { isValid: false, error: 'No mandate found' };
            }

            if (!mandate.isActive) {
                return { isValid: false, error: 'Mandate is not active' };
            }

            const now = Math.floor(Date.now() / 1000);
            if (mandate.expiryTime <= now) {
                return { isValid: false, error: 'Mandate has expired' };
            }

            // Convert on-chain mandate to DelegationPolicy
            const policy: DelegationPolicy = {
                maxAllocation: mandate.maxTradeSize.toBigInt(),
                maxDrawdown: 10, // Default, could be stored on-chain in future
                allowedMarkets: mandate.allowedMarkets,
                expiresAt: mandate.expiryTime,
            };

            return { isValid: true, policy };
        } catch (error) {
            this.logger.error('Failed to verify delegation', error as Error);
            return {
                isValid: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    // ============================================
    // HELPERS
    // ============================================

    private async getBlockTimestamp(blockNumber: number): Promise<number> {
        try {
            const block = await this.provider.getBlock(blockNumber);
            return block.timestamp;
        } catch {
            return Math.floor(Date.now() / 1000);
        }
    }

    async getCurrentBlock(): Promise<number> {
        return this.provider.getBlockNumber();
    }

    isActive(): boolean {
        return this.isListening;
    }
}

/**
 * Create event listener with default configuration
 */
export function createEventListener(logger: Logger): OnChainEventListener {
    const config: ChainConfig = {
        rpcUrl: process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com',
        chainId: parseInt(process.env.CHAIN_ID || '84532', 10),
        delegationPolicyAddress: process.env.DELEGATION_POLICY_ADDRESS || '0x0000000000000000000000000000000000000000',
        predictionMarketAddress: process.env.PREDICTION_MARKET_ADDRESS || '0x0000000000000000000000000000000000000000',
        pollingInterval: parseInt(process.env.POLLING_INTERVAL || '12000', 10),
        confirmations: parseInt(process.env.CONFIRMATIONS || '2', 10),
    };

    return new OnChainEventListener(logger, config);
}
