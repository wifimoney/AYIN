'use client';

import React from 'react';
import { Cpu, Shield, ExternalLink, CheckCircle } from 'lucide-react';
import { useChainId } from 'wagmi';
import { useOnchainAgent, getAgentTypeLabel, getAgentTypeDescription } from '@/lib/hooks/useOnchainAgent';
import { getExplorerLink, formatAddress } from '@/lib/utils';
import { getContractAddress } from '@/lib/contracts';
import type { Agent } from '@/lib/types';

const AGENT_IMAGES: Record<string, string> = {
    'Prince Wren': '/assets/Gemini_Generated_Image_grb35grb35grb35g.png',
    'Baron Bull': '/assets/unnamed.jpg',
    'Oracle Eye': '/assets/unnamed-1.jpg',
};

export function AgentCard({
    agent,
    onDelegate,
}: {
    agent: Agent;
    onDelegate: (agent: Agent) => void;
}) {
    const chainId = useChainId();
    const agentRegistryAddress = getContractAddress('AgentRegistry', chainId);

    const onchainId = agent.onchainId || (agent.id && !isNaN(Number(agent.id)) ? Number(agent.id) : null);
    const { onchainAgent, isOnchain } = useOnchainAgent(onchainId);

    const agentType = onchainAgent ? getAgentTypeLabel(onchainAgent.agentType) : agent.type;
    const agentTypeDescription = onchainAgent ? getAgentTypeDescription(onchainAgent.agentType) : agent.strategy || 'Autonomous trading agent';
    const isVerified = isOnchain && (onchainAgent?.exists || agent.verifiedOnchain);
    const registryLink = isOnchain && agentRegistryAddress !== '0x0000000000000000000000000000000000000000'
        ? getExplorerLink('address', agentRegistryAddress, chainId)
        : null;

    const agentImage = AGENT_IMAGES[agent.name] || agent.image;

    return (
        <div
            className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 
                       shadow-[0_8px_32px_rgba(0,82,255,0.08)] 
                       hover:shadow-[0_16px_48px_rgba(0,82,255,0.15),0_0_12px_rgba(0,82,255,0.19)] 
                       hover:-translate-y-3 hover:border-[#0052FF]/30
                       transition-all duration-500 ease-out group"
            style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(0,82,255,0.03) 100%)',
            }}
        >
            {/* Floating Glow Effect */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-[#0052FF]/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Header */}
            <div className="relative flex items-start justify-between mb-5">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:border-[#0052FF]/40 group-hover:shadow-[0_0_20px_rgba(0,82,255,0.3)] transition-all duration-500">
                        {agentImage ? (
                            <img src={agentImage} alt={agent.name} className="w-full h-full object-cover" />
                        ) : (
                            <Cpu className="w-7 h-7 text-[#0052FF]" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-white text-xl tracking-tight truncate">
                                {agent.name}
                            </h3>
                            {/* ERC-8004 Verified Badge */}
                            {isVerified && (
                                <span className="text-xs text-[#0052FF] ml-1 font-semibold flex items-center flex-shrink-0">
                                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                    <span className="text-[10px] tracking-widest uppercase">ERC-8004</span>
                                </span>
                            )}
                        </div>
                        {/* Smallcaps Type Tag */}
                        <p className="text-[10px] text-[#0052FF]/80 font-bold uppercase tracking-widest">{agentType}</p>
                    </div>
                </div>
                {/* Status Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 uppercase tracking-widest flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {agent.status}
                </div>
            </div>

            {/* Description */}
            <p className="relative text-sm text-white/60 leading-relaxed mb-6 line-clamp-2 h-10">
                {agentTypeDescription}
            </p>

            {/* Stats Table */}
            <div className="relative grid grid-cols-3 gap-4 border-t border-white/5 pt-5 mb-6">
                <div>
                    <span className="block text-[10px] uppercase font-bold text-[#0052FF]/50 tracking-widest mb-1">Reputation</span>
                    <span className="text-lg font-semibold text-white">{agent.reputation}</span>
                </div>
                <div>
                    <span className="block text-[10px] uppercase font-bold text-[#0052FF]/50 tracking-widest mb-1">Win Rate</span>
                    <span className="text-lg font-semibold text-white">{agent.winRate}</span>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-[#0052FF]/50 tracking-widest mb-1">Risk</span>
                    <span className="text-lg font-semibold text-[#0052FF]">{agent.risk || 'Medium'}</span>
                </div>
            </div>

            {/* Verifiable Link */}
            {isVerified && registryLink && (
                <a
                    href={registryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="relative flex items-center gap-2 mb-6 p-3 bg-[#0052FF]/5 border border-[#0052FF]/10 rounded-xl hover:bg-[#0052FF]/10 hover:border-[#0052FF]/20 transition-all duration-300 group/link"
                >
                    <Shield className="w-4 h-4 text-[#0052FF]" />
                    <span className="text-[10px] font-bold text-[#0052FF] flex-1 uppercase tracking-widest">Verifiable on Base</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#0052FF]/50 group-hover/link:translate-x-0.5 group-hover/link:text-[#0052FF] transition-all" />
                </a>
            )}

            {/* Action Button */}
            <button
                onClick={() => onDelegate(agent)}
                className="relative w-full py-4 bg-[#0052FF] text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-xl 
                         hover:bg-[#1a66ff] active:scale-[0.98] 
                         shadow-[0_4px_16px_rgba(0,82,255,0.3)] hover:shadow-[0_8px_24px_rgba(0,82,255,0.5)]
                         transition-all duration-300"
            >
                Delegate to Agent
            </button>
        </div>
    );
}
