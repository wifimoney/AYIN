import { fetchMarketSignals } from '../markets/markets';
import { enforcePolicy } from '../policy/policy';
import { Executor } from '../execution/executor';
import { logAction, logger } from '../observability/logger';
import { config } from '../config/config';

export async function runAgent() {
    logAction({ msg: 'Agent heartbeat' });

    // Initialize Executor
    const executor = new Executor(logger);

    // 1. Fetch opportunities
    const signals = await fetchMarketSignals();

    for (const signal of signals) {
        // 2. Check policy (TODO: Fetch real policy from contract)
        const policy = {
            maxAllocation: BigInt(100),
            maxDrawdown: 10,
            allowedMarkets: [signal.marketId], // Allow all for now in dev
            expiresAt: Date.now() / 1000 + 3600
        };

        if (enforcePolicy(signal, policy)) {
            logAction({ msg: 'Signal valid', signal });

            // 3. Execute
            await executor.executeTrade(signal);
        } else {
            logAction({ msg: 'Signal rejected by policy', signal });
        }
    }
}
