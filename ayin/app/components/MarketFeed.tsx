'use client';

import { Activity, Zap } from 'lucide-react';
import { useMarkets } from '@/lib/hooks';

export default function MarketFeed() {
    const { markets, loading } = useMarkets();
    // Use the first market as featured, or filter for a "featured" one if property exists
    // For now, first one from Polymarket (highest volume) is good.
    const market = markets[0];

    if (loading) {
        return (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 animate-pulse shadow-[0_8px_32px_rgba(0,82,255,0.05)]">
                <div className="h-3 bg-white/5 rounded w-1/4 mb-4" />
                <div className="h-5 bg-white/5 rounded w-3/4 mb-5" />
                <div className="h-2 bg-white/5 rounded-full w-full" />
            </div>
        );
    }

    if (!market) {
        return (
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-10 text-center">
                <Activity className="w-8 h-8 text-white/20 mx-auto mb-4" />
                <p className="text-white/50 text-xs font-bold uppercase tracking-widest">No featured markets available</p>
                <p className="text-white/30 text-[10px] mt-2 tracking-wide">Check back later for new predictions</p>
            </div>
        );
    }

    return (
        <div
            className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 
                       shadow-[0_8px_32px_rgba(0,82,255,0.05)] 
                       hover:shadow-[0_12px_40px_rgba(0,82,255,0.1),0_0_12px_rgba(0,82,255,0.15)]
                       hover:border-[#0052FF]/20 
                       transition-all duration-500"
        >
            {/* Floating Glow */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-[#0052FF]/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            <div className="relative flex items-center justify-between mb-5">
                <span className="text-[10px] font-bold text-[#0052FF] uppercase tracking-widest">
                    Featured Market
                </span>
                <span className="text-[10px] text-white/40 font-mono tracking-wide">{market.endDate}</span>
            </div>

            {/* Gated/Cost Badge */}
            {(market.x402Cost || market.costWei) && (
                <div className="relative mb-4 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-[10px] font-bold text-amber-400 w-fit flex items-center gap-1.5 uppercase tracking-widest">
                    <Zap className="w-3 h-3" />
                    Gated · {market.x402Cost || market.costWei} Wei
                </div>
            )}

            <h3 className="relative text-xl font-bold text-white mb-6 leading-tight max-w-[90%]">
                {market.title}
            </h3>

            {/* Probability & Volume */}
            <div className="relative space-y-4">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Yes Probability</span>
                        <span className="text-2xl font-bold text-[#0052FF]">{market.probability}%</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1 block">Volume</span>
                        <span className="text-sm font-mono text-white/80">{market.volume}</span>
                    </div>
                </div>

                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-[#0052FF] to-[#3B82F6] rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(0,82,255,0.4)]"
                        style={{ width: `${market.probability}%` }}
                    />
                </div>
            </div>
        </div>
    );
}