'use client';

import { useReadContract, useChainId } from 'wagmi';
import { getContractAddress } from '../contracts';
import { getExplorerLink } from '../utils';

// AgentRegistry ABI (minimal for reading agent data)
const AGENT_REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'uint256', name: '_agentId', type: 'uint256' }],
    name: 'getAgent',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'operator', type: 'address' },
          { internalType: 'bytes32', name: 'strategyHash', type: 'bytes32' },
          { internalType: 'uint8', name: 'agentType', type: 'uint8' },
          { internalType: 'uint256', name: 'registeredAt', type: 'uint256' },
          { internalType: 'bool', name: 'exists', type: 'bool' },
        ],
        internalType: 'struct AgentRegistry.Agent',
        name: 'agent',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: '_agentId', type: 'uint256' }],
    name: 'agentExists',
    outputs: [{ internalType: 'bool', name: 'exists', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// Type for the agent data returned from contract
type AgentRegistryAgent = {
  operator: `0x${string}`;
  strategyHash: `0x${string}`;
  agentType: number;
  registeredAt: bigint;
  exists: boolean;
};

/**
 * Agent type enum from contract
 */
export enum OnchainAgentType {
  DIRECTIONAL = 0,
  LIQUIDITY = 1,
  ARB = 2,
}

/**
 * Map contract agent type to readable label
 */
export function getAgentTypeLabel(agentType: OnchainAgentType): string {
  switch (agentType) {
    case OnchainAgentType.DIRECTIONAL:
      return 'Directional';
    case OnchainAgentType.LIQUIDITY:
      return 'Liquidity';
    case OnchainAgentType.ARB:
      return 'Arbitrage';
    default:
      return 'Unknown';
  }
}

/**
 * Get agent type description for UI
 */
export function getAgentTypeDescription(agentType: OnchainAgentType): string {
  switch (agentType) {
    case OnchainAgentType.DIRECTIONAL:
      return 'Takes directional positions based on market predictions';
    case OnchainAgentType.LIQUIDITY:
      return 'Provides liquidity and market making strategies';
    case OnchainAgentType.ARB:
      return 'Arbitrage opportunities across markets';
    default:
      return 'Unknown agent type';
  }
}

/**
 * Onchain agent data from AgentRegistry contract
 */
export interface OnchainAgentData {
  agentId: number;
  operator: string;
  strategyHash: string;
  agentType: OnchainAgentType;
  registeredAt: number;
  exists: boolean;
}

/**
 * Hook to read agent data from AgentRegistry contract
 * @param agentId - Onchain agent ID
 */
export function useOnchainAgent(agentId: number | string | null) {
  const chainId = useChainId();
  const agentRegistryAddress = getContractAddress('AgentRegistry', chainId);

  const {
    data: agentData,
    isLoading,
    error,
    refetch,
  } = useReadContract({
    address: agentRegistryAddress !== '0x0000000000000000000000000000000000000000' 
      ? (agentRegistryAddress as `0x${string}`)
      : undefined,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'getAgent',
    args: agentId ? [BigInt(agentId)] : undefined,
    query: {
      enabled: !!agentId && agentRegistryAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  const {
    data: exists,
    isLoading: checkingExists,
  } = useReadContract({
    address: agentRegistryAddress !== '0x0000000000000000000000000000000000000000'
      ? (agentRegistryAddress as `0x${string}`)
      : undefined,
    abi: AGENT_REGISTRY_ABI,
    functionName: 'agentExists',
    args: agentId ? [BigInt(agentId)] : undefined,
    query: {
      enabled: !!agentId && agentRegistryAddress !== '0x0000000000000000000000000000000000000000',
    },
  });

  const onchainAgent: OnchainAgentData | null = agentData
    ? {
        agentId: Number(agentId),
        operator: (agentData as unknown as AgentRegistryAgent).operator,
        strategyHash: (agentData as unknown as AgentRegistryAgent).strategyHash,
        agentType: (agentData as unknown as AgentRegistryAgent).agentType as OnchainAgentType,
        registeredAt: Number((agentData as unknown as AgentRegistryAgent).registeredAt),
        exists: (agentData as unknown as AgentRegistryAgent).exists,
      }
    : null;

  const baseScanLink = agentRegistryAddress !== '0x0000000000000000000000000000000000000000' && agentId
    ? getExplorerLink('address', agentRegistryAddress, chainId)
    : null;

  return {
    onchainAgent,
    exists: exists ?? false,
    isLoading: isLoading || checkingExists,
    error,
    refetch,
    baseScanLink,
    isOnchain: agentRegistryAddress !== '0x0000000000000000000000000000000000000000',
  };
}

