import { ThirdwebSDK } from '@thirdweb-dev/sdk';
import { SmartContract } from '@thirdweb-dev/sdk';
import { Logger, ExecutionResult, AgentConfig, TradeDirection } from './types';
import { UserOpBuilder } from './userOpBuilder';
export declare class Executor {
    private sdk;
    private smartAccount;
    private userOpBuilder;
    private logger;
    private config;
    constructor(sdk: ThirdwebSDK, smartAccount: SmartContract, userOpBuilder: UserOpBuilder, config: AgentConfig, logger: Logger);
    /**
     * Execute trade via Thirdweb smart account
     */
    executeTrade(marketId: number, agentId: number, position: bigint, direction: TradeDirection): Promise<ExecutionResult>;
}
//# sourceMappingURL=executor.d.ts.map