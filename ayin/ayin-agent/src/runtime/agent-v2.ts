/**
 * Agent Runtime v2
 * Phase 2: Production Hardening
 * 
 * Integrates:
 * - RiskEngine for guardrails
 * - SmartWalletExecutor for secure execution
 * - OnChainEventListener for contract integration
 * - Policy enforcement from on-chain mandates
 */

import { fetchMarketSignals } from '../markets/markets';
import { enforcePolicy } from '../policy/policy';
import { SmartWalletExecutor, createExecutor } from '../execution/smart-wallet-executor';
import { RiskEngine, createRiskEngine } from '../risk/risk-engine';
import { OnChainEventListener, createEventListener, MandateEvent } from '../chain/event-listener';
import { logAction, logger } from '../observability/logger';
import { config } from '../config/config';
import { MarketSignal, DelegationPolicy, Logger } from '../types';

// ============================================
// TYPES
// ============================================

export interface AgentConfig {
    // Agent identity
    agentId: number;
    operatorAddress: string;
    smartWalletAddress?: string;

    // Runtime settings
    loopIntervalMs: number;
    maxSignalsPerLoop: number;

    // Feature flags
    enableRiskEngine: boolean;
    enableOnChainValidation: boolean;
    enableSmartWallet: boolean;
}

export interface AgentState {
    isRunning: boolean;
    lastHeartbeat: number;
    lastTradeAttempt?: number;
    tradesExecuted: number;
    tradesRejected: number;
    errorCount: number;
}

const DEFAULT_CONFIG: AgentConfig = {
    agentId: 1,
    operatorAddress: '',
    loopIntervalMs: 60000, // 1 minute
    maxSignalsPerLoop: 3,
    enableRiskEngine: true,
    enableOnChainValidation: true,
    enableSmartWallet: true,
};

// ============================================
// AGENT V2
// ============================================

export class AgentV2 {
    private config: AgentConfig;
    private logger: Logger;

    // Components
    private riskEngine: RiskEngine;
    private executor: SmartWalletExecutor;
    private eventListener: OnChainEventListener;

    // State
    private state: AgentState = {
        isRunning: false,
        lastHeartbeat: 0,
        tradesExecuted: 0,
        tradesRejected: 0,
        errorCount: 0,
    };

    // Active mandates (from on-chain)
    private activeMandates: Map<string, DelegationPolicy> = new Map();

    // Loop control
    private loopTimer?: NodeJS.Timeout;

    constructor(agentConfig: Partial<AgentConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...agentConfig };
        this.logger = logger;

        // Initialize RiskEngine
        this.riskEngine = createRiskEngine(this.logger, {
            maxTradeSizeWei: BigInt('1000000000000000000'), // 1 ETH
            maxTradesPerHour: 5,
            maxDrawdownPercent: 10,
        });

        // Initialize Executor
        this.executor = createExecutor(this.logger, this.riskEngine, {
            smartWalletAddress: this.config.smartWalletAddress,
        });

        // Initialize Event Listener
        this.eventListener = createEventListener(this.logger);

        this.setupEventHandlers();

        this.logger.info('AgentV2 initialized', {
            agentId: this.config.agentId,
            enableRiskEngine: this.config.enableRiskEngine,
            enableOnChainValidation: this.config.enableOnChainValidation,
        });
    }

    // ============================================
    // LIFECYCLE
    // ============================================

    async start(): Promise<void> {
        if (this.state.isRunning) {
            this.logger.warn('Agent already running');
            return;
        }

        this.logger.info('Starting AgentV2...');

        // Start event listener
        if (this.config.enableOnChainValidation) {
            await this.eventListener.start();
        }

        // Initialize executor
        await this.executor.initialize();

        // Start main loop
        this.state.isRunning = true;
        this.runLoop();

        this.logger.info('AgentV2 started', {
            loopInterval: this.config.loopIntervalMs,
        });
    }

    async stop(): Promise<void> {
        if (!this.state.isRunning) return;

        this.logger.info('Stopping AgentV2...');

        this.state.isRunning = false;

        if (this.loopTimer) {
            clearTimeout(this.loopTimer);
        }

        this.eventListener.stop();

        this.logger.info('AgentV2 stopped');
    }

    // ============================================
    // MAIN LOOP
    // ============================================

    private async runLoop(): Promise<void> {
        if (!this.state.isRunning) return;

        this.state.lastHeartbeat = Date.now();
        logAction({ msg: 'Agent heartbeat', state: this.getStatus() });

        try {
            // Check circuit breaker
            const riskStatus = this.riskEngine.getStatus();
            if (riskStatus.isCircuitBroken) {
                this.logger.error('Circuit breaker active - skipping loop');
                this.scheduleNextLoop();
                return;
            }

            // Fetch market signals
            const signals = await fetchMarketSignals();
            const signalsToProcess = signals.slice(0, this.config.maxSignalsPerLoop);

            this.logger.debug('Processing signals', {
                total: signals.length,
                processing: signalsToProcess.length,
            });

            for (const signal of signalsToProcess) {
                await this.processSignal(signal);
            }

        } catch (error) {
            this.state.errorCount++;
            this.logger.error('Loop error', error as Error);
        }

        this.scheduleNextLoop();
    }

    private scheduleNextLoop(): void {
        if (!this.state.isRunning) return;

        this.loopTimer = setTimeout(
            () => this.runLoop(),
            this.config.loopIntervalMs
        );
    }

    // ============================================
    // SIGNAL PROCESSING
    // ============================================

    private async processSignal(signal: MarketSignal): Promise<void> {
        this.logger.debug('Processing signal', {
            marketId: signal.marketId,
            direction: signal.direction,
            probability: signal.probability,
        });

        // Get policy (from on-chain or cache)
        const policy = await this.getPolicy(signal.marketId);
        if (!policy) {
            this.logger.warn('No valid policy for market', { marketId: signal.marketId });
            this.state.tradesRejected++;
            return;
        }

        // Enforce policy
        if (!enforcePolicy(signal, policy)) {
            logAction({ msg: 'Signal rejected by policy', signal });
            this.state.tradesRejected++;
            return;
        }

        logAction({ msg: 'Signal valid, executing', signal });

        // Execute trade
        this.state.lastTradeAttempt = Date.now();
        const result = await this.executor.executeTrade(signal, policy);

        if (result.success) {
            this.state.tradesExecuted++;
            logAction({
                msg: 'Trade executed successfully',
                signal,
                txHash: result.txHash,
                blockNumber: result.blockNumber,
            });
        } else {
            this.state.tradesRejected++;
            logAction({
                msg: 'Trade execution failed',
                signal,
                error: result.error,
            });
        }
    }

    // ============================================
    // POLICY MANAGEMENT
    // ============================================

    private async getPolicy(marketId: string): Promise<DelegationPolicy | null> {
        // First check cache
        const cachedPolicy = this.activeMandates.get(marketId);
        if (cachedPolicy && cachedPolicy.expiresAt > Date.now() / 1000) {
            return cachedPolicy;
        }

        // Validate on-chain if enabled
        if (this.config.enableOnChainValidation && this.config.smartWalletAddress) {
            const verification = await this.eventListener.verifyDelegation(
                this.config.smartWalletAddress,
                this.executor.getOperatorAddress()
            );

            if (verification.isValid && verification.policy) {
                // Check if this market is allowed
                if (verification.policy.allowedMarkets.includes(marketId.toLowerCase())) {
                    this.activeMandates.set(marketId, verification.policy);
                    return verification.policy;
                }
                this.logger.debug('Market not in allowed list', { marketId });
                return null;
            }

            this.logger.warn('On-chain delegation invalid', {
                error: verification.error
            });
        }

        // Fallback to default policy (for development)
        if (!this.config.enableOnChainValidation) {
            return {
                maxAllocation: BigInt('1000000000000000000'), // 1 ETH
                maxDrawdown: 10,
                allowedMarkets: [marketId],
                expiresAt: Math.floor(Date.now() / 1000) + 3600,
            };
        }

        return null;
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    private setupEventHandlers(): void {
        // Handle circuit breaker
        this.riskEngine.on('circuit-breaker', (event) => {
            this.logger.error('🚨 CIRCUIT BREAKER - Agent halting', event);
            // In production, could trigger emergency actions
        });

        // Handle new mandates
        this.eventListener.on('mandate:created', (event: MandateEvent) => {
            this.logger.info('New mandate detected', event as unknown as Record<string, unknown>);
            // Refresh policy cache
            this.activeMandates.clear();
        });

        // Handle revoked mandates
        this.eventListener.on('mandate:revoked', (event: MandateEvent) => {
            this.logger.warn('Mandate revoked', event as unknown as Record<string, unknown>);
            // Clear policy cache
            this.activeMandates.clear();
        });
    }

    // ============================================
    // STATUS & HEALTH
    // ============================================

    getStatus(): {
        agent: AgentState;
        risk: ReturnType<RiskEngine['getStatus']>;
        config: AgentConfig;
    } {
        return {
            agent: { ...this.state },
            risk: this.riskEngine.getStatus(),
            config: this.config,
        };
    }

    isHealthy(): boolean {
        // Agent is healthy if:
        // 1. Running
        // 2. Heartbeat within 2x loop interval
        // 3. Circuit breaker not triggered
        // 4. Error rate below threshold

        if (!this.state.isRunning) return false;

        const timeSinceHeartbeat = Date.now() - this.state.lastHeartbeat;
        if (timeSinceHeartbeat > this.config.loopIntervalMs * 2) return false;

        if (this.riskEngine.getStatus().isCircuitBroken) return false;

        const totalTrades = this.state.tradesExecuted + this.state.tradesRejected;
        if (totalTrades > 0 && this.state.errorCount / totalTrades > 0.5) return false;

        return true;
    }
}

// ============================================
// EXPORTS
// ============================================

/**
 * Legacy function for backwards compatibility
 */
export async function runAgent(): Promise<void> {
    const agent = new AgentV2();
    await agent.start();
}

/**
 * Create and start a new agent instance
 */
export async function createAndStartAgent(
    config?: Partial<AgentConfig>
): Promise<AgentV2> {
    const agent = new AgentV2(config);
    await agent.start();
    return agent;
}
