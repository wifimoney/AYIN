import { NextRequest, NextResponse } from 'next/server';
import type { ApiResponse } from '@/lib/types';
import { prisma } from '@/lib/db';
import { redis, isConnected as isRedisConnected } from '@/lib/redis';

/**
 * Agent Monitoring Dashboard API
 * Phase 2: Production Hardening
 * 
 * Provides real-time monitoring data for the agent system:
 * - Agent health status
 * - Risk metrics
 * - Trade statistics
 * - System health
 */

export interface AgentMonitoringData {
    timestamp: string;

    // Agent Status
    agents: {
        total: number;
        active: number;
        paused: number;
        risk: number;
    };

    // Delegation Stats
    delegations: {
        total: number;
        active: number;
        pending: number;
        expired: number;
        totalValueLocked: string;
    };

    // System Health
    system: {
        database: 'healthy' | 'degraded' | 'down';
        redis: 'healthy' | 'degraded' | 'down';
        agentService: 'healthy' | 'degraded' | 'down';
        x402Server: 'healthy' | 'degraded' | 'down';
    };

    // Risk Metrics  
    risk: {
        circuitBroken: boolean;
        currentDrawdown: number;
        tradesLastHour: number;
        dailyVolume: string;
        openPositions: number;
    };

    // Recent Activity
    recentTrades: {
        id: string;
        agentName: string;
        marketId: string;
        direction: string;
        status: string;
        timestamp: string;
    }[];

    // Alerts
    alerts: {
        level: 'info' | 'warning' | 'error' | 'critical';
        message: string;
        timestamp: string;
    }[];
}

export async function GET(request: NextRequest) {
    try {
        const timestamp = new Date().toISOString();

        // Get agent stats
        const agentStats = await getAgentStats();

        // Get delegation stats
        const delegationStats = await getDelegationStats();

        // Check system health
        const systemHealth = await checkSystemHealth();

        // Get risk metrics from Redis cache (from agent service)
        const riskMetrics = await getRiskMetrics();

        // Get recent actions
        const recentTrades = await getRecentTrades();

        // Generate alerts
        const alerts = generateAlerts(systemHealth, riskMetrics, delegationStats);

        const data: AgentMonitoringData = {
            timestamp,
            agents: agentStats,
            delegations: delegationStats,
            system: systemHealth,
            risk: riskMetrics,
            recentTrades,
            alerts,
        };

        const response: ApiResponse<AgentMonitoringData> = {
            success: true,
            data,
        };

        return NextResponse.json(response);
    } catch (error) {
        console.error('[API] Monitoring error:', error);
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}

// ============================================
// DATA FETCHING
// ============================================

async function getAgentStats() {
    const [total, active, paused, risk] = await Promise.all([
        prisma.agent.count(),
        prisma.agent.count({ where: { status: 'ACTIVE' } }),
        prisma.agent.count({ where: { status: 'PAUSED' } }),
        prisma.agent.count({ where: { status: 'RISK' } }),
    ]);

    return { total, active, paused, risk };
}

async function getDelegationStats() {
    const [total, active, pending, expired] = await Promise.all([
        prisma.delegation.count(),
        prisma.delegation.count({ where: { status: 'ACTIVE' } }),
        prisma.delegation.count({ where: { status: 'PENDING' } }),
        prisma.delegation.count({ where: { status: 'EXPIRED' } }),
    ]);

    // Calculate total value locked (sum of allocations)
    const tvlResult = await prisma.delegation.aggregate({
        where: { status: 'ACTIVE' },
        _sum: { allocation: true },
    });

    const totalValueLocked = (tvlResult._sum.allocation || 0).toString();

    return { total, active, pending, expired, totalValueLocked };
}

async function checkSystemHealth() {
    const health: {
        database: 'healthy' | 'degraded' | 'down';
        redis: 'healthy' | 'degraded' | 'down';
        agentService: 'healthy' | 'degraded' | 'down';
        x402Server: 'healthy' | 'degraded' | 'down';
    } = {
        database: 'healthy',
        redis: 'healthy',
        agentService: 'healthy',
        x402Server: 'healthy',
    };

    // Check database
    try {
        await prisma.$queryRaw`SELECT 1`;
    } catch {
        health.database = 'down';
    }

    // Check Redis
    try {
        if (await isRedisConnected()) {
            await redis.ping();
        } else {
            health.redis = 'degraded';
        }
    } catch {
        health.redis = 'down';
    }

    // Check Agent Service
    try {
        const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';
        const response = await fetch(`${agentServiceUrl}/health`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            health.agentService = 'degraded';
        }
    } catch {
        health.agentService = 'down';
    }

    // Check x402 Server
    try {
        const x402Url = process.env.X402_SERVER_URL || 'http://localhost:4002';
        const response = await fetch(`${x402Url}/health`, {
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            health.x402Server = 'degraded';
        }
    } catch {
        health.x402Server = 'down';
    }

    return health;
}

async function getRiskMetrics() {
    // Try to get from Redis (agent pushes metrics there)
    try {
        const cached = await redis.get('agent:risk:metrics');
        if (cached) {
            return JSON.parse(cached);
        }
    } catch {
        // Redis unavailable, return defaults
    }

    // Return defaults if no cached data
    return {
        circuitBroken: false,
        currentDrawdown: 0,
        tradesLastHour: 0,
        dailyVolume: '0',
        openPositions: 0,
    };
}

async function getRecentTrades() {
    const actions = await prisma.agentAction.findMany({
        // Fetch recent actions (BUY or SELL implying trades)
        where: {
            type: { in: ['BUY', 'SELL'] },
        },
        orderBy: { timestamp: 'desc' },
        take: 10,
        include: {
            agent: { select: { name: true } },
        },
    });

    return actions.map((a) => ({
        id: a.id,
        agentName: a.agent.name,
        marketId: a.market || 'Unknown',
        direction: a.type === 'BUY' ? 'YES' : 'NO', // Simplification for demo
        status: a.txHash ? 'success' : 'pending',
        timestamp: a.timestamp.toISOString(),
    }));
}

function generateAlerts(
    system: AgentMonitoringData['system'],
    risk: AgentMonitoringData['risk'],
    delegations: AgentMonitoringData['delegations']
) {
    const alerts: AgentMonitoringData['alerts'] = [];
    const now = new Date().toISOString();

    // System alerts
    if (system.database === 'down') {
        alerts.push({ level: 'critical', message: 'Database connection lost', timestamp: now });
    }
    if (system.redis === 'down') {
        alerts.push({ level: 'error', message: 'Redis connection lost', timestamp: now });
    }
    if (system.agentService === 'down') {
        alerts.push({ level: 'error', message: 'Agent service unreachable', timestamp: now });
    }
    if (system.x402Server === 'down') {
        alerts.push({ level: 'warning', message: 'x402 server unreachable', timestamp: now });
    }

    // Risk alerts
    if (risk.circuitBroken) {
        alerts.push({ level: 'critical', message: 'Circuit breaker triggered - all trading halted', timestamp: now });
    }
    if (risk.currentDrawdown > 5) {
        alerts.push({ level: 'warning', message: `Drawdown at ${risk.currentDrawdown.toFixed(1)}%`, timestamp: now });
    }
    if (risk.tradesLastHour >= 4) {
        alerts.push({ level: 'info', message: `Rate limit approaching (${risk.tradesLastHour}/5 trades)`, timestamp: now });
    }

    // Delegation alerts
    if (delegations.pending > 5) {
        alerts.push({ level: 'warning', message: `${delegations.pending} delegations pending`, timestamp: now });
    }

    return alerts;
}
