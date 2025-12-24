import { MarketSignal } from '../types';

export async function fetchMarketSignals(): Promise<MarketSignal[]> {
    const res = await fetch('https://clob.polymarket.com/markets');
    const json = await res.json();

    return (json as any[]).slice(0, 5).map((m: any) => ({
        marketId: m.condition_id,
        probability: Number(m.outcome_prices?.[0] ?? 0.5),
        direction: Number(m.outcome_prices?.[0]) > 0.55 ? 'YES' : 'NO'
    }));
}