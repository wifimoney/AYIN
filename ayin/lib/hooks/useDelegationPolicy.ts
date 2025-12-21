'use client';

import { useWriteContract, useReadContract, useWaitForTransactionReceipt, useChainId, useAccount } from 'wagmi';
import { getContractAddress } from '../contracts';
import { parseEther, formatEther } from 'viem';

// DelegationPolicy ABI
const DELEGATION_POLICY_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_agent', type: 'address' },
      { internalType: 'uint256', name: '_maxTradeSize', type: 'uint256' },
      { internalType: 'address[]', name: '_allowedMarkets', type: 'address[]' },
      { internalType: 'uint256', name: '_expiryTime', type: 'uint256' },
    ],
    name: 'createMandate',
    outputs: [{ internalType: 'uint256', name: 'mandateId', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_agent', type: 'address' }],
    name: 'revokeAgent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_smartAccount', type: 'address' },
      { internalType: 'address', name: '_agent', type: 'address' },
    ],
    name: 'getMandate',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'agent', type: 'address' },
          { internalType: 'uint256', name: 'maxTradeSize', type: 'uint256' },
          { internalType: 'address[]', name: 'allowedMarkets', type: 'address[]' },
          { internalType: 'uint256', name: 'expiryTime', type: 'uint256' },
          { internalType: 'bool', name: 'isActive', type: 'bool' },
          { internalType: 'uint256', name: 'createdAt', type: 'uint256' },
          { internalType: 'uint256', name: 'mandateId', type: 'uint256' },
        ],
        internalType: 'struct DelegationPolicy.Mandate',
        name: 'mandate',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '_smartAccount', type: 'address' },
      { internalType: 'address', name: '_agent', type: 'address' },
    ],
    name: 'isAgentAuthorized',
    outputs: [{ internalType: 'bool', name: 'authorized', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: '',
        type: 'address' },
      { internalType: 'address', name: '',
        type: 'address' },
    ],
    name: 'mandateIndex',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'smartAccount', type: 'address' },
      { indexed: true, internalType: 'address', name: 'agent', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'maxTradeSize', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'expiryTime', type: 'uint256' },
      { indexed: false, internalType: 'address[]', name: 'allowedMarkets', type: 'address[]' },
    ],
    name: 'MandateCreated',
  },
  {
    type: 'event',
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'smartAccount', type: 'address' },
      { indexed: true, internalType: 'address', name: 'agent', type: 'address' },
    ],
    name: 'MandateRevoked',
  },
] as const;

export interface CreateMandateParams {
  agent: `0x${string}`;
  maxTradeSize: bigint; // in wei/tokens
  allowedMarkets: `0x${string}`[];
  expiryTime: bigint; // Unix timestamp
}

/**
 * Hook to interact with DelegationPolicy contract
 */
export function useDelegationPolicy() {
  const chainId = useChainId();
  const { address } = useAccount();
  const contractAddress = getContractAddress('DelegationPolicy', chainId);
  const isContractDeployed = contractAddress !== '0x0000000000000000000000000000000000000000';

  const {
    writeContract,
    data: hash,
    isPending: isWriting,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  /**
   * Create a new mandate onchain
   */
  const createMandate = async (params: CreateMandateParams) => {
    if (!isContractDeployed) {
      throw new Error('DelegationPolicy contract not deployed');
    }
    if (!address) {
      throw new Error('Wallet not connected');
    }

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: DELEGATION_POLICY_ABI,
      functionName: 'createMandate',
      args: [params.agent, params.maxTradeSize, params.allowedMarkets, params.expiryTime],
    });
  };

  /**
   * Revoke an agent's mandate
   */
  const revokeAgent = async (agentAddress: `0x${string}`) => {
    if (!isContractDeployed) {
      throw new Error('DelegationPolicy contract not deployed');
    }
    if (!address) {
      throw new Error('Wallet not connected');
    }

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: DELEGATION_POLICY_ABI,
      functionName: 'revokeAgent',
      args: [agentAddress],
    });
  };

  /**
   * Check if agent is authorized for a smart account
   */
  const checkAuthorization = useReadContract({
    address: isContractDeployed ? (contractAddress as `0x${string}`) : undefined,
    abi: DELEGATION_POLICY_ABI,
    functionName: 'isAgentAuthorized',
    args: address && isContractDeployed ? [address, '0x0000000000000000000000000000000000000000' as `0x${string}`] : undefined,
    query: {
      enabled: false, // Only call when explicitly needed
    },
  });

  return {
    createMandate,
    revokeAgent,
    checkAuthorization,
    isContractDeployed,
    contractAddress,
    hash,
    isPending: isWriting || isConfirming,
    isSuccess: isConfirmed,
    error: writeError || receiptError,
  };
}

