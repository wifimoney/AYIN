/**
 * Centralized mock agent data
 * This is the single source of truth for agent data until database integration
 */

import type { Agent } from '../types';

export const MOCK_AGENTS: Agent[] = [
    {
        id: '1',
        name: 'Prince Wren',
        type: 'Momentum',
        status: 'Active',
        reputation: 98,
        winRate: '78%',
        drawdown: '0%',
        aum: '$1.2M',
        risk: 'Low',
        strategy: 'Trend Follower',
        onchainId: 1,
        onchainType: 2, // ARB
        strategyHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        operator: '0xdA31A1967F0007fA623549132484db7592d3B413',
        registeredAt: Date.now() - 86400000 * 30,
        verifiedOnchain: true,
        image: '/assets/Gemini_Generated_Image_grb35grb35grb35g.png',
    },
    {
        id: '2',
        name: 'Oracle Eye',
        type: 'Market Maker',
        status: 'Active',
        reputation: 95,
        winRate: '82%',
        drawdown: '0%',
        aum: '$840K',
        risk: 'Medium',
        strategy: 'Delta-Neutral LP',
        onchainId: 2,
        onchainType: 1, // LIQUIDITY
        strategyHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        operator: '0x8ba1f109551bD432803012645Hac136c22C929',
        registeredAt: Date.now() - 86400000 * 45,
        verifiedOnchain: true,
        image: '/assets/unnamed-1.jpg',
    },
    {
        id: '3',
        name: 'Baron Bull',
        type: 'Mean Reversion',
        status: 'Active',
        reputation: 88,
        winRate: '60%',
        drawdown: '0%',
        aum: '$2.1M',
        risk: 'High',
        strategy: 'Volatility Mean Rev',
        onchainId: 3,
        onchainType: 0, // DIRECTIONAL
        strategyHash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
        operator: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        registeredAt: Date.now() - 86400000 * 20,
        verifiedOnchain: true,
        image: '/assets/unnamed.jpg',
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

/**
 * Get agent by ID
 */
export function getAgentById(id: string): Agent | undefined {
    return MOCK_AGENTS.find((agent) => agent.id === id);
}

/**
 * Get all agents with optional filters
 */
export function getAgents(filters?: {
    status?: string;
    search?: string;
}): Agent[] {
    let agents = [...MOCK_AGENTS];

    if (filters?.status) {
        agents = agents.filter(
            (agent) => agent.status.toLowerCase() === filters.status!.toLowerCase()
        );
    }

    if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        agents = agents.filter(
            (agent) =>
                agent.name.toLowerCase().includes(searchLower) ||
                agent.type.toLowerCase().includes(searchLower)
        );
    }

    return agents;
}
