import { NextRequest, NextResponse } from 'next/server';
import { x402Service } from '@/lib/x402';
import type { Market, ApiResponse } from '@/lib/types';

const POLYMARKET_API = "https://gamma-api.polymarket.com";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = await params;

        // 1. Try to fetch from Polymarket if it looks like a Polymarket hex/slug ID
        // Polymarket IDs are often strings or long numbers. 
        // If it's '1' or '2', it might be our legacy mock markets pointing to x402.

        if (id === '1' || id === '2') {
            const { data, cost } = await x402Service.fetchMarket(id);

            // Mock metadata for legacy markets
            const meta: Record<string, any> = {
                '1': { title: 'Will the SEC approve an ETH ETF by May 2025?', category: 'Crypto', volume: '$12.5M', endDate: 'May 31, 2025' },
                '2': { title: 'Fed Interest Rate Cut in Q3 2025?', category: 'Economics', volume: '$4.2M', endDate: 'Sep 30, 2025' }
            };

            const m = meta[id];
            const response: ApiResponse<Market> = {
                success: true,
                data: {
                    id,
                    title: m.title,
                    category: m.category,
                    volume: m.volume,
                    endDate: m.endDate,
                    probability: data ? data.yesProbability : 50,
                    confidence: 88,
                    address: '0x...',
                    x402Cost: cost
                } as any
            };
            return NextResponse.json(response);
        }

        // 2. Fetch from Polymarket
        const res = await fetch(`${POLYMARKET_API}/markets/${id}`);
        if (res.ok) {
            const polyMarket = await res.json();
            const response: ApiResponse<Market> = {
                success: true,
                data: {
                    id: polyMarket.id,
                    title: polyMarket.question,
                    volume: `$${Number(polyMarket.volume || 0).toLocaleString()}`,
                    probability: Math.round((Number(polyMarket.outcomePrices?.[1]) || 0.5) * 100),
                    confidence: 90,
                    endDate: new Date(polyMarket.endDate).toLocaleDateString(),
                    category: polyMarket.category || 'Prediction'
                } as Market
            };
            return NextResponse.json(response);
        }

        return NextResponse.json({ success: false, error: 'MARKET_NOT_FOUND' }, { status: 404 });
    } catch (error) {
        console.error('Market detail API error', error);
        return NextResponse.json({ success: false, error: 'SERVER_ERROR' }, { status: 500 });
    }
}
