"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const logger_1 = require("./logger");
const agent_1 = require("./agent");
async function main() {
    try {
        // Load and validate config
        const config = (0, config_1.loadConfig)();
        (0, config_1.validateConfig)(config);
        // Create logger
        const logger = (0, logger_1.createLogger)(process.env.LOG_LEVEL || 'info');
        logger.info('Ayin Agent starting', {
            agentId: config.agentId,
            network: config.chainId,
        });
        // Create and run agent
        const agent = new agent_1.Agent(config, logger);
        await agent.run();
    }
    catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map