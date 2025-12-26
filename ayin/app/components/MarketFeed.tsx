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
            <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 animate-pulse">
                <div className="h-4 bg-white/5 rounded w-1/4 mb-3" />
                <div className="h-6 bg-white/5 rounded w-3/4 mb-4" />
                <div className="h-2 bg-white/5 rounded-full w-full" />
            </div>
        );
    }

    if (!market) {
        return (
            <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center">
                <Activity className="w-8 h-8 text-secondary/50 mx-auto mb-3" />
                <p className="text-secondary text-sm font-medium">No featured markets available</p>
                <p className="text-secondary/50 text-xs mt-1">Check back later for new predictions</p>
            </div>
        );
    }

    return (
        <div className="bg-surface/50 backdrop-blur-md border border-white/10 rounded-3xl p-6 hover:border-primary/20 shadow-nova transition-colors duration-300">
            <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-label uppercase tracking-widest">
                    Featured Market
                </span>
                <span className="text-xs text-secondary font-mono">{market.endDate}</span>
            </div>

            {/* Gated/Cost Badge */}
            {(market.x402Cost || market.costWei) && (
                <div className="mb-4 px-2 py-1 bg-yellow-500/10 border border-yellow-500/20 rounded text-[10px] font-bold text-yellow-500 w-fit flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    GATED · {market.x402Cost || market.costWei} WEI
                </div>
            )}

            <h3 className="text-xl font-bold text-white mb-6 leading-tight max-w-[90%]">
                {market.title}
            </h3>

            {/* Probability & Volume */}
            <div className="space-y-3">
                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-xs text-secondary mb-1">Yes Probability</span>
                        <span className="text-2xl font-semibold text-primary">{market.probability}%</span>
                    </div>
                    <div className="text-right">
                        <span className="text-xs text-secondary mb-1 block">Volume</span>
                        <span className="text-sm font-mono text-white">{market.volume}</span>
                    </div>
                </div>

                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/5">
                    <div
                        className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${market.probability}%` }}
                    />
                </div>
            </div>
        </div>
    );
}