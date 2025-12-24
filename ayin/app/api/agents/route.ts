import { NextRequest, NextResponse } from 'next/server';
import type { Agent, ApiResponse } from '@/lib/types';
import { x402Service } from '@/lib/x402';

// In-memory mock agents (fallback)
// In-memory mock agents (fallback)
const AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Prince Wren',
    type: 'Momentum',
    status: 'Active',
    reputation: 98,
    winRate: '78%',
    drawdown: '0%',
    aum: '0',
    risk: 'Low',
    strategy: 'Trend Follower',
    verifiedOnchain: true,
    operator: '0xdA31A1967F0007fA623549132484db7592d3B413',
  },
  {
    id: '2',
    name: 'Oracle Eye',
    type: 'Arbitrage',
    status: 'Paused',
    reputation: 92,
    winRate: '65%',
    drawdown: '0%',
    aum: '0',
    risk: 'Medium',
    strategy: 'Cross-market Arb',
  },
  {
    id: '3',
    name: 'Baron Bull',
    type: 'Mean Reversion',
    status: 'Active',
    reputation: 88,
    winRate: '60%',
    drawdown: '0%',
    aum: '0',
    risk: 'High',
    strategy: 'Volatility Mean Rev'
  },
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // 1. Fetch live activity logs
    let logs: any[] = [];
    try {
      logs = await x402Service.fetchActivityLogs();
    } catch (e) {
      console.warn('Failed to fetch x402 logs', e);
    }

    // 2. Map static agents + enrich
    let agents = AGENTS.map(agent => {
      // Calculate recent activity
      const agentLogs = logs.filter(l => l.agentId.toString() === agent.id);
      const successfulOps = agentLogs.filter((l: any) => l.success).length;

      // Dynamically update status based on logs
      let currentStatus = agent.status;
      if (agentLogs.length > 0) {
        const lastLog = agentLogs[agentLogs.length - 1];
        const isRecent = (Date.now() / 1000) - lastLog.timestamp < 300;
        if (isRecent) currentStatus = 'Active';
      }

      // Simple dynamic reputation bump based on activity
      const reputation = Math.min(100, agent.reputation + (successfulOps * 0.1));

      return {
        ...agent,
        status: currentStatus,
        reputation: Math.floor(reputation),
      };
    });

    // Filter by status if provided
    if (status) {
      agents = agents.filter(
        (agent) => agent.status.toLowerCase() === status.toLowerCase()
      );
    }

    // Search by name or type if provided
    if (search) {
      const searchLower = search.toLowerCase();
      agents = agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchLower) ||
          agent.type.toLowerCase().includes(searchLower)
      );
    }

    const response: ApiResponse<Agent[]> = {
      success: true,
      data: agents,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Agent API error', error);
    return NextResponse.json(
      { success: false, error: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}

