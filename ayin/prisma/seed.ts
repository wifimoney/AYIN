#!/usr/bin/env tsx
/**
 * Database Seed Script
 * Phase 1: Persistence Implementation
 * 
 * Seeds the database with initial agent data from mock-agents.ts
 * Run with: pnpm exec tsx prisma/seed.ts
 */

import { PrismaClient, AgentType, AgentStatus, RiskLevel } from '../lib/generated/prisma';
import { MOCK_AGENTS } from '../lib/data/mock-agents';

const prisma = new PrismaClient();

// Type mapping from mock data to Prisma enums
function mapAgentType(type: string): AgentType {
    const typeMap: Record<string, AgentType> = {
        'Momentum': AgentType.MOMENTUM,
        'Market Maker': AgentType.MARKET_MAKER,
        'Mean Reversion': AgentType.MEAN_REVERSION,
        'Stat Arb': AgentType.STAT_ARB,
        'Consensus Swarm': AgentType.CONSENSUS_SWARM,
        'Market Making': AgentType.MARKET_MAKER,
        'Liquidity': AgentType.LIQUIDITY,
        'Directional': AgentType.DIRECTIONAL,
        'Arb': AgentType.ARB,
    };
    return typeMap[type] || AgentType.MOMENTUM;
}

function mapAgentStatus(status: string): AgentStatus {
    const statusMap: Record<string, AgentStatus> = {
        'Active': AgentStatus.ACTIVE,
        'Paused': AgentStatus.PAUSED,
        'Risk': AgentStatus.RISK,
    };
    return statusMap[status] || AgentStatus.ACTIVE;
}

function mapRiskLevel(risk: string): RiskLevel {
    const riskMap: Record<string, RiskLevel> = {
        'Low': RiskLevel.LOW,
        'Medium': RiskLevel.MEDIUM,
        'High': RiskLevel.HIGH,
    };
    return riskMap[risk] || RiskLevel.MEDIUM;
}

async function main() {
    console.log('🌱 Starting database seed...\n');

    // Clear existing agents (optional - comment out to preserve existing data)
    console.log('📋 Clearing existing agents...');
    await prisma.agentAction.deleteMany({});
    await prisma.delegation.deleteMany({});
    await prisma.agent.deleteMany({});

    // Seed agents from mock data
    console.log(`\n🤖 Seeding ${MOCK_AGENTS.length} agents...`);

    for (const mockAgent of MOCK_AGENTS) {
        const agent = await prisma.agent.create({
            data: {
                name: mockAgent.name,
                type: mapAgentType(mockAgent.type),
                status: mapAgentStatus(mockAgent.status),
                reputation: mockAgent.reputation,
                winRate: mockAgent.winRate,
                drawdown: mockAgent.drawdown,
                aum: mockAgent.aum,
                risk: mapRiskLevel(mockAgent.risk),
                strategy: mockAgent.strategy,
                signalStrength: mockAgent.signalStrength || 0,
                image: mockAgent.image,
                onchainId: mockAgent.onchainId,
                onchainType: mockAgent.onchainType,
                strategyHash: mockAgent.strategyHash,
                operator: mockAgent.operator,
                registeredAt: mockAgent.registeredAt ? new Date(mockAgent.registeredAt) : null,
                verifiedOnchain: mockAgent.verifiedOnchain || false,
            },
        });

        console.log(`  ✅ Created agent: ${agent.name} (${agent.id})`);
    }

    // Create a demo user (optional)
    console.log('\n👤 Creating demo user...');
    const demoUser = await prisma.user.upsert({
        where: { walletAddress: '0xdemo0000000000000000000000000000000001' },
        update: {},
        create: {
            walletAddress: '0xdemo0000000000000000000000000000000001',
            username: 'demo_user',
            displayName: 'Demo User',
        },
    });
    console.log(`  ✅ Created user: ${demoUser.displayName} (${demoUser.id})`);

    // Summary
    const agentCount = await prisma.agent.count();
    const userCount = await prisma.user.count();

    console.log('\n📊 Seed Summary:');
    console.log(`  - Agents: ${agentCount}`);
    console.log(`  - Users: ${userCount}`);
    console.log('\n✨ Database seed completed successfully!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
