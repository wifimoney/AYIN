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
        signalStrength: 92,
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
        verifiedOnchain: false,
        image: '/assets/unnamed-1.jpg',
        signalStrength: 85,
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
        verifiedOnchain: false,
        image: '/assets/unnamed.jpg',
        signalStrength: 78,
    },
    {
        id: '0',
        name: 'The Quant Alchemist',
        type: 'Stat Arb',
        status: 'Active',
        reputation: 99,
        winRate: '86%',
        drawdown: '0.2%',
        aum: '$3.4M',
        risk: 'Low',
        strategy: 'Statistical arbitrage, precision-driven trades',
        verifiedOnchain: false,
        image: '/assets/the_quant_alchemist.jpg',
        signalStrength: 98,
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
        verifiedOnchain: false,
        signalStrength: 96,
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
        verifiedOnchain: false,
        signalStrength: 34,
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
        verifiedOnchain: false,
        signalStrength: 88,
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
