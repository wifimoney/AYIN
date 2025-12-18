import dotenv from 'dotenv';

dotenv.config();

export interface Config {
    chainId: number;
    predictionMarketAddress: string;
    rpcUrl: string;
    apiPort: number;
    logLevel: string;
}

function loadEnv(key: string, defaultValue?: string): string {
    const value = process.env[key];
    if (!value && defaultValue === undefined) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value || defaultValue!;
}

export function loadConfig(): Config {
    return {
        chainId: parseInt(loadEnv('CHAIN_ID', '84532'), 10),
        predictionMarketAddress: loadEnv('PREDICTION_MARKET_ADDRESS'),
        rpcUrl: loadEnv('RPC_URL'),
        apiPort: parseInt(loadEnv('API_PORT', '3001'), 10),
        logLevel: loadEnv('LOG_LEVEL', 'info'),
    };
}
