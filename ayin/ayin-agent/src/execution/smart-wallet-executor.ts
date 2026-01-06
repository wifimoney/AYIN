/**
 * Smart Wallet Executor
 * Phase 2.3: Execution Logic
 * 
 * Replaces direct private key usage with Smart Wallet (Coinbase Smart Wallet / Safe).
 * Integrates with RiskEngine for pre-trade validation.
 * Scopes permissions to specific Prediction Market contracts.
 */

import { ethers } from 'ethers';
import { config } from '../config/config';
import { MarketSignal, Logger, DelegationPolicy } from '../types';
import { RiskEngine, TradeRequest, TradeRecord } from '../risk/risk-engine';

// ============================================
// TYPES
// ============================================

export interface ExecutorConfig {
    rpcUrl: string;
    chainId: number;

    // Smart Wallet
    smartWalletAddress?: string;
    operatorKey?: string;  // Only for signing, not direct fund access

    // Contracts
    predictionMarketAddress: string;
    delegationPolicyAddress: string;

    // Execution settings
    maxGasPrice: bigint;
    defaultSlippage: number;  // Basis points (100 = 1%)
}

export interface TradeParams {
    marketId: string;
    direction: 'YES' | 'NO';
    sizeWei: bigint;
    minReturn?: bigint;  // Minimum tokens to receive
    deadline?: number;   // Unix timestamp
}

export interface TradeResult {
    success: boolean;
    txHash?: string;
    blockNumber?: number;
    tokensReceived?: bigint;
    gasCost?: bigint;
    error?: string;
}

// ABI fragments for contracts
const PREDICTION_MARKET_ABI = [
    'function buy(uint256 marketId, bool isYes, uint256 amount, uint256 minReturn) external returns (uint256)',
    'function sell(uint256 marketId, bool isYes, uint256 amount, uint256 minReturn) external returns (uint256)',
    'function getMarketPrice(uint256 marketId, bool isYes) external view returns (uint256)',
    'function getMarketState(uint256 marketId) external view returns (bool isActive, uint256 yesPrice, uint256 noPrice)',
    'event Trade(address indexed trader, uint256 indexed marketId, bool isYes, uint256 amount, uint256 tokens)',
];

const DELEGATION_POLICY_ABI = [
    'function enforcePolicy(address agent, address market, uint256 tradeSize) external',
    'function isAgentAuthorized(address smartAccount, address agent) external view returns (bool)',
    'function getMandate(address smartAccount, address agent) external view returns (tuple(address agent, uint256 maxTradeSize, address[] allowedMarkets, uint256 expiryTime, bool isActive, uint256 createdAt, uint256 mandateId))',
];

const SMART_WALLET_ABI = [
    'function execute(address to, uint256 value, bytes calldata data) external returns (bytes memory)',
    'function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata data) external returns (bytes[] memory)',
    'function owner() external view returns (address)',
];

// ============================================
// SMART WALLET EXECUTOR
// ============================================

export class SmartWalletExecutor {
    private provider: ethers.providers.JsonRpcProvider;
    private signer: ethers.Wallet;
    private logger: Logger;
    private riskEngine: RiskEngine;
    private config: ExecutorConfig;

    // Contracts
    private predictionMarket: ethers.Contract;
    private delegationPolicy: ethers.Contract;
    private smartWallet?: ethers.Contract;

    // State
    private isInitialized: boolean = false;

    constructor(
        logger: Logger,
        riskEngine: RiskEngine,
        executorConfig: ExecutorConfig
    ) {
        this.logger = logger;
        this.riskEngine = riskEngine;
        this.config = executorConfig;

        // Initialize provider and signer
        this.provider = new ethers.providers.JsonRpcProvider(executorConfig.rpcUrl);

        if (!executorConfig.operatorKey) {
            throw new Error('Operator key required for Smart Wallet Executor');
        }
        this.signer = new ethers.Wallet(executorConfig.operatorKey, this.provider);

        // Initialize contracts
        this.predictionMarket = new ethers.Contract(
            executorConfig.predictionMarketAddress,
            PREDICTION_MARKET_ABI,
            this.provider
        );

        this.delegationPolicy = new ethers.Contract(
            executorConfig.delegationPolicyAddress,
            DELEGATION_POLICY_ABI,
            this.provider
        );

        // Initialize smart wallet if address provided
        if (executorConfig.smartWalletAddress) {
            this.smartWallet = new ethers.Contract(
                executorConfig.smartWalletAddress,
                SMART_WALLET_ABI,
                this.signer
            );
        }

        this.logger.info('SmartWalletExecutor initialized', {
            operator: this.signer.address,
            smartWallet: executorConfig.smartWalletAddress || 'not set',
            predictionMarket: executorConfig.predictionMarketAddress,
        });
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Verify network
            const network = await this.provider.getNetwork();
            if (network.chainId !== this.config.chainId) {
                throw new Error(`Wrong network: expected ${this.config.chainId}, got ${network.chainId}`);
            }

            // Verify smart wallet authorization if set
            if (this.smartWallet) {
                const isAuthorized = await this.delegationPolicy.isAgentAuthorized(
                    this.config.smartWalletAddress,
                    this.signer.address
                );

                if (!isAuthorized) {
                    this.logger.warn('Agent not authorized on smart wallet', {
                        smartWallet: this.config.smartWalletAddress,
                        agent: this.signer.address,
                    });
                } else {
                    this.logger.info('Agent authorization verified');
                }
            }

            this.isInitialized = true;
            this.logger.info('Executor initialization complete');
        } catch (error) {
            this.logger.error('Executor initialization failed', error as Error);
            throw error;
        }
    }

    // ============================================
    // TRADE EXECUTION
    // ============================================

    /**
     * Execute a trade based on market signal
     * This is the main entry point for the agent loop
     */
    async executeTrade(signal: MarketSignal, policy: DelegationPolicy): Promise<TradeResult> {
        const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;
        const startTime = Date.now();

        this.logger.info('Executing trade', {
            tradeId,
            marketId: signal.marketId,
            direction: signal.direction,
            probability: signal.probability,
        });

        try {
            await this.initialize();

            // Calculate trade size based on signal confidence and policy
            const sizeWei = this.calculateTradeSize(signal, policy);

            // Create trade request for risk check
            const tradeRequest: TradeRequest = {
                marketId: signal.marketId,
                direction: signal.direction,
                size: sizeWei,
            };

            // Risk check - FAIL LOUD
            const riskCheck = this.riskEngine.checkTrade(tradeRequest);
            if (!riskCheck.allowed) {
                return {
                    success: false,
                    error: `Risk check failed: ${riskCheck.violations.join(', ')}`,
                };
            }

            // Get current market price
            const marketPrice = await this.getMarketPrice(signal.marketId, signal.direction === 'YES');

            // Calculate minimum return with slippage
            const minReturn = this.calculateMinReturn(sizeWei, marketPrice);

            const params: TradeParams = {
                marketId: signal.marketId,
                direction: signal.direction,
                sizeWei,
                minReturn,
                deadline: Math.floor(Date.now() / 1000) + 300, // 5 minutes
            };

            // Execute via smart wallet or direct
            let result: TradeResult;
            if (this.smartWallet) {
                result = await this.executeViaSmartWallet(params);
            } else {
                result = await this.executeDirect(params);
            }

            // Record trade if successful
            if (result.success) {
                const tradeRecord: TradeRecord = {
                    id: tradeId,
                    timestamp: startTime,
                    marketId: signal.marketId,
                    direction: signal.direction,
                    size: sizeWei,
                    executionPrice: Number(marketPrice) / 1e18,
                };
                this.riskEngine.recordTrade(tradeRecord);
                this.riskEngine.updatePositions(1);
            }

            const duration = Date.now() - startTime;
            this.logger.info('Trade execution complete', {
                tradeId,
                success: result.success,
                durationMs: duration,
                txHash: result.txHash,
            });

            return result;
        } catch (error) {
            this.logger.error('Trade execution failed', error as Error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    /**
     * Execute trade via Smart Wallet
     * The smart wallet enforces on-chain policy before execution
     */
    private async executeViaSmartWallet(params: TradeParams): Promise<TradeResult> {
        if (!this.smartWallet) {
            throw new Error('Smart wallet not configured');
        }

        // Encode the trade call
        const tradeData = this.predictionMarket.interface.encodeFunctionData(
            'buy',
            [
                params.marketId,
                params.direction === 'YES',
                params.sizeWei,
                params.minReturn || 0,
            ]
        );

        // Check gas price
        const gasPrice = await this.provider.getGasPrice();
        if (gasPrice.toBigInt() > this.config.maxGasPrice) {
            return {
                success: false,
                error: `Gas price too high: ${gasPrice.toString()} > ${this.config.maxGasPrice.toString()}`,
            };
        }

        try {
            // Execute via smart wallet - this will enforce policy on-chain
            const tx = await this.smartWallet.execute(
                this.config.predictionMarketAddress,
                params.sizeWei,
                tradeData,
                { gasPrice }
            );

            this.logger.debug('Transaction submitted', { hash: tx.hash });

            const receipt = await tx.wait();

            // Parse tokens received from event
            const tradeEvent = receipt.events?.find((e: ethers.Event) => e.event === 'Trade');
            const tokensReceived = tradeEvent?.args?.tokens || BigInt(0);

            return {
                success: true,
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                tokensReceived,
                gasCost: receipt.gasUsed.mul(receipt.effectiveGasPrice).toBigInt(),
            };
        } catch (error: any) {
            // Parse revert reason
            let errorMessage = error.message;
            if (error.reason) {
                errorMessage = error.reason;
            }
            if (error.error?.message) {
                errorMessage = error.error.message;
            }

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    /**
     * Execute trade directly (fallback, less secure)
     */
    private async executeDirect(params: TradeParams): Promise<TradeResult> {
        this.logger.warn('Executing trade directly without smart wallet');

        const gasPrice = await this.provider.getGasPrice();
        if (gasPrice.toBigInt() > this.config.maxGasPrice) {
            return {
                success: false,
                error: `Gas price too high: ${gasPrice.toString()}`,
            };
        }

        try {
            const tx = await this.predictionMarket.connect(this.signer).buy(
                params.marketId,
                params.direction === 'YES',
                params.sizeWei,
                params.minReturn || 0,
                { value: params.sizeWei, gasPrice }
            );

            const receipt = await tx.wait();

            return {
                success: true,
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasCost: receipt.gasUsed.mul(receipt.effectiveGasPrice).toBigInt(),
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.reason || error.message,
            };
        }
    }

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Calculate trade size based on signal strength and policy limits
     */
    private calculateTradeSize(signal: MarketSignal, policy: DelegationPolicy): bigint {
        // Base size is proportional to probability deviation from 0.5
        const deviation = Math.abs(signal.probability - 0.5);
        const baseSize = policy.maxAllocation * BigInt(Math.floor(deviation * 200)) / BigInt(100);

        // Cap at risk engine limit
        const riskLimit = this.riskEngine.getConfig().maxTradeSizeWei;

        return baseSize < riskLimit ? baseSize : riskLimit;
    }

    /**
     * Calculate minimum return with slippage protection
     */
    private calculateMinReturn(sizeWei: bigint, priceWei: bigint): bigint {
        // Expected tokens = size / price
        const expectedTokens = (sizeWei * BigInt(1e18)) / priceWei;

        // Apply slippage tolerance
        const slippageMultiplier = BigInt(10000 - this.config.defaultSlippage);
        return (expectedTokens * slippageMultiplier) / BigInt(10000);
    }

    /**
     * Get current market price
     */
    async getMarketPrice(marketId: string, isYes: boolean): Promise<bigint> {
        try {
            const price = await this.predictionMarket.getMarketPrice(marketId, isYes);
            return price.toBigInt();
        } catch (error) {
            this.logger.warn('Failed to get market price, using default', { marketId });
            return BigInt(5e17); // Default to 0.5 ETH
        }
    }

    /**
     * Check if market is active
     */
    async isMarketActive(marketId: string): Promise<boolean> {
        try {
            const [isActive] = await this.predictionMarket.getMarketState(marketId);
            return isActive;
        } catch {
            return false;
        }
    }

    // ============================================
    // X402 PAYMENT
    // ============================================

    /**
     * Execute x402 payment for data access
     */
    async payX402(
        to: string,
        amount: bigint
    ): Promise<{ transactionHash: string; blockNumber: number }> {
        this.logger.info('Executing x402 payment', {
            to,
            amount: amount.toString(),
        });

        const tx = await this.signer.sendTransaction({
            to,
            value: amount,
            data: '0x',
        });

        const receipt = await tx.wait();
        return {
            transactionHash: receipt.transactionHash,
            blockNumber: receipt.blockNumber,
        };
    }

    // ============================================
    // GETTERS
    // ============================================

    getOperatorAddress(): string {
        return this.signer.address;
    }

    getSmartWalletAddress(): string | undefined {
        return this.config.smartWalletAddress;
    }

    isReady(): boolean {
        return this.isInitialized;
    }
}

/**
 * Create executor with default configuration
 */
export function createExecutor(
    logger: Logger,
    riskEngine: RiskEngine,
    overrides?: Partial<ExecutorConfig>
): SmartWalletExecutor {
    const defaultConfig: ExecutorConfig = {
        rpcUrl: config.rpcUrl,
        chainId: 84532, // Base Sepolia
        operatorKey: config.operatorKey,
        predictionMarketAddress: process.env.PREDICTION_MARKET_ADDRESS || '0x0000000000000000000000000000000000000000',
        delegationPolicyAddress: process.env.DELEGATION_POLICY_ADDRESS || '0x0000000000000000000000000000000000000000',
        smartWalletAddress: process.env.SMART_WALLET_ADDRESS,
        maxGasPrice: BigInt(process.env.MAX_GAS_PRICE || '50000000000'), // 50 gwei default
        defaultSlippage: 100, // 1%
    };

    return new SmartWalletExecutor(logger, riskEngine, { ...defaultConfig, ...overrides });
}
