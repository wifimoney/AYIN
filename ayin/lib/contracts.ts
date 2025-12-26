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
  AgentRegistry: '0xD585649d1d8170B72b9A332bE9E0aA03e056c61f',
  DelegationPolicy: '0xF7A24BFE63904DAa1d3Ea1020Bc356FDb1adb3DE',
  AyinSmartAccount: '0xeFdfaA65c2dB1099D9fE168FBc7B4f90266f076E',
  PredictionMarket: '0x6056a0bAA7d6BD6c0aA27feee847C11fb5eb5BD9',
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
  DELEGATION_POLICY: '0xF7A24BFE63904DAa1d3Ea1020Bc356FDb1adb3DE', // Base Sepolia DelegationPolicy
  PREDICTION_MARKET: '0x6056a0bAA7d6BD6c0aA27feee847C11fb5eb5BD9', // Base Sepolia PredictionMarket
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