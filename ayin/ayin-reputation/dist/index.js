"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
const logger_1 = require("./logger");
const eventListener_1 = require("./eventListener");
const dataStore_1 = require("./dataStore");
const metricsCalculator_1 = require("./metricsCalculator");
const indexer_1 = require("./indexer");
const api_1 = require("./api");
const path_1 = __importDefault(require("path"));
async function main() {
    const config = (0, config_1.loadConfig)();
    const logger = (0, logger_1.createLogger)(config.logLevel);
    logger.info('Starting reputation system', {
        network: config.chainId,
        market: config.predictionMarketAddress,
    });
    // Initialize components
    const eventListener = new eventListener_1.EventListener(config.predictionMarketAddress, config.rpcUrl, logger);
    const dbPath = path_1.default.join(__dirname, '../reputation.db');
    const dataStore = new dataStore_1.DataStore(dbPath, logger);
    const metricsCalculator = new metricsCalculator_1.MetricsCalculator(logger);
    const indexer = new indexer_1.ReputationIndexer(eventListener, dataStore, metricsCalculator, logger);
    const api = new api_1.ReputationAPI(dataStore, metricsCalculator, logger);
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
