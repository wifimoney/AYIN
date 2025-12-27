'use client';

import React from 'react';
import { Activity, Zap, Shield, AlertCircle } from 'lucide-react';
import { useAgentActions } from '@/lib/hooks';
import type { AgentAction } from '@/lib/types';

export function ActivityFeed() {
    const { actions, loading } = useAgentActions();

    if (loading) {
        return (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 space-y-4 animate-pulse shadow-[0_8px_32px_rgba(0,82,255,0.05)]">
                <div className="h-3 bg-white/5 rounded w-1/4 mb-4" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-xl" />
                        <div className="flex-1 space-y-2">
                            <div className="h-3 bg-white/5 rounded w-3/4" />
                            <div className="h-2 bg-white/5 rounded w-1/2" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div
            className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden 
                       shadow-[0_8px_32px_rgba(0,82,255,0.05)]"
        >
            {/* Header */}
            <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#0052FF]" />
                    Recent Activity
                </h3>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400 uppercase tracking-widest border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live
                </div>
            </div>

            {/* Activity List */}
            <div className="divide-y divide-white/[0.04]">
                {actions.length === 0 ? (
                    <div className="px-6 py-14 text-center">
                        <Activity className="w-10 h-10 text-white/10 mx-auto mb-4" />
                        <p className="text-white/40 text-xs font-bold uppercase tracking-widest">No recent activity detected</p>
                    </div>
                ) : (
                    actions.map((activity: AgentAction) => {
                        const timeStr = new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                            <div
                                key={activity.id}
                                className="px-6 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors duration-300 group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 group-hover:scale-105 group-hover:border-[#0052FF]/20 transition-all duration-300">
                                    {activity.type === 'buy' && <Zap className="w-5 h-5 text-emerald-400" />}
                                    {activity.type === 'sell' && <Activity className="w-5 h-5 text-orange-400" />}
                                    {activity.type === 'adjust' && <Shield className="w-5 h-5 text-[#0052FF]" />}
                                    {activity.type === 'stop' && <AlertCircle className="w-5 h-5 text-red-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-white tracking-tight">Agent #{activity.agentId}</span>
                                        <span className="text-[10px] font-bold text-white/40 tracking-widest uppercase">{activity.action}</span>
                                    </div>
                                    <p className="text-[11px] text-white/50 leading-relaxed mt-0.5 font-medium truncate">{activity.market}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="text-[10px] font-bold text-white/30 block mb-1 tracking-wide">{timeStr}</span>
                                    {activity.txHash && (
                                        <a
                                            href={`https://sepolia.basescan.org/tx/${activity.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-[#0052FF] hover:text-[#3B82F6] font-bold tracking-widest uppercase transition-colors"
                                        >
                                            {activity.txHash.substring(0, 6)}...
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
