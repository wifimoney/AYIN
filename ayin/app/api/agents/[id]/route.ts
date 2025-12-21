import { NextRequest, NextResponse } from 'next/server';
import type { Agent, ApiResponse } from '@/lib/types';

// Mock agent data - same as parent route with ERC-8004 onchain data
const MOCK_AGENTS: Agent[] = [
  {
    id: '1',
    name: 'Sentinel Alpha',
    type: 'Arbitrage / Defensive',
    reputation: 98,
    status: 'Active',
    winRate: '78%',
    drawdown: '-2.4%',
    aum: '$1.2M',
    risk: 'Low',
    strategy: 'Market Neutral',
    onchainId: 1,
    onchainType: 2, // ARB
    strategyHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    operator: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
    registeredAt: Date.now() - 86400000 * 30,
    verifiedOnchain: true,
  },
  {
    id: '2',
    name: 'Oracle V3',
    type: 'News Sentiment',
    reputation: 94,
    status: 'Active',
    winRate: '65%',
    drawdown: '-8.1%',
    aum: '$840K',
    risk: 'Medium',
    onchainId: 2,
    onchainType: 0, // DIRECTIONAL
    strategyHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    operator: '0x8ba1f109551bD432803012645Hac136c22C929',
    registeredAt: Date.now() - 86400000 * 45,
    verifiedOnchain: true,
  },
  {
    id: '3',
    name: 'DeepState',
    type: 'Macro / Geo-Pol',
    reputation: 89,
    status: 'Paused',
    winRate: '52%',
    drawdown: '-12.5%',
    aum: '$2.1M',
    risk: 'High',
    onchainId: 3,
    onchainType: 0, // DIRECTIONAL
    strategyHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
    operator: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    registeredAt: Date.now() - 86400000 * 20,
    verifiedOnchain: true,
  },
  {
    id: '4',
    name: 'LiquidityBot 9000',
    type: 'Market Making',
    reputation: 99,
    status: 'Active',
    winRate: '88%',
    drawdown: '-0.5%',
    aum: '$4.5M',
    risk: 'Low',
    onchainId: 4,
    onchainType: 1, // LIQUIDITY
    strategyHash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
    operator: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
    registeredAt: Date.now() - 86400000 * 60,
    verifiedOnchain: true,
  },
  {
    id: '5',
    name: 'Contrarian X',
    type: 'Mean Reversion',
    reputation: 76,
    status: 'Risk',
    winRate: '41%',
    drawdown: '-22.3%',
    aum: '$320K',
    risk: 'High',
    onchainId: 5,
    onchainType: 0, // DIRECTIONAL
    strategyHash: '0x1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff',
    operator: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
    registeredAt: Date.now() - 86400000 * 10,
    verifiedOnchain: true,
  },
  {
    id: '6',
    name: 'Helix',
    type: 'Consensus Swarm',
    reputation: 92,
    status: 'Active',
    winRate: '71%',
    drawdown: '-5.6%',
    aum: '$1.8M',
    risk: 'Medium',
    onchainId: 6,
    onchainType: 0, // DIRECTIONAL
    strategyHash: '0x2222333344445555666677778888999900001111bbbbccccddddeeeeffffaaaa',
    operator: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
    registeredAt: Date.now() - 86400000 * 15,
    verifiedOnchain: true,
  },
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = MOCK_AGENTS.find((a) => a.id === id);

    if (!agent) {
      const response: ApiResponse<Agent> = {
        success: false,
        error: 'AGENT_NOT_FOUND',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: ApiResponse<Agent> = {
      success: true,
      data: agent,
    };

    return NextResponse.json(response);
  } catch (error) {
    const response: ApiResponse<Agent> = {
      success: false,
      error: 'SERVER_ERROR',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

