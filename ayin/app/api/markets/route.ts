import { NextRequest, NextResponse } from 'next/server';
import type { Market, ApiResponse } from '@/lib/types';
import { x402Service } from '@/lib/x402';

// Base static data for markets (metadata not served by x402 server yet)
const MARKET_METADATA: Record<string, Partial<Market>> = {
  '1': {
    title: 'Will the SEC approve an ETH ETF by May 2025?',
    category: 'Crypto',
    address: '0x1234567890AbcdEF1234567890abcDEF12345678',
    endDate: 'May 31, 2025',
    volume: '$12.5M'
  },
  '2': {
    title: 'Fed Interest Rate Cut in Q3 2025?',
    category: 'Economics',
    address: '0x2345678901BCdeF2345678901bcDEF23456789',
    endDate: 'Sep 30, 2025',
    volume: '$4.2M'
  }
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    // 1. Fetch live data/cost from x402 server for known markets
    // For MVP, we only check market 1 and 2
    const marketIds = ['1', '2'];
    const markets: Market[] = [];

    for (const id of marketIds) {
      const { data, cost } = await x402Service.fetchMarket(id);
      const meta = MARKET_METADATA[id] || {};

      if (data) {
        // If we got PAID data (unlikely for public viewer without payment, but possible if unprotected)
        markets.push({
          id,
          title: meta.title || `Market ${id}`,
          volume: meta.volume || '$0',
          probability: data.yesProbability || 50, // Use live prob if available
          confidence: 5, // Placeholder
          endDate: meta.endDate || 'TBD',
          category: meta.category || 'General',
          address: meta.address || '0x0',
          costWei: cost
        } as Market);
      } else {
        // We got a 402 challenge or just metadata
        // We'll show the market active but "gated" or just show the cost
        markets.push({
          id,
          title: meta.title || `Market ${id}`,
          volume: meta.volume || '$0',
          probability: 50, // Mock probability since we didn't pay to see the real "premium" data? 
          // Actually x402-server /market/:id/data gives probability. 
          // If it's gated, we probably can't see prob. 
          // BUT for the dashboard "preview", we might want to show it.
          // Let's assume for now we fall back to static 50% or pay-wall UI.
          confidence: 5,
          endDate: meta.endDate || 'TBD',
          category: meta.category || 'General',
          address: meta.address || '0x0',
          x402Cost: cost // Pass cost to frontend
        } as any); // Casting to any to allow extra prop temporarily or I should update type
      }
    }

    // Add remaining mock markets if needed for filler, or just filtered
    // ... logic to include other MOCK_MARKETS if not in live loop ...

    // Simplification: Just return the 2 we tried + any others from mock data that don't match
    // actually, let's just stick to the live ones for clarity of integration

    let result = markets;

    // Filter by category
    if (category) {
      result = result.filter(m => m.category.toLowerCase() === category.toLowerCase());
    }

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(m => m.title.toLowerCase().includes(searchLower));
    }

    const response: ApiResponse<Market[]> = {
      success: true,
      data: result,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Market API error', error);
    // Fallback to empty
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}

