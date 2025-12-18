import * as dotenv from 'dotenv';
import { AgentConfig } from './types';

dotenv.config();

function loadEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue!;
}

function loadEnvBigInt(key: string, defaultValue?: bigint): bigint {
    const value = loadEnv(key, defaultValue?.toString());
    return BigInt(value);
}

function loadEnvNumber(key: string, defaultValue?: number): number {
    const value = loadEnv(key, defaultValue?.toString());
    return Number(value);
}

export function loadConfig(): AgentConfig {
    return {
        agentPrivateKey: loadEnv('AGENT_PRIVATE_KEY'),
        agentId: loadEnvNumber('AGENT_ID', 1),
        smartAccountAddress: loadEnv('SMART_ACCOUNT_ADDRESS'),
        chainId: loadEnvNumber('CHAIN_ID', 84532),  // Base Sepolia
        rpcUrl: loadEnv('RPC_URL'),
        thirdwebClientId: loadEnv('THIRDWEB_CLIENT_ID'),

        predictionMarketAddress: loadEnv('PREDICTION_MARKET_ADDRESS'),
        delegationPolicyAddress: loadEnv('DELEGATION_POLICY_ADDRESS'),
        agentRegistryAddress: loadEnv('AGENT_REGISTRY_ADDRESS'),

        maxPositionSize: loadEnvBigInt('MAX_POSITION_SIZE', BigInt(1000e18)),
        rebalanceInterval: loadEnvNumber('REBALANCE_INTERVAL', 3600),
    };
}

export function validateConfig(config: AgentConfig): void {
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
