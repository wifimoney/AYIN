import { NextRequest, NextResponse } from 'next/server';
import type { AgentAction, ApiResponse } from '@/lib/types';

// Mock agent actions data
const MOCK_ACTIONS: AgentAction[] = [
    {
        id: '1',
        agentId: '1',
        agentName: 'Sentinel Alpha',
        type: 'buy',
        action: 'Opened position',
        market: 'ETH > $4000',
        timestamp: new Date(Date.now() - 120000).toISOString(), // 2m ago
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    },
    {
        id: '2',
        agentId: '2',
        agentName: 'Oracle V3',
        type: 'sell',
        action: 'Closed position',
        market: 'BTC Halving Impact',
        timestamp: new Date(Date.now() - 480000).toISOString(), // 8m ago
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    },
    {
        id: '3',
        agentId: '1',
        agentName: 'Sentinel Alpha',
        type: 'adjust',
        action: 'Adjusted hedge',
        market: 'L2 Activity Surge',
        timestamp: new Date(Date.now() - 900000).toISOString(), // 15m ago
        txHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    },
    {
        id: '4',
        agentId: '4',
        agentName: 'LiquidityBot 9000',
        type: 'stop',
        action: 'Stop-loss triggered',
        market: 'USDC Depeg Risk',
        timestamp: new Date(Date.now() - 1920000).toISOString(), // 32m ago
        txHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    },
];

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const agentId = searchParams.get('agentId');

        let actions = [...MOCK_ACTIONS];

        if (agentId) {
            actions = actions.filter((action) => action.agentId === agentId);
        }

        // Sort by timestamp descending
        actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const response: ApiResponse<AgentAction[]> = {
            success: true,
            data: actions,
        };

        return NextResponse.json(response);
    } catch (error) {
        const response: ApiResponse<AgentAction[]> = {
            success: false,
            error: 'SERVER_ERROR',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { agentId, type, action, market, txHash } = body;

        if (!agentId || !type || !action || !market) {
            return NextResponse.json(
                { success: false, error: 'MISSING_REQUIRED_FIELDS' },
                { status: 400 }
            );
        }

        // In a real app, we would store this in a database
        const newAction: AgentAction = {
            id: Math.random().toString(36).substring(7),
            agentId,
            agentName: 'Unknown Agent', // In real app, fetch from DB
            type,
            action,
            market,
            timestamp: new Date().toISOString(),
            txHash,
        };

        // For mock purposes, we just return success
        return NextResponse.json({
            success: true,
            data: newAction,
        });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'SERVER_ERROR' },
            { status: 500 }
        );
    }
}
