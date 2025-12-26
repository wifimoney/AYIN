import { NextResponse } from "next/server";
import type { Market, ApiResponse } from "@/lib/types";

const POLYMARKET_API = "https://gamma-api.polymarket.com";

export async function GET() {
  try {
    const res = await fetch(`${POLYMARKET_API}/events?limit=20&active=true&closed=false&order=volume24hr&ascending=false`);

    if (!res.ok) {
      throw new Error(`Failed to fetch from Polymarket: ${res.status}`);
    }

    const events = await res.json();

    // Map events to our Market interface
    const mappedMarkets: Market[] = events
      .filter((e: any) => e.markets && e.markets.length > 0)
      .map((e: any) => {
        const m = e.markets[0]; // Primary market

        // Calculate probability for "Yes" if possible
        let probability = 50;
        try {
          if (m.outcomePrices) {
            const prices = JSON.parse(m.outcomePrices);
            // Usually index 1 is YES in [No, Yes] binary markets
            probability = Math.round(Number(prices[1]) * 100) || 50;
          }
        } catch (err) {
          // ignore parse error
        }

        return {
          id: e.id,
          title: e.title,
          volume: `$${(Number(e.volume) || 0).toLocaleString()}`,
          probability,
          confidence: 88, // Placeholder
          endDate: new Date(e.endDate).toLocaleDateString(),
          category: e.slug || 'Prediction',
          address: m.id
        } as Market;
      });

    const response: ApiResponse<Market[]> = {
      success: true,
      data: mappedMarkets
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Markets fetch error:", err);
    return NextResponse.json({ success: false, data: [] }, { status: 500 });
  }
}
