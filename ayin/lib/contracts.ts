/**
 * Contract addresses deployed on Base network
 * 
 * IMPORTANT: These addresses are FROZEN and should NOT be changed after deployment.
 * Judges will verify these addresses on BaseScan.
 * 
 * To update addresses after deployment:
 * 1. Deploy new contracts
 * 2. Verify on BaseScan
 * 3. Update this file with new addresses
 * 4. Commit the changes
 */

// Base Sepolia (for demo/testing)
// ⚠️ IMPORTANT: After deployment, replace these addresses with actual deployed addresses
// Addresses are FROZEN after deployment - judges will verify on BaseScan
export const CONTRACTS_BASE_SEPOLIA = {
  AgentRegistry: '0xF2Cc613924e7f3e3Ee453f417F5eA63Aa78cC1D4',
  DelegationPolicy: '0x71d50d575A86E6F34BE05abC223ac704da0d7a1d',
  AyinSmartAccount: '0x25269aB39a7dF7303fb35cfA947a12E5244e23fC',
  PredictionMarket: '0x89ecC0E5345D409930426cF1b352E30930da563E',
} as const;

// Base Mainnet (for production)
export const CONTRACTS_BASE_MAINNET = {
  AgentRegistry: '0x0000000000000000000000000000000000000000', // TODO: Replace with deployed address
  DelegationPolicy: '0x0000000000000000000000000000000000000000', // TODO: Replace with deployed address
  AyinSmartAccount: '0x0000000000000000000000000000000000000000', // TODO: Replace with deployed address (if factory pattern)
  PredictionMarket: '0x0000000000000000000000000000000000000000', // TODO: Replace with deployed address
} as const;

/**
 * Get contract addresses based on chain ID
 * @param chainId - Chain ID (8453 for Base Mainnet, 84532 for Base Sepolia)
 * @returns Contract addresses for the specified chain
 */
export function getContracts(chainId: number) {
  if (chainId === 84532) {
    return CONTRACTS_BASE_SEPOLIA;
  } else if (chainId === 8453) {
    return CONTRACTS_BASE_MAINNET;
  } else {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * Get contract address by name
 * @param contractName - Name of the contract
 * @param chainId - Chain ID (defaults to Base Sepolia for demo)
 * @returns Contract address
 */
export function getContractAddress(
  contractName: keyof typeof CONTRACTS_BASE_SEPOLIA,
  chainId?: number
): string {
  const defaultChainId = typeof window !== 'undefined'
    ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10)
    : 84532;

  const contracts = getContracts(chainId || defaultChainId);
  return contracts[contractName];
}

export const CONTRACTS = {
  DELEGATION_POLICY: '0x71d50d575A86E6F34BE05abC223ac704da0d7a1d', // Base Sepolia DelegationPolicy
  PREDICTION_MARKET: '0x89ecC0E5345D409930426cF1b352E30930da563E', // Base Sepolia PredictionMarket
} as const;

export const ABIS = {
  DELEGATION: [
    {
      name: 'createMandate',
      type: 'function',
      inputs: [
        { name: '_agent', type: 'address' },
        { name: '_maxTradeSize', type: 'uint256' },
        { name: '_allowedMarkets', type: 'address[]' },
        { name: '_expiryTime', type: 'uint256' },
      ],
      outputs: [{ name: 'mandateId', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
  ],
  MARKET: [
    {
      name: 'placeBet',
      type: 'function',
      inputs: [
        { name: 'marketId', type: 'uint256' },
        { name: 'outcome', type: 'bool' },
        { name: 'amount', type: 'uint256' },
      ],
      stateMutability: 'payable',
    },
  ],
};