/**
 * Utility functions
 */

/**
 * Format an Ethereum address to show first 6 and last 4 characters
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Get BaseScan URL based on chain ID
 * @param chainId - Chain ID (8453 for Base Mainnet, 84532 for Base Sepolia)
 * @returns BaseScan URL for the chain
 */
export function getBaseScanUrl(chainId: number): string {
  return chainId === 84532 
    ? 'https://sepolia.basescan.org' 
    : 'https://basescan.org';
}

/**
 * Get explorer link for transaction or address
 * @param type - 'tx' for transaction or 'address' for address
 * @param hash - Transaction hash or address
 * @param chainId - Chain ID (defaults to Base Sepolia for demo)
 * @returns Full explorer URL
 */
export function getExplorerLink(
  type: 'tx' | 'address', 
  hash: string, 
  chainId?: number
): string {
  // Default to Base Sepolia if chainId not provided
  const defaultChainId = typeof window !== 'undefined' 
    ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '84532', 10)
    : 84532;
  
  const finalChainId = chainId || defaultChainId;
  const baseUrl = getBaseScanUrl(finalChainId);
  return `${baseUrl}/${type}/${hash}`;
}

