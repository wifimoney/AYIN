import { loadConfig, validateConfig } from './config';
import { createLogger } from './logger';
import { Agent } from './agent';

async function main() {
    try {
        // Load and validate config
        const config = loadConfig();
        validateConfig(config);

        // Create logger
        const logger = createLogger(
            (process.env.LOG_LEVEL as any) || 'info'
        );

        logger.info('Ayin Agent starting', {
            agentId: config.agentId,
            network: config.chainId,
        });

        // Create and run agent
        const agent = new Agent(config, logger);
        await agent.run();
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
