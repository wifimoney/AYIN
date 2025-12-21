import { NextRequest, NextResponse } from 'next/server';
import type { NetworkStats, ApiResponse } from '@/lib/types';

// Mock network statistics
const MOCK_STATS: NetworkStats = {
  activeAgents: 1248,
  totalValueLocked: '$48.2M',
  volume24h: '$12.5M',
};

export async function GET(request: NextRequest) {
  try {
    const response: ApiResponse<NetworkStats> = {
      success: true,
      data: MOCK_STATS,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<NetworkStats> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

