'use client';

import React from 'react';
import { Cpu, Shield, ExternalLink, Verified } from 'lucide-react';
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
            className="bg-[#0B0D13] border border-[#1B1F2A] rounded-2xl p-6 shadow-glow-base hover:shadow-glow-cyan transition-all duration-300 hover:-translate-y-2 group animate-float"
            style={{
                background: 'radial-gradient(circle at top left, rgba(0, 82, 255, 0.15), rgba(11, 13, 19, 0.98))',
                transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)'
            }}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:border-primary/50 transition-all duration-500">
                        {agentImage ? (
                            <img src={agentImage} alt={agent.name} className="w-full h-full object-cover" />
                        ) : (
                            <Cpu className="w-7 h-7 text-primary" />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3
                                className="font-bold text-white text-xl tracking-tight truncate"
                                style={{ textShadow: '0 0 12px rgba(0, 82, 255, 0.4)' }}
                            >
                                {agent.name}
                            </h3>
                            {isVerified && (
                                <Verified className="w-4 h-4 text-primary flex-shrink-0" />
                            )}
                        </div>
                        <p className="text-xs text-[#5C7FFF] font-bold uppercase tracking-widest">{agentType}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex-shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {agent.status}
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-secondary/80 leading-relaxed mb-6 line-clamp-2 h-10">
                {agentTypeDescription}
            </p>

            {/* Stats Table */}
            <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-5 mb-6">
                <div>
                    <span className="block text-[10px] uppercase font-bold text-[#5C7FFF]/60 tracking-wider mb-1">Reputation</span>
                    <span className="text-lg font-semibold text-white">{agent.reputation}</span>
                </div>
                <div>
                    <span className="block text-[10px] uppercase font-bold text-[#5C7FFF]/60 tracking-wider mb-1">Win Rate</span>
                    <span className="text-lg font-semibold text-white">{agent.winRate}</span>
                </div>
                <div className="text-right">
                    <span className="block text-[10px] uppercase font-bold text-[#5C7FFF]/60 tracking-wider mb-1">Risk</span>
                    <span className="text-lg font-semibold text-primary">{agent.risk || 'Medium'}</span>
                </div>
            </div>

            {/* Verifiable Link */}
            {isVerified && registryLink && (
                <a
                    href={registryLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 mb-6 p-3 bg-[#0052FF]/5 border border-[#0052FF]/10 rounded-xl hover:bg-[#0052FF]/10 transition-colors group/link"
                >
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-primary flex-1">ERC-8004 Verifiable</span>
                    <ExternalLink className="w-3.5 h-3.5 text-primary/50 group-hover/link:translate-x-0.5 transition-transform" />
                </a>
            )}

            {/* Action */}
            <button
                onClick={() => onDelegate(agent)}
                className="w-full py-4 bg-[#0052FF] text-white font-black text-sm uppercase tracking-widest rounded-xl hover:bg-[#3B82F6] active:scale-[0.98] transition-all shadow-[0_4px_12px_rgba(0,82,255,0.3)] hover:shadow-[0_4px_20px_rgba(0,82,255,0.5)]"
            >
                Delegate to Agent
            </button>
        </div>
    );
}

