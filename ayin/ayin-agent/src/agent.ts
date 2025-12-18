import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import {
    AgentConfig,
    Logger,
    Mandate,
    Market,
    StrategyContext,
} from './types';
import { MarketFetcher } from './marketFetcher';
import { MandateFetcher } from './mandateFetcher';
import { SimpleStrategy } from './strategy';
import { PositionSizer } from './positionSizer';
import { UserOpBuilder } from './userOpBuilder';
import { Executor } from './executor';
import { ethers } from 'ethers';

export class Agent {
    private config: AgentConfig;
    private logger: Logger;
    private marketFetcher: MarketFetcher;
    private mandateFetcher: MandateFetcher;
    private strategy: SimpleStrategy;
    private positionSizer: PositionSizer;
    private userOpBuilder: UserOpBuilder;
    private executor: Executor | null = null;
    private isRunning = false;

    constructor(
        config: AgentConfig,
        logger: Logger
    ) {
        this.config = config;
        this.logger = logger;

        this.marketFetcher = new MarketFetcher(
            config.predictionMarketAddress,
            config.rpcUrl,
            config.x402BaseUrl,
            config.x402Config,
            logger
        );

        this.mandateFetcher = new MandateFetcher(
            config.delegationPolicyAddress,
            config.rpcUrl,
            logger
        );

        this.strategy = new SimpleStrategy(this.marketFetcher, logger);
        this.positionSizer = new PositionSizer(logger);
        this.userOpBuilder = new UserOpBuilder(
            config.predictionMarketAddress,
            logger
        );
    }

    /**
     * Initialize Thirdweb SDK and smart account
     */
    async initialize(): Promise<void> {
        try {
            this.logger.info('Initializing Thirdweb SDK');

            let sdk: ThirdwebSDK;

            // Initialize SDK
            if (this.config.agentPrivateKey) {
                sdk = ThirdwebSDK.fromPrivateKey(
                    this.config.agentPrivateKey,
                    this.config.chainId, // Correct for v4
                    { clientId: this.config.thirdwebClientId }
                );
            } else {
                // Fallback for read-only or testing
                sdk = new ThirdwebSDK(this.config.chainId, { clientId: this.config.thirdwebClientId });
            }

            // Connect to smart account
            const smartAccount = await sdk.getContract(
                this.config.smartAccountAddress
            );

            this.executor = new Executor(
                sdk,
                smartAccount,
                this.userOpBuilder,
                this.config,
                this.logger
            );

            this.logger.info('Thirdweb SDK initialized');
        } catch (error) {
            this.logger.error('Failed to initialize SDK', error as Error);
            throw error;
        }
    }

    /**
     * Fetch mandate and markets
     */
    private async fetchContext(): Promise<StrategyContext | null> {
        try {
            // Get agent address from config
            const agentAddress = new ethers.Wallet(
                this.config.agentPrivateKey
            ).address;

            // Fetch mandate
            const mandate = await this.mandateFetcher.getMandate(
                this.config.smartAccountAddress,
                agentAddress
            );

            if (!mandate) {
                this.logger.error('No active mandate found');
                return null;
            }

            // Check if expired
            if (this.mandateFetcher.isMandateExpired(mandate)) {
                this.logger.warn('Mandate has expired');
                return null;
            }

            // Fetch all open markets (simplified: just marketId 1 for MVP)
            // Use X402 client implicitly via updated MarketFetcher
            const market = await this.marketFetcher.getMarket(1, true); // true = include premium signals if possible
            if (!market) {
                this.logger.error('Could not fetch market');
                return null;
            }

            return {
                markets: [market],
                position: null, // TODO: Fetch actual position
                mandate,
                agentId: this.config.agentId,
                timestamp: Math.floor(Date.now() / 1000),
            };
        } catch (error) {
            this.logger.error('Failed to fetch context', error as Error);
            return null;
        }
    }

    /**
     * Main agent loop
     */
    async run(): Promise<void> {
        await this.initialize();
        this.isRunning = true;

        this.logger.info('Agent loop starting', {
            agentId: this.config.agentId,
            rebalanceInterval: this.config.rebalanceInterval,
        });

        while (this.isRunning) {
            try {
                const context = await this.fetchContext();
                if (!context) {
                    this.logger.warn('Failed to fetch context, retrying in 60s');
                    await this.sleep(60000);
                    continue;
                }

                // Run strategy
                const { signal, nextCheckTime } = await this.strategy.run(context);

                if (signal) {
                    // Size position
                    const position = this.positionSizer.sizePosition(
                        signal,
                        context.mandate
                    );

                    // Execute via Thirdweb
                    if (this.executor) {
                        const result = await this.executor.executeTrade(
                            signal.marketId,
                            this.config.agentId,
                            position,
                            signal.direction
                        );

                        if (result.success) {
                            // Log execution + data costs
                            const summary = this.marketFetcher.getUsageSummary();
                            this.logger.info('Trade executed with data', {
                                result: result as any,
                                dataUsage: JSON.parse(JSON.stringify(summary, (key, value) =>
                                    typeof value === 'bigint'
                                        ? value.toString()
                                        : value // return everything else unchanged
                                ))
                            });
                        } else {
                            this.logger.error('Trade failed', new Error(result.error));
                        }
                    }
                } else {
                    this.logger.debug('No trade signal generated');
                }

                // Regularly report data usage
                const dataSummary = this.marketFetcher.getUsageSummary();
                this.logger.info('Agent data usage', {
                    summary: JSON.parse(JSON.stringify(dataSummary, (key, value) =>
                        typeof value === 'bigint'
                            ? value.toString()
                            : value
                    ))
                });

                // Sleep until next check
                const sleepTime = Math.max(0, nextCheckTime - Math.floor(Date.now() / 1000)) * 1000;
                this.logger.debug('Sleeping', { sleepTime });
                await this.sleep(sleepTime);
            } catch (error) {
                this.logger.error('Agent loop error', error as Error);
                await this.sleep(60000); // Wait 60s before retry
            }
        }
    }

    /**
     * Stop the agent loop
     */
    stop(): void {
        this.logger.info('Stopping agent');
        this.isRunning = false;
    }

    /**
     * Utility: sleep helper
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
