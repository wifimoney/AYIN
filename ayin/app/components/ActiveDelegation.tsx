'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Clock, AlertCircle, Loader2, ExternalLink, Cpu, CheckCircle, ChevronDown, ChevronUp, TrendingUp, Wallet, PieChart, RefreshCw } from 'lucide-react';
import { useDelegations, useDelegationPolicy, useAgents } from '@/lib/hooks';
import { useAccount, useChainId, useReadContracts, useBlockNumber } from 'wagmi';
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
    const [expandedMandate, setExpandedMandate] = useState<string | null>(null);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const contractAddress = getContractAddress('DelegationPolicy', chainId);
    const submitting = apiSubmitting || contractPending || revoking;

    // Watch for new blocks to trigger refetch
    const { data: blockNumber } = useBlockNumber({
        watch: true,
        query: {
            refetchInterval: 12000, // Refetch block number every 12 seconds (Base block time)
        }
    });

    // Get agent operators to query mandates
    const agentOperators = agents
        .filter((a: { operator?: string }) => a.operator)
        .map((a: { operator?: string; name: string; id: string }) => ({
            operator: a.operator as `0x${string}`,
            name: a.name,
            id: a.id
        }));

    // Read mandates for connected wallet with proper caching
    const { data: mandatesData, refetch: refetchMandates, isLoading: isMandatesLoading, isFetching: isMandatesFetching } = useReadContracts({
        contracts: address && agentOperators.length > 0
            ? agentOperators.map((agent: { operator: `0x${string}`; name: string; id: string }) => ({
                address: contractAddress as `0x${string}`,
                abi: MANDATE_ABI,
                functionName: 'getMandate',
                args: [address, agent.operator],
            }))
            : [],
        query: {
            enabled: !!address && agentOperators.length > 0 && isContractDeployed,
            refetchInterval: 15000, // Auto-refetch every 15 seconds
            staleTime: 10000, // Consider data stale after 10 seconds
        }
    });

    // Refetch when new block is mined
    useEffect(() => {
        if (blockNumber && address && agentOperators.length > 0) {
            refetchMandates();
        }
    }, [blockNumber]);

    // Process on-chain mandates and update timestamp
    useEffect(() => {
        if (mandatesData && agentOperators.length > 0) {
            const activeMandates: OnchainMandate[] = [];

            mandatesData.forEach((result: any, idx: number) => {
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
            setLastUpdated(new Date());
            setIsRefreshing(false);
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

    // Manual refresh handler
    const handleManualRefresh = useCallback(async () => {
        setIsRefreshing(true);
        await refetchMandates();
        refetch();
    }, [refetchMandates, refetch]);

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
    const allDelegations = [
        ...onchainMandates.map((m: OnchainMandate) => ({ type: 'onchain' as const, data: m })),
        ...activeDelegations.map((d: any) => ({ type: 'api' as const, data: d }))
    ];
    const hasAnyDelegations = allDelegations.length > 0;

    // Calculate portfolio summary
    const totalMaxTrade = onchainMandates.reduce((acc: number, m: OnchainMandate) => acc + Number(formatEther(m.maxTradeSize)), 0);
    const totalMarkets = onchainMandates.reduce((acc: number, m: OnchainMandate) => acc + m.allowedMarkets.length, 0);

    // Loading state
    const isLoading = isMandatesLoading || isMandatesFetching || isRefreshing;

    if (!hasAnyDelegations) {
        return (
            <div className="bg-white/[0.02] backdrop-blur-xl border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <Shield className="w-10 h-10 text-white/10 mx-auto mb-4" />
                <p className="text-white/50 text-xs font-bold uppercase tracking-[0.2em]">No active delegations</p>
                <p className="text-white/30 text-[10px] mt-2 max-w-[220px] mx-auto tracking-wide">Delegate to an agent to start autonomous trading</p>
            </div>
        );
    }

    // Single delegation - show detailed view
    if (allDelegations.length === 1) {
        const item = allDelegations[0];
        if (item.type === 'onchain') {
            const mandate = item.data;
            return (
                <div className="space-y-5">
                    {/* Header with Sync Status */}
                    <div className="px-1 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-[10px] font-bold text-[#0052FF]/70 uppercase tracking-[0.25em]">Active Mandate</h2>
                            <div className="flex items-center gap-1.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                                <span className="text-[9px] font-medium text-white/40 uppercase tracking-wider">
                                    {isLoading ? 'Syncing...' : 'On-Chain'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {lastUpdated && (
                                <span className="text-[9px] text-white/30">
                                    Updated {lastUpdated.toLocaleTimeString()}
                                </span>
                            )}
                            <button
                                onClick={handleManualRefresh}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/[0.06] text-[9px] font-bold text-white/50 uppercase tracking-widest hover:bg-white/10 hover:text-white/70 transition-all disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    </div>
                    <SingleMandateCard
                        mandate={mandate}
                        contractAddress={contractAddress}
                        chainId={chainId}
                        onRevoke={handleRevoke}
                        submitting={submitting}
                    />
                    {revokeErrorMsg && <ErrorMessage message={revokeErrorMsg} />}
                </div>
            );
        }
    }

    // Multiple delegations - show portfolio widget
    return (
        <div className="space-y-5">
            {/* Section Header with Sync Status */}
            <div className="px-1 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-[10px] font-bold text-[#0052FF]/70 uppercase tracking-[0.25em]">Portfolio</h2>
                    {/* On-chain sync indicator */}
                    <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                        <span className="text-[9px] font-medium text-white/40 uppercase tracking-wider">
                            {isLoading ? 'Syncing...' : 'On-Chain'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* Last updated timestamp */}
                    {lastUpdated && (
                        <span className="text-[9px] text-white/30">
                            Updated {lastUpdated.toLocaleTimeString()}
                        </span>
                    )}
                    {/* Manual refresh button */}
                    <button
                        onClick={handleManualRefresh}
                        disabled={isLoading}
                        className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-lg border border-white/[0.06] text-[9px] font-bold text-white/50 uppercase tracking-widest hover:bg-white/10 hover:text-white/70 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                        {!isLoading && <span>Refresh</span>}
                    </button>
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                        {allDelegations.length} Active
                    </span>
                </div>
            </div>

            {/* Portfolio Summary Card */}
            <div
                className="relative bg-white/[0.03] backdrop-blur-xl border border-[#0052FF]/20 rounded-2xl p-5 
                           shadow-[0_8px_32px_rgba(0,82,255,0.08)]"
                style={{
                    background: 'linear-gradient(135deg, rgba(0,82,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                }}
            >
                <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#0052FF]/10 via-transparent to-transparent opacity-50 pointer-events-none" />

                {/* Summary Stats */}
                <div className="relative grid grid-cols-3 gap-4 mb-5">
                    <div className="bg-black/20 rounded-xl p-3 border border-white/[0.04]">
                        <div className="flex items-center gap-2 mb-1">
                            <Wallet className="w-3.5 h-3.5 text-[#0052FF]/60" />
                            <span className="text-[9px] uppercase font-bold text-[#0052FF]/50 tracking-widest">Total Capacity</span>
                        </div>
                        <span className="text-lg font-bold text-white">{totalMaxTrade.toFixed(2)} ETH</span>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 border border-white/[0.04]">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-400/60" />
                            <span className="text-[9px] uppercase font-bold text-[#0052FF]/50 tracking-widest">Agents</span>
                        </div>
                        <span className="text-lg font-bold text-white">{allDelegations.length}</span>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 border border-white/[0.04]">
                        <div className="flex items-center gap-2 mb-1">
                            <PieChart className="w-3.5 h-3.5 text-amber-400/60" />
                            <span className="text-[9px] uppercase font-bold text-[#0052FF]/50 tracking-widest">Markets</span>
                        </div>
                        <span className="text-lg font-bold text-white">{totalMarkets}</span>
                    </div>
                </div>

                {/* Delegations List */}
                <div className="relative space-y-2">
                    {allDelegations.map((item, idx) => {
                        const key = item.type === 'onchain'
                            ? `onchain-${item.data.mandateId}`
                            : `api-${(item.data as any).id}`;
                        const isExpanded = expandedMandate === key;

                        if (item.type === 'onchain') {
                            return (
                                <CompactMandateRow
                                    key={key}
                                    mandate={item.data}
                                    isExpanded={isExpanded}
                                    onToggle={() => setExpandedMandate(isExpanded ? null : key)}
                                    onRevoke={handleRevoke}
                                    submitting={submitting}
                                    contractAddress={contractAddress}
                                    chainId={chainId}
                                />
                            );
                        } else {
                            return (
                                <CompactDelegationRow
                                    key={key}
                                    delegation={item.data as any}
                                    isExpanded={isExpanded}
                                    onToggle={() => setExpandedMandate(isExpanded ? null : key)}
                                    onRevoke={() => cancelDelegation((item.data as any).id)}
                                    submitting={submitting}
                                />
                            );
                        }
                    })}
                </div>
            </div>

            {revokeErrorMsg && <ErrorMessage message={revokeErrorMsg} />}
        </div>
    );
}

// Compact row for on-chain mandate
function CompactMandateRow({
    mandate,
    isExpanded,
    onToggle,
    onRevoke,
    submitting,
    contractAddress,
    chainId
}: {
    mandate: OnchainMandate;
    isExpanded: boolean;
    onToggle: () => void;
    onRevoke: (address: string) => void;
    submitting: boolean;
    contractAddress: string;
    chainId: number;
}) {
    const daysUntilExpiry = Math.ceil((Number(mandate.expiryTime) * 1000 - Date.now()) / (1000 * 60 * 60 * 24));

    return (
        <div className="bg-black/20 rounded-xl border border-white/[0.06] overflow-hidden transition-all">
            {/* Compact Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#0052FF]/10 border border-[#0052FF]/20 flex items-center justify-center">
                        <Cpu className="w-4 h-4 text-[#0052FF]" />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-sm">{mandate.agentName}</span>
                            <CheckCircle className="w-3 h-3 text-[#0052FF]" />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-emerald-400" />
                            <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-wider">On-Chain</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-xs font-semibold text-white">{formatEther(mandate.maxTradeSize)} ETH</span>
                        <span className="block text-[9px] text-white/40">{daysUntilExpiry}d left</span>
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-white/40" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                    )}
                </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-3 pb-3 border-t border-white/[0.04]">
                    <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
                        <div>
                            <span className="block text-[9px] uppercase font-bold text-white/30 tracking-widest mb-1">Max Trade</span>
                            <span className="text-xs font-semibold text-white">{formatEther(mandate.maxTradeSize)} ETH</span>
                        </div>
                        <div>
                            <span className="block text-[9px] uppercase font-bold text-white/30 tracking-widest mb-1">Markets</span>
                            <span className="text-xs font-semibold text-white">{mandate.allowedMarkets.length}</span>
                        </div>
                        <div>
                            <span className="block text-[9px] uppercase font-bold text-white/30 tracking-widest mb-1">Expires</span>
                            <span className="text-xs font-semibold text-white">{new Date(Number(mandate.expiryTime) * 1000).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <a
                            href={getExplorerLink('address', contractAddress, chainId)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/5 rounded-lg border border-white/[0.06] text-[9px] font-bold text-white/60 uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            View <ExternalLink className="w-3 h-3" />
                        </a>
                        <button
                            onClick={() => onRevoke(mandate.agent)}
                            disabled={submitting}
                            className="flex-1 py-2 bg-red-500/10 rounded-lg border border-red-500/20 text-[9px] font-bold text-red-400 uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                        >
                            {submitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Revoke'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Compact row for API delegation
function CompactDelegationRow({
    delegation,
    isExpanded,
    onToggle,
    onRevoke,
    submitting
}: {
    delegation: any;
    isExpanded: boolean;
    onToggle: () => void;
    onRevoke: () => void;
    submitting: boolean;
}) {
    const daysUntilExpiry = delegation.expiresAt
        ? Math.ceil((new Date(delegation.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    return (
        <div className="bg-black/20 rounded-xl border border-white/[0.06] overflow-hidden transition-all">
            {/* Compact Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-3 hover:bg-white/[0.02] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-white/60" />
                    </div>
                    <div className="text-left">
                        <span className="font-bold text-white text-sm">{delegation.agentName || 'Agent'}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                            <div className="w-1 h-1 rounded-full bg-amber-400" />
                            <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-wider">API</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <span className="text-xs font-semibold text-white">${delegation.constraints?.allocation?.toLocaleString() || '0'}</span>
                        {daysUntilExpiry && <span className="block text-[9px] text-white/40">{daysUntilExpiry}d left</span>}
                    </div>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-white/40" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-white/40" />
                    )}
                </div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="px-3 pb-3 border-t border-white/[0.04]">
                    <div className="grid grid-cols-3 gap-3 mt-3 mb-3">
                        <div>
                            <span className="block text-[9px] uppercase font-bold text-white/30 tracking-widest mb-1">Allocated</span>
                            <span className="text-xs font-semibold text-white">${delegation.constraints?.allocation?.toLocaleString() || '0'}</span>
                        </div>
                        <div>
                            <span className="block text-[9px] uppercase font-bold text-white/30 tracking-widest mb-1">Max DD</span>
                            <span className="text-xs font-semibold text-white">{delegation.constraints?.maxDrawdown || 0}%</span>
                        </div>
                        <div>
                            <span className="block text-[9px] uppercase font-bold text-white/30 tracking-widest mb-1">Duration</span>
                            <span className="text-xs font-semibold text-white">{delegation.constraints?.duration || 0}d</span>
                        </div>
                    </div>
                    <button
                        onClick={onRevoke}
                        disabled={submitting}
                        className="w-full py-2 bg-red-500/10 rounded-lg border border-red-500/20 text-[9px] font-bold text-red-400 uppercase tracking-widest hover:bg-red-500/20 transition-all disabled:opacity-50"
                    >
                        {submitting ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : 'Revoke Delegation'}
                    </button>
                </div>
            )}
        </div>
    );
}

// Single mandate detailed card (for when only 1 delegation exists)
function SingleMandateCard({
    mandate,
    contractAddress,
    chainId,
    onRevoke,
    submitting
}: {
    mandate: OnchainMandate;
    contractAddress: string;
    chainId: number;
    onRevoke: (address: string) => void;
    submitting: boolean;
}) {
    return (
        <div
            className="relative bg-white/[0.03] backdrop-blur-xl border border-[#0052FF]/20 rounded-2xl p-6 
                       shadow-[0_8px_32px_rgba(0,82,255,0.08)] hover:shadow-[0_12px_40px_rgba(0,82,255,0.15)]
                       transition-all duration-500"
            style={{
                background: 'linear-gradient(135deg, rgba(0,82,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            }}
        >
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#0052FF]/10 via-transparent to-transparent opacity-50 pointer-events-none" />

            <div className="relative flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#0052FF]/10 border border-[#0052FF]/20 flex items-center justify-center">
                        <Cpu className="w-6 h-6 text-[#0052FF]" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-lg tracking-tight">{mandate.agentName}</h3>
                            <span className="text-[10px] text-[#0052FF] font-semibold flex items-center">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                <span className="tracking-widest uppercase">ERC-8004</span>
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            On-Chain Mandate
                        </div>
                    </div>
                </div>
                <a
                    href={getExplorerLink('address', contractAddress, chainId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/[0.08] text-[10px] font-bold text-[#0052FF] uppercase tracking-widest hover:bg-[#0052FF]/10 hover:border-[#0052FF]/20 transition-all"
                >
                    View Contract
                    <ExternalLink className="w-3 h-3" />
                </a>
            </div>

            <div className="relative grid grid-cols-3 gap-6 mb-6 bg-black/20 p-4 rounded-xl border border-white/[0.04]">
                <div>
                    <span className="block text-[10px] uppercase font-bold text-[#0052FF]/50 tracking-widest mb-1">Max Trade</span>
                    <span className="text-sm font-semibold text-white">{formatEther(mandate.maxTradeSize)} ETH</span>
                </div>
                <div>
                    <span className="block text-[10px] uppercase font-bold text-[#0052FF]/50 tracking-widest mb-1">Markets</span>
                    <span className="text-sm font-semibold text-white">{mandate.allowedMarkets.length}</span>
                </div>
                <div>
                    <span className="block text-[10px] uppercase font-bold text-[#0052FF]/50 tracking-widest mb-1">Expires</span>
                    <span className="text-sm font-semibold text-white">
                        {new Date(Number(mandate.expiryTime) * 1000).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="relative flex items-center gap-2 mb-5 p-3 bg-[#0052FF]/5 border border-[#0052FF]/10 rounded-xl">
                <Clock className="w-4 h-4 text-[#0052FF]/60" />
                <span className="text-[11px] text-white/50">
                    Created {new Date(Number(mandate.createdAt) * 1000).toLocaleString()}
                </span>
            </div>

            <button
                onClick={() => onRevoke(mandate.agent)}
                disabled={submitting}
                className="relative w-full py-4 bg-white/5 border border-white/10 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 active:scale-[0.98] transition-all disabled:opacity-50"
            >
                {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-[#0052FF]" />
                        Processing...
                    </div>
                ) : (
                    'Revoke Mandate'
                )}
            </button>
        </div>
    );
}

// Error message component
function ErrorMessage({ message }: { message: string }) {
    return (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span className="text-[11px] font-bold text-red-400 uppercase tracking-wide">{message}</span>
        </div>
    );
}
