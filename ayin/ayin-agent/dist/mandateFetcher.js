"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MandateFetcher = void 0;
const ethers_1 = require("ethers");
// Minimal ABI for DelegationPolicy
const POLICY_ABI = [
    'function getMandate(address smartAccount, address agent) external view returns (tuple(address agent, uint256 maxTradeSize, address[] allowedMarkets, uint256 expiryTime, bool isActive, uint256 createdAt))',
    'function isAgentAuthorized(address smartAccount, address agent) external view returns (bool)',
];
class MandateFetcher {
    constructor(policyAddress, rpcUrl, logger) {
        const provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers_1.ethers.Contract(policyAddress, POLICY_ABI, provider);
        this.logger = logger;
    }
    /**
     * Fetch mandate for agent on smart account
     */
    async getMandate(smartAccount, agentAddress) {
        try {
            this.logger.debug('Fetching mandate', { smartAccount, agentAddress });
            const [agent, maxTradeSize, allowedMarkets, expiryTime, isActive, createdAt,] = await this.contract.getMandate(smartAccount, agentAddress);
            const mandate = {
                agent,
                maxTradeSize: BigInt(maxTradeSize.toString()),
                allowedMarkets,
                expiryTime: Number(expiryTime),
                isActive,
                createdAt: Number(createdAt),
            };
            this.logger.debug('Mandate fetched', { mandate: this.serializeMandate(mandate) });
            return mandate;
        }
        catch (error) {
            this.logger.error('Failed to fetch mandate', error);
            return null;
        }
    }
    /**
     * Check if agent is currently authorized
     */
    async isAuthorized(smartAccount, agentAddress) {
        try {
            return await this.contract.isAgentAuthorized(smartAccount, agentAddress);
        }
        catch (error) {
            this.logger.error('Failed to check authorization', error);
            return false;
        }
    }
    /**
     * Check if mandate has expired
     */
    isMandateExpired(mandate) {
        return mandate.expiryTime < Math.floor(Date.now() / 1000);
    }
    /**
     * Check if market is whitelisted
     */
    isMarketWhitelisted(mandate, marketAddress) {
        return mandate.allowedMarkets.some((addr) => addr.toLowerCase() === marketAddress.toLowerCase());
    }
    serializeMandate(mandate) {
        return {
            ...mandate,
            maxTradeSize: mandate.maxTradeSize.toString()
        };
    }
}
exports.MandateFetcher = MandateFetcher;
//# sourceMappingURL=mandateFetcher.js.map