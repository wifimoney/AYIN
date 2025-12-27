import { NextRequest, NextResponse } from 'next/server';
import type { Agent, ApiResponse } from '@/lib/types';
import { x402Service } from '@/lib/x402';
import { getAgents } from '@/lib/data';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const search = searchParams.get('search') || undefined;

    // 1. Fetch live activity logs
    let logs: any[] = [];
    try {
      logs = await x402Service.fetchActivityLogs();
    } catch (e) {
      console.warn('Failed to fetch x402 logs', e);
    }

    // 2. Get agents from centralized data store
    let agents = getAgents({ status, search });

    // 3. Enrich with activity data
    agents = agents.map(agent => {
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
