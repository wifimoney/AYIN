'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Clock, AlertCircle, Loader2, ExternalLink, Cpu } from 'lucide-react';
import { useDelegations, useDelegationPolicy, useAgents } from '@/lib/hooks';
import { useAccount, useChainId, useReadContracts } from 'wagmi';
import { formatEther } from 'viem';
import { getContractAddress } from '@/lib/contracts';
import { getExplorerLink } from '@/lib/utils';

// ABI for reading mandates
const MANDATE_ABI = [
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
] as const;

interface OnchainMandate {
    agent: string;
    maxTradeSize: bigint;
    allowedMarkets: string[];
    expiryTime: bigint;
    isActive: boolean;
    createdAt: bigint;
    mandateId: bigint;
    agentName?: string;
}

export function ActiveDelegation() {
    const { delegations, cancelDelegation, submitting: apiSubmitting, refetch } = useDelegations();
    const { revokeAgent, isContractDeployed, isPending: contractPending, isSuccess: revokeSuccess, error: revokeError } = useDelegationPolicy();
    const { agents } = useAgents();
    const { address } = useAccount();
    const chainId = useChainId();
    const [revoking, setRevoking] = useState(false);
    const [revokeErrorMsg, setRevokeErrorMsg] = useState('');
    const [onchainMandates, setOnchainMandates] = useState<OnchainMandate[]>([]);

    const contractAddress = getContractAddress('DelegationPolicy', chainId);
    const submitting = apiSubmitting || contractPending || revoking;

    // Get agent operators to query mandates
    const agentOperators = agents
        .filter(a => a.operator)
        .map(a => ({ operator: a.operator as `0x${string}`, name: a.name, id: a.id }));

    // Read mandates for connected wallet
    const { data: mandatesData, refetch: refetchMandates } = useReadContracts({
        contracts: address && agentOperators.length > 0
            ? agentOperators.map(agent => ({
                address: contractAddress as `0x${string}`,
                abi: MANDATE_ABI,
                functionName: 'getMandate',
                args: [address, agent.operator],
            }))
            : [],
    });

    // Process on-chain mandates
    useEffect(() => {
        if (mandatesData && agentOperators.length > 0) {
            const activeMandates: OnchainMandate[] = [];

            mandatesData.forEach((result, idx) => {
                if (result.status === 'success' && result.result) {
                    const mandate = result.result as any;
                    if (mandate.isActive && mandate.expiryTime > BigInt(Math.floor(Date.now() / 1000))) {
                        activeMandates.push({
                            agent: mandate.agent,
                            maxTradeSize: mandate.maxTradeSize,
                            allowedMarkets: mandate.allowedMarkets,
                            expiryTime: mandate.expiryTime,
                            isActive: mandate.isActive,
                            createdAt: mandate.createdAt,
                            mandateId: mandate.mandateId,
                            agentName: agentOperators[idx]?.name || 'Unknown Agent',
                        });
                    }
                }
            });

            setOnchainMandates(activeMandates);
        }
    }, [mandatesData, agentOperators]);

    useEffect(() => {
        if (revokeSuccess) {
            setRevoking(false);
            refetchMandates();
            refetch();
        }
    }, [revokeSuccess]);

    useEffect(() => {
        if (revokeError) {
            setRevoking(false);
            setRevokeErrorMsg(revokeError.message || 'Failed to revoke delegation');
        }
    }, [revokeError]);

    const handleRevoke = async (agentAddress: string) => {
        if (!address) {
            setRevokeErrorMsg('Please connect your wallet');
            return;
        }

        try {
            setRevokeErrorMsg('');
            setRevoking(true);
            await revokeAgent(agentAddress as `0x${string}`);
        } catch (error: any) {
            setRevokeErrorMsg(error?.message || 'Failed to revoke delegation');
            setRevoking(false);
        }
    };

    // Combine on-chain mandates with API delegations
    const activeDelegations = delegations.filter((d: any) => d.status === 'active');
    const hasAnyDelegations = onchainMandates.length > 0 || activeDelegations.length > 0;

    if (!hasAnyDelegations) {
        return (
            <div className="bg-surface/30 backdrop-blur-sm border border-dashed border-white/10 rounded-3xl p-8 text-center">
                <Shield className="w-10 h-10 text-secondary/20 mx-auto mb-4" />
                <p className="text-secondary text-sm font-bold uppercase tracking-widest">No active delegations</p>
                <p className="text-secondary/40 text-xs mt-2 max-w-[200px] mx-auto">Delegate to an agent to start autonomous trading</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* On-chain Mandates */}
            {onchainMandates.map((mandate, idx) => (
                <div key={`onchain-${idx}`} className="bg-gradient-to-br from-primary/10 to-accent/5 backdrop-blur-md border border-primary/20 rounded-3xl p-6 shadow-nova">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Cpu className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-lg tracking-tight">{mandate.agentName}</h3>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    On-Chain Mandate
                                </div>
                            </div>
                        </div>
                        <a
                            href={getExplorerLink('address', contractAddress, chainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 text-[10px] font-semibold text-primary uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            View Contract
                            <ExternalLink className="w-3 h-3" />
                        </a>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-6 bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-secondary/80 tracking-wider mb-1">Max Trade</span>
                            <span className="text-sm font-semibold text-white">{formatEther(mandate.maxTradeSize)} ETH</span>
                        </div>
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-secondary/80 tracking-wider mb-1">Markets</span>
                            <span className="text-sm font-semibold text-white">{mandate.allowedMarkets.length}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-secondary/80 tracking-wider mb-1">Expires</span>
                            <span className="text-sm font-semibold text-white">
                                {new Date(Number(mandate.expiryTime) * 1000).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-blue-300">
                            Created {new Date(Number(mandate.createdAt) * 1000).toLocaleString()}
                        </span>
                    </div>

                    <button
                        onClick={() => handleRevoke(mandate.agent)}
                        disabled={submitting}
                        className="w-full py-4 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-red-500/10 hover:border-red-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                Processing...
                            </div>
                        ) : (
                            'Revoke Mandate'
                        )}
                    </button>
                </div>
            ))}

            {/* API Delegations (backward compatibility) */}
            {activeDelegations.map((delegation: any) => (
                <div key={delegation.id} className="bg-gradient-to-br from-primary/10 to-accent/5 backdrop-blur-md border border-primary/20 rounded-3xl p-6 shadow-nova">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-white text-lg tracking-tight uppercase">{delegation.agentName}</h3>
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-0.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Active Delegation
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                            <Clock className="w-3.5 h-3.5 text-secondary" />
                            <span className="text-[10px] font-semibold text-secondary uppercase tracking-widest">
                                {delegation.expiresAt ? `Expires ${new Date(delegation.expiresAt).toLocaleDateString()}` : 'No Expiry'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6 mb-8 bg-black/20 p-4 rounded-2xl border border-white/5">
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-secondary/80 tracking-wider mb-1">Allocated</span>
                            <span className="text-sm font-semibold text-white">${delegation.constraints?.allocation?.toLocaleString() || '0'}</span>
                        </div>
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-secondary/80 tracking-wider mb-1">Max DD</span>
                            <span className="text-sm font-semibold text-white">{delegation.constraints?.maxDrawdown || 0}%</span>
                        </div>
                        <div>
                            <span className="block text-[10px] uppercase font-bold text-secondary/80 tracking-wider mb-1">Duration</span>
                            <span className="text-sm font-semibold text-white">{delegation.constraints?.duration || 0}d</span>
                        </div>
                    </div>

                    <button
                        onClick={() => cancelDelegation(delegation.id)}
                        disabled={submitting}
                        className="w-full py-4 bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {submitting ? (
                            <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                Processing...
                            </div>
                        ) : (
                            'Revoke Delegation'
                        )}
                    </button>
                </div>
            ))}

            {revokeErrorMsg && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-xs font-bold text-red-500 uppercase tracking-tight">{revokeErrorMsg}</span>
                </div>
            )}
        </div>
    );
}
