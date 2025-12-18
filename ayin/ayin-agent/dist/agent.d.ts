import { AgentConfig, Logger } from './types';
export declare class Agent {
    private config;
    private logger;
    private marketFetcher;
    private mandateFetcher;
    private strategy;
    private positionSizer;
    private userOpBuilder;
    private executor;
    private isRunning;
    constructor(config: AgentConfig, logger: Logger);
    /**
     * Initialize Thirdweb SDK and smart account
     */
    initialize(): Promise<void>;
    /**
     * Fetch mandate and markets
     */
    private fetchContext;
    /**
     * Main agent loop
     */
    run(): Promise<void>;
    /**
     * Stop the agent loop
     */
    stop(): void;
    /**
     * Utility: sleep helper
     */
    private sleep;
}
//# sourceMappingURL=agent.d.ts.map