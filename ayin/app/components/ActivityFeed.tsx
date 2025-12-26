'use client';

import React from 'react';
import { Activity, Zap, Shield, AlertCircle } from 'lucide-react';
import { useAgentActions } from '@/lib/hooks';
import type { AgentAction } from '@/lib/types';

export function ActivityFeed() {
    const { actions, loading } = useAgentActions();

    if (loading) {
        return (
            <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 space-y-4 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-1/4 mb-4" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 bg-white/5 rounded-2xl" />
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
        <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden shadow-nova">
            <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white uppercase tracking-widest flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    Recent Activity
                </h3>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-500 uppercase tracking-widest border border-emerald-500/20">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                </div>
            </div>
            <div className="divide-y divide-white/5">
                {actions.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                        <Activity className="w-10 h-10 text-secondary/20 mx-auto mb-4" />
                        <p className="text-secondary text-sm font-medium">No recent activity detected</p>
                    </div>
                ) : (
                    actions.map((activity: AgentAction) => {
                        const timeStr = new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        return (
                            <div key={activity.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                                <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                    {activity.type === 'buy' && <Zap className="w-5 h-5 text-emerald-500" />}
                                    {activity.type === 'sell' && <Activity className="w-5 h-5 text-orange-500" />}
                                    {activity.type === 'adjust' && <Shield className="w-5 h-5 text-primary" />}
                                    {activity.type === 'stop' && <AlertCircle className="w-5 h-5 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-white uppercase tracking-tight">Agent #{activity.agentId}</span>
                                        <span className="text-[10px] font-bold text-secondary tracking-widest uppercase">{activity.action}</span>
                                    </div>
                                    <p className="text-xs text-secondary leading-relaxed mt-0.5 font-medium">{activity.market}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="text-[10px] font-semibold text-secondary block mb-1">{timeStr}</span>
                                    {activity.txHash && (
                                        <a
                                            href={`https://sepolia.basescan.org/tx/${activity.txHash}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-primary hover:text-accent font-bold tracking-widest uppercase transition-colors"
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
