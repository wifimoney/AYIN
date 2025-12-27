'use client';

import React from 'react';
import { Cpu, Shield, ExternalLink, CheckCircle } from 'lucide-react';
import { useChainId } from 'wagmi';
import { useOnchainAgent, getAgentTypeLabel, getAgentTypeDescription } from '@/lib/hooks/useOnchainAgent';
import { getExplorerLink, formatAddress } from '@/lib/utils';
import { getContractAddress } from '@/lib/contracts';
import type { Agent } from '@/lib/types';
import { motion } from 'framer-motion';

const AGENT_IMAGES: Record<string, string> = {
    'The Quant Alchemist': '/assets/the_quant_alchemist.jpg',
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

    // Use agent.signalStrength if provided, otherwise generate a pseudo-random one based on name
    const signalStrength = agent.signalStrength ?? (
        (agent.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 40) + 60
    );

    // Only Prince Wren shows the verified tick and link
    const showVerified = agent.name === 'Prince Wren';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -8, scale: 1.01 }}
            className={`relative overflow-hidden rounded-2xl border border-white/[0.08] transition-all duration-500 
                       ${agent.status === 'Active' ? 'shadow-[0_0_30px_rgba(34,211,238,0.15)] hover:shadow-[0_0_40px_rgba(34,211,238,0.25)]' : ''}
                       group`}
        >
            {/* Full-bleed Portrait Background */}
            {agentImage && (
                <div className="absolute inset-0 z-0">
                    <img src={agentImage} alt="" className="w-full h-full object-cover opacity-40 group-hover:scale-110 transition-transform duration-700" />
                    {/* Gradient Fade to improve text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#05070A] via-[#05070A]/80 to-transparent" />
                </div>
            )}

            {/* Glass Overlay */}
            <div className="relative z-10 backdrop-blur-md bg-black/20 p-7 h-full flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-black text-white text-2xl tracking-tighter uppercase truncate">
                                {agent.name}
                            </h3>
                            {showVerified && (
                                <div className="flex items-center px-2 py-0.5 rounded-md bg-[#0052FF]/20 border border-[#0052FF]/30">
                                    <CheckCircle className="w-3.5 h-3.5 text-[#0052FF] mr-1" />
                                    <span className="text-[10px] font-bold text-[#0052FF] uppercase tracking-widest">ERC-8004</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-[0.2em] opacity-80">{agentType}</p>
                    </div>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest
                        ${agent.status === 'Active'
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                            : 'bg-white/5 border-white/10 text-white/40'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${agent.status === 'Active' ? 'bg-cyan-400 animate-pulse' : 'bg-white/20'}`} />
                        {agent.status}
                    </div>
                </div>

                {/* Description */}
                <p className="text-sm text-white/70 leading-relaxed mb-8 line-clamp-2 h-10 font-medium">
                    {agentTypeDescription}
                </p>

                {/* Signal Strength bar */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[9px] font-bold text-white/40 uppercase tracking-[0.25em]">Intelligence Signal</span>
                        <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">{signalStrength}%</span>
                    </div>
                    <div className="h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5 p-[1px]">
                        <motion.div
                            className="h-full bg-gradient-to-r from-[#0052FF] via-[#00FFFF] to-cyan-300 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${signalStrength}%` }}
                            transition={{ duration: 1.5, ease: "circOut" }}
                        />
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-6 py-6 border-y border-white/10 mb-8">
                    <div>
                        <span className="block text-[10px] uppercase font-bold text-white/30 tracking-[0.15em] mb-2">Reputation</span>
                        <span className="text-xl font-black text-white tracking-tight">{agent.reputation}</span>
                    </div>
                    <div>
                        <span className="block text-[10px] uppercase font-bold text-white/30 tracking-[0.15em] mb-2">Win Rate</span>
                        <span className="text-xl font-black text-white tracking-tight">{agent.winRate}</span>
                    </div>
                    <div className="text-right">
                        <span className="block text-[10px] uppercase font-bold text-white/30 tracking-[0.15em] mb-2">Risk Level</span>
                        <span className={`text-xl font-black tracking-tight ${agent.risk === 'Low' ? 'text-emerald-400' : agent.risk === 'High' ? 'text-rose-400' : 'text-cyan-400'}`}>
                            {agent.risk || 'Medium'}
                        </span>
                    </div>
                </div>

                {/* Verifiable Link - Limited to Prince Wren */}
                {showVerified && registryLink && (
                    <a
                        href={registryLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 mb-8 p-4 bg-[#0052FF]/5 border border-[#0052FF]/20 rounded-xl hover:bg-[#0052FF]/10 hover:border-[#0052FF]/40 transition-all duration-300 group/link"
                    >
                        <Shield className="w-5 h-5 text-[#0052FF]" />
                        <span className="text-[11px] font-black text-[#0052FF] flex-1 uppercase tracking-widest">Protocol Verified Agent</span>
                        <ExternalLink className="w-4 h-4 text-[#0052FF]/50 group-hover/link:translate-x-0.5 group-hover/link:text-[#0052FF] transition-all" />
                    </a>
                )}

                {/* Action Button */}
                <button
                    onClick={() => onDelegate(agent)}
                    className="w-full py-4.5 bg-[#0052FF] text-white font-black text-xs uppercase tracking-[0.25em] rounded-xl 
                             hover:bg-[#1a66ff] active:scale-[0.98] 
                             shadow-[0_8px_20px_rgba(0,82,255,0.3)] hover:shadow-[0_12px_28px_rgba(0,82,255,0.5)]
                             transition-all duration-300 mt-auto border border-white/10"
                >
                    Establish Delegation
                </button>
            </div>
        </motion.div>
    );
}
