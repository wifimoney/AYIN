export const DEFAULT_PAYMASTER_URL = 'https://api.developer.coinbase.com/rpc/v1/base-sepolia/wP2FIGRV7F5JAgmfSDA4GT4iPfK2WREh';

export const getPaymasterUrl = () => {
    return process.env.NEXT_PUBLIC_PAYMASTER_URL || DEFAULT_PAYMASTER_URL;
};
