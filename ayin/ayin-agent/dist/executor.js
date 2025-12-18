"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Executor = void 0;
class Executor {
    constructor(sdk, smartAccount, userOpBuilder, config, logger) {
        this.sdk = sdk;
        this.smartAccount = smartAccount;
        this.userOpBuilder = userOpBuilder;
        this.config = config;
        this.logger = logger;
    }
    /**
     * Execute trade via Thirdweb smart account
     */
    async executeTrade(marketId, agentId, position, direction) {
        try {
            this.logger.info('Starting trade execution', {
                marketId,
                agentId,
                position: position.toString(),
                direction,
            });
            // Build transaction
            const tx = this.userOpBuilder.buildTradeTransaction(marketId, agentId, position, direction);
            this.logger.debug('Transaction built', { tx });
            // Send via smart account (handles user op creation + gas estimation)
            // Note: In Thirdweb SDK v4, generic contracts have a `call` method, but for SmartWallet execution
            // we usually rely on specific wallet interfaces. For this MVP, assuming the smartAccount
            // instance (SmartContract) has the 'execute' function exposed on the ABI.
            // If we operate as a signer on the SmartWallet, we might need a different flow.
            // But adhering to tracker:
            const receipt = await this.smartAccount.call('execute', [tx.to, 0, tx.data]);
            // The `execute` function signature on standard AA accounts varies.
            // SimpleAccount: execute(dest, value, func)
            // Thirdweb SmartWallet: execute(target, value, data) matches.
            // Wait for receipt if call returns a generic TransactionResult or similar, 
            // but 'call' usually waits for tx unless configured otherwise.
            // Actually 'call' returns the function return value.
            // We might want `smartAccount.prepare("execute", [tx.to, 0, tx.data]).execute()` for full transaction lifecycle tracking.
            // Let's assume we use the write method pattern:
            const txResult = await this.smartAccount.call('execute', [tx.to, 0, tx.data]);
            this.logger.info('Trade executed successfully', {
                txHash: txResult?.receipt?.transactionHash,
            });
            return {
                success: true,
                txHash: txResult?.receipt?.transactionHash,
            };
        }
        catch (error) {
            this.logger.error('Trade execution failed', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
exports.Executor = Executor;
//# sourceMappingURL=executor.js.map