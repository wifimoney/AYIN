import { Mandate, Logger } from './types';
export declare class MandateFetcher {
    private contract;
    private logger;
    constructor(policyAddress: string, rpcUrl: string, logger: Logger);
    /**
     * Fetch mandate for agent on smart account
     */
    getMandate(smartAccount: string, agentAddress: string): Promise<Mandate | null>;
    /**
     * Check if agent is currently authorized
     */
    isAuthorized(smartAccount: string, agentAddress: string): Promise<boolean>;
    /**
     * Check if mandate has expired
     */
    isMandateExpired(mandate: Mandate): boolean;
    /**
     * Check if market is whitelisted
     */
    isMarketWhitelisted(mandate: Mandate, marketAddress: string): boolean;
    private serializeMandate;
}
//# sourceMappingURL=mandateFetcher.d.ts.map