"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.validateConfig = validateConfig;
const dotenv = __importStar(require("dotenv"));
dotenv.config();
function loadEnv(key, defaultValue) {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue;
}
function loadEnvBigInt(key, defaultValue) {
    const value = loadEnv(key, defaultValue?.toString());
    return BigInt(value);
}
function loadEnvNumber(key, defaultValue) {
    const value = loadEnv(key, defaultValue?.toString());
    return Number(value);
}
function loadConfig() {
    return {
        agentPrivateKey: loadEnv('AGENT_PRIVATE_KEY'),
        agentId: loadEnvNumber('AGENT_ID', 1),
        smartAccountAddress: loadEnv('SMART_ACCOUNT_ADDRESS'),
        chainId: loadEnvNumber('CHAIN_ID', 84532), // Base Sepolia
        rpcUrl: loadEnv('RPC_URL'),
        thirdwebClientId: loadEnv('THIRDWEB_CLIENT_ID'),
        predictionMarketAddress: loadEnv('PREDICTION_MARKET_ADDRESS'),
        delegationPolicyAddress: loadEnv('DELEGATION_POLICY_ADDRESS'),
        agentRegistryAddress: loadEnv('AGENT_REGISTRY_ADDRESS'),
        maxPositionSize: loadEnvBigInt('MAX_POSITION_SIZE', BigInt(1000e18)),
        rebalanceInterval: loadEnvNumber('REBALANCE_INTERVAL', 3600),
    };
}
function validateConfig(config) {
    if (!config.agentPrivateKey.startsWith('0x')) {
        throw new Error('AGENT_PRIVATE_KEY must start with 0x');
    }
    if (!config.smartAccountAddress.startsWith('0x')) {
        throw new Error('SMART_ACCOUNT_ADDRESS must be valid Ethereum address');
    }
    if (config.maxPositionSize <= 0n) {
        throw new Error('MAX_POSITION_SIZE must be positive');
    }
}
//# sourceMappingURL=config.js.map