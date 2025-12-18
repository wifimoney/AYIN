import { loadConfig } from './config';
import { createLogger } from './logger';
import { EventListener } from './eventListener';
import { DataStore } from './dataStore';
import { MetricsCalculator } from './metricsCalculator';
import { ReputationIndexer } from './indexer';
import { ReputationAPI } from './api';
import path from 'path';

async function main() {
    const config = loadConfig();
    const logger = createLogger(config.logLevel);

    logger.info('Starting reputation system', {
        network: config.chainId,
        market: config.predictionMarketAddress,
    });

    // Initialize components
    const eventListener = new EventListener(
        config.predictionMarketAddress,
        config.rpcUrl,
        logger
    );

    const dbPath = path.join(__dirname, '../reputation.db');
    const dataStore = new DataStore(dbPath, logger);
    const metricsCalculator = new MetricsCalculator(logger);
    const indexer = new ReputationIndexer(
        eventListener,
        dataStore,
        metricsCalculator,
        logger
    );

    const api = new ReputationAPI(dataStore, metricsCalculator, logger);

    // Start API
    api.start(config.apiPort);

    // Start indexer
    await indexer.start();

    // Handle shutdown
    process.on('SIGINT', () => {
        logger.info('Shutting down...');
        indexer.stop();
        dataStore.close();
        process.exit(0);
    });
}

main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
