import { NextRequest, NextResponse } from 'next/server';
import type { Market, ApiResponse } from '@/lib/types';

// Mock market data - matches the original UI data structure
const MOCK_MARKETS: Market[] = [
  {
    id: '1',
    title: 'Will the SEC approve an ETH ETF by May 2025?',
    volume: '$12.5M',
    probability: 72,
    confidence: 4,
    endDate: 'May 31, 2025',
    category: 'Crypto',
  },
  {
    id: '2',
    title: 'Fed Interest Rate Cut in Q3 2025?',
    volume: '$4.2M',
    probability: 45,
    confidence: 8,
    endDate: 'Sep 30, 2025',
    category: 'Economics',
  },
  {
    id: '3',
    title: 'GPT-5 Public Release before 2026?',
    volume: '$8.9M',
    probability: 88,
    confidence: 3,
    endDate: 'Dec 31, 2025',
    category: 'AI',
  },
  {
    id: '4',
    title: 'Base Total Value Locked > $10B by EOY?',
    volume: '$1.1M',
    probability: 34,
    confidence: 6,
    endDate: 'Dec 31, 2025',
    category: 'Crypto',
  },
  {
    id: '5',
    title: 'SpaceX Starship orbital success in next launch?',
    volume: '$3.7M',
    probability: 91,
    confidence: 2,
    endDate: 'Aug 15, 2025',
    category: 'Space',
  },
  {
    id: '6',
    title: 'US Inflation Rate < 2.5% in July CPI?',
    volume: '$6.4M',
    probability: 58,
    confidence: 5,
    endDate: 'Aug 12, 2025',
    category: 'Economics',
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    let markets = [...MOCK_MARKETS];

    // Filter by category if provided
    if (category) {
      markets = markets.filter(
        (market) => market.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Search by title if provided
    if (search) {
      const searchLower = search.toLowerCase();
      markets = markets.filter((market) =>
        market.title.toLowerCase().includes(searchLower)
      );
    }

    const response: ApiResponse<Market[]> = {
      success: true,
      data: markets,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<Market[]> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

