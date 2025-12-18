import { ethers } from 'ethers';
import { Mandate, Logger } from './types';

// Minimal ABI for DelegationPolicy
const POLICY_ABI = [
    'function getMandate(address smartAccount, address agent) external view returns (tuple(address agent, uint256 maxTradeSize, address[] allowedMarkets, uint256 expiryTime, bool isActive, uint256 createdAt))',
    'function isAgentAuthorized(address smartAccount, address agent) external view returns (bool)',
];

export class MandateFetcher {
    private contract: ethers.Contract;
    private logger: Logger;

    constructor(
        policyAddress: string,
        rpcUrl: string,
        logger: Logger
    ) {
        const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers.Contract(policyAddress, POLICY_ABI, provider);
        this.logger = logger;
    }

    /**
     * Fetch mandate for agent on smart account
     */
    async getMandate(
        smartAccount: string,
        agentAddress: string
    ): Promise<Mandate | null> {
        try {
            this.logger.debug('Fetching mandate', { smartAccount, agentAddress });

            const [
                agent,
                maxTradeSize,
                allowedMarkets,
                expiryTime,
                isActive,
                createdAt,
            ] = await this.contract.getMandate(smartAccount, agentAddress);

            const mandate: Mandate = {
                agent,
                maxTradeSize: BigInt(maxTradeSize.toString()),
                allowedMarkets,
                expiryTime: Number(expiryTime),
                isActive,
                createdAt: Number(createdAt),
            };

            this.logger.debug('Mandate fetched', { mandate: this.serializeMandate(mandate) });
            return mandate;
        } catch (error) {
            this.logger.error('Failed to fetch mandate', error as Error);
            return null;
        }
    }

    /**
     * Check if agent is currently authorized
     */
    async isAuthorized(
        smartAccount: string,
        agentAddress: string
    ): Promise<boolean> {
        try {
            return await this.contract.isAgentAuthorized(smartAccount, agentAddress);
        } catch (error) {
            this.logger.error('Failed to check authorization', error as Error);
            return false;
        }
    }

    /**
     * Check if mandate has expired
     */
    isMandateExpired(mandate: Mandate): boolean {
        return mandate.expiryTime < Math.floor(Date.now() / 1000);
    }

    /**
     * Check if market is whitelisted
     */
    isMarketWhitelisted(mandate: Mandate, marketAddress: string): boolean {
        return mandate.allowedMarkets.some(
            (addr) => addr.toLowerCase() === marketAddress.toLowerCase()
        );
    }

    private serializeMandate(mandate: Mandate): any {
        return {
            ...mandate,
            maxTradeSize: mandate.maxTradeSize.toString()
        };
    }
}
