import { ethers } from 'ethers';


// Shim types that were removed from global types
interface Logger {
    debug(msg: string, data?: Record<string, unknown>): void;
}

enum TradeDirection {
    YES = 1,
    NO = 2,
}

// DelegationPolicy ABI (minimal)
const DELEGATION_POLICY_ABI = [
    'function executeTrade(uint256 marketId,uint256 agentId,uint256 shareSize,uint8 direction)'
];

export class UserOpBuilder {
    private delegationPolicyAddress: string;
    private delegationInterface: ethers.utils.Interface;
    private logger: Logger;

    constructor(delegationPolicyAddress: string, logger: Logger) {
        this.delegationPolicyAddress = delegationPolicyAddress;
        this.delegationInterface = new ethers.utils.Interface([
            'function executeTrade(uint256 marketId,uint256 agentId,uint256 shareSize,uint8 direction)'
        ]);
        this.logger = logger;
    }

    /**
     * Build callData for delegated trade execution
     * NOTE: This targets DelegationPolicy, not the market
     */
    buildTradeCallData(
        marketId: number,
        agentId: number,
        position: bigint,
        direction: TradeDirection
    ): string {
        this.logger.debug('Building delegated trade callData', {
            marketId,
            agentId,
            position: position.toString(),
            direction,
        });

        const callData = this.delegationInterface.encodeFunctionData(
            'executeTrade',
            [
                marketId,
                agentId,
                position,
                direction,
            ]
        );

        return callData;
    }

    /**
     * Build transaction payload for ERC-4337 Smart Account
     */
    buildTradeTransaction(
        marketId: number,
        agentId: number,
        position: bigint,
        direction: TradeDirection
    ): {
        to: string;
        data: string;
        value: string;
    } {
        const callData = this.buildTradeCallData(
            marketId,
            agentId,
            position,
            direction
        );

        return {
            to: this.delegationPolicyAddress,
            data: callData,
            value: '0',
        };
    }
}