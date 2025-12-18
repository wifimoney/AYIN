"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
function loadEnv(key, defaultValue) {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue;
}
function loadConfig() {
    return {
        chainId: parseInt(loadEnv('CHAIN_ID', '84532'), 10),
        predictionMarketAddress: loadEnv('PREDICTION_MARKET_ADDRESS'),
        rpcUrl: loadEnv('RPC_URL'),
        apiPort: parseInt(loadEnv('API_PORT', '3001'), 10),
        logLevel: loadEnv('LOG_LEVEL', 'info'),
    };
}
