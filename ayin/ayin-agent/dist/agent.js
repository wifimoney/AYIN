"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Agent = void 0;
const sdk_1 = require("@thirdweb-dev/sdk");
const marketFetcher_1 = require("./marketFetcher");
const mandateFetcher_1 = require("./mandateFetcher");
const strategy_1 = require("./strategy");
const positionSizer_1 = require("./positionSizer");
const userOpBuilder_1 = require("./userOpBuilder");
const executor_1 = require("./executor");
const ethers_1 = require("ethers");
class Agent {
    constructor(config, logger) {
        this.executor = null;
        this.isRunning = false;
        this.config = config;
        this.logger = logger;
        this.marketFetcher = new marketFetcher_1.MarketFetcher(config.predictionMarketAddress, config.rpcUrl, logger);
        this.mandateFetcher = new mandateFetcher_1.MandateFetcher(config.delegationPolicyAddress, config.rpcUrl, logger);
        this.strategy = new strategy_1.SimpleStrategy(this.marketFetcher, logger);
        this.positionSizer = new positionSizer_1.PositionSizer(logger);
        this.userOpBuilder = new userOpBuilder_1.UserOpBuilder(config.predictionMarketAddress, logger);
    }
    /**
     * Initialize Thirdweb SDK and smart account
     */
    async initialize() {
        try {
            this.logger.info('Initializing Thirdweb SDK');
            let sdk;
            // Initialize SDK
            if (this.config.agentPrivateKey) {
                sdk = sdk_1.ThirdwebSDK.fromPrivateKey(this.config.agentPrivateKey, this.config.chainId, // Correct for v4
                { clientId: this.config.thirdwebClientId });
            }
            else {
                // Fallback for read-only or testing
                sdk = new sdk_1.ThirdwebSDK(this.config.chainId, { clientId: this.config.thirdwebClientId });
            }
            // Connect to smart account
            const smartAccount = await sdk.getContract(this.config.smartAccountAddress);
            this.executor = new executor_1.Executor(sdk, smartAccount, this.userOpBuilder, this.config, this.logger);
            this.logger.info('Thirdweb SDK initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize SDK', error);
            throw error;
        }
    }
    /**
     * Fetch mandate and markets
     */
    async fetchContext() {
        try {
            // Get agent address from config
            const agentAddress = new ethers_1.ethers.Wallet(this.config.agentPrivateKey).address;
            // Fetch mandate
            const mandate = await this.mandateFetcher.getMandate(this.config.smartAccountAddress, agentAddress);
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
            const market = await this.marketFetcher.getMarket(1);
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
        }
        catch (error) {
            this.logger.error('Failed to fetch context', error);
            return null;
        }
    }
    /**
     * Main agent loop
     */
    async run() {
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
                    const position = this.positionSizer.sizePosition(signal, context.mandate);
                    // Execute via Thirdweb
                    if (this.executor) {
                        const result = await this.executor.executeTrade(signal.marketId, this.config.agentId, position, signal.direction);
                        if (result.success) {
                            this.logger.info('Trade executed', result);
                        }
                        else {
                            this.logger.error('Trade failed', new Error(result.error));
                        }
                    }
                }
                else {
                    this.logger.debug('No trade signal generated');
                }
                // Sleep until next check
                const sleepTime = Math.max(0, nextCheckTime - Math.floor(Date.now() / 1000)) * 1000;
                this.logger.debug('Sleeping', { sleepTime });
                await this.sleep(sleepTime);
            }
            catch (error) {
                this.logger.error('Agent loop error', error);
                await this.sleep(60000); // Wait 60s before retry
            }
        }
    }
    /**
     * Stop the agent loop
     */
    stop() {
        this.logger.info('Stopping agent');
        this.isRunning = false;
    }
    /**
     * Utility: sleep helper
     */
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
exports.Agent = Agent;
//# sourceMappingURL=agent.js.map