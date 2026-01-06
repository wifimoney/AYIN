/**
 * Agent Repository
 * Phase 1: Persistence Implementation
 * 
 * Replaces mock-agents.ts with real PostgreSQL queries via Prisma
 */

import { prisma } from '../db';
import type { Agent as AgentType, AgentStatus, RiskLevel } from '../types';
import { Agent, AgentStatus as PrismaAgentStatus, RiskLevel as PrismaRiskLevel, AgentType as PrismaAgentType, Prisma } from '../generated/prisma';

// ============================================
// TYPE CONVERTERS
// ============================================

function mapPrismaStatusToType(status: PrismaAgentStatus): AgentStatus {
    const mapping: Record<PrismaAgentStatus, AgentStatus> = {
        ACTIVE: 'Active',
        PAUSED: 'Paused',
        RISK: 'Risk',
    };
    return mapping[status];
}

function mapTypeStatusToPrisma(status: AgentStatus): PrismaAgentStatus {
    const mapping: Record<AgentStatus, PrismaAgentStatus> = {
        'Active': PrismaAgentStatus.ACTIVE,
        'Paused': PrismaAgentStatus.PAUSED,
        'Risk': PrismaAgentStatus.RISK,
    };
    return mapping[status];
}

function mapPrismaRiskToType(risk: PrismaRiskLevel): RiskLevel {
    const mapping: Record<PrismaRiskLevel, RiskLevel> = {
        LOW: 'Low',
        MEDIUM: 'Medium',
        HIGH: 'High',
    };
    return mapping[risk];
}

function mapPrismaAgentToType(agent: Agent): AgentType {
    return {
        id: agent.id,
        name: agent.name,
        type: agent.type.replace('_', ' '),
        status: mapPrismaStatusToType(agent.status),
        reputation: agent.reputation,
        winRate: agent.winRate,
        drawdown: agent.drawdown,
        aum: agent.aum,
        risk: mapPrismaRiskToType(agent.risk),
        strategy: agent.strategy ?? undefined,
        signalStrength: agent.signalStrength,
        image: agent.image ?? undefined,
        onchainId: agent.onchainId ?? undefined,
        onchainType: agent.onchainType ?? undefined,
        strategyHash: agent.strategyHash ?? undefined,
        operator: agent.operator ?? undefined,
        registeredAt: agent.registeredAt?.getTime(),
        verifiedOnchain: agent.verifiedOnchain,
    };
}

// ============================================
// QUERIES
// ============================================

export interface AgentFilters {
    status?: AgentStatus;
    search?: string;
    verifiedOnly?: boolean;
}

export async function getAgents(filters?: AgentFilters): Promise<AgentType[]> {
    const where: Prisma.AgentWhereInput = {};

    if (filters?.status) {
        where.status = mapTypeStatusToPrisma(filters.status);
    }

    if (filters?.verifiedOnly) {
        where.verifiedOnchain = true;
    }

    if (filters?.search) {
        where.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { type: { equals: filters.search.toUpperCase().replace(' ', '_') as PrismaAgentType } },
            { strategy: { contains: filters.search, mode: 'insensitive' } },
        ];
    }

    const agents = await prisma.agent.findMany({
        where,
        orderBy: { reputation: 'desc' },
    });

    return agents.map(mapPrismaAgentToType);
}

export async function getAgentById(id: string): Promise<AgentType | null> {
    const agent = await prisma.agent.findUnique({
        where: { id },
    });

    if (!agent) return null;
    return mapPrismaAgentToType(agent);
}

export async function getAgentByOnchainId(onchainId: number): Promise<AgentType | null> {
    const agent = await prisma.agent.findUnique({
        where: { onchainId },
    });

    if (!agent) return null;
    return mapPrismaAgentToType(agent);
}

// ============================================
// MUTATIONS
// ============================================

export interface CreateAgentInput {
    name: string;
    type: string;
    strategy?: string;
    image?: string;
    risk?: RiskLevel;
    operator?: string;
}

export async function createAgent(input: CreateAgentInput): Promise<AgentType> {
    const agentType = input.type.toUpperCase().replace(' ', '_') as PrismaAgentType;
    const riskLevel = input.risk ? (input.risk.toUpperCase() as PrismaRiskLevel) : PrismaRiskLevel.MEDIUM;

    const agent = await prisma.agent.create({
        data: {
            name: input.name,
            type: agentType,
            strategy: input.strategy,
            image: input.image,
            risk: riskLevel,
            operator: input.operator,
        },
    });

    return mapPrismaAgentToType(agent);
}

export async function updateAgentStatus(id: string, status: AgentStatus): Promise<AgentType | null> {
    try {
        const agent = await prisma.agent.update({
            where: { id },
            data: { status: mapTypeStatusToPrisma(status) },
        });
        return mapPrismaAgentToType(agent);
    } catch {
        return null;
    }
}

export async function updateAgentReputation(id: string, reputation: number): Promise<AgentType | null> {
    try {
        const agent = await prisma.agent.update({
            where: { id },
            data: { reputation: Math.max(0, Math.min(100, reputation)) },
        });
        return mapPrismaAgentToType(agent);
    } catch {
        return null;
    }
}

export async function verifyAgentOnchain(
    id: string,
    onchainId: number,
    onchainType: number,
    strategyHash: string,
    operator: string
): Promise<AgentType | null> {
    try {
        const agent = await prisma.agent.update({
            where: { id },
            data: {
                onchainId,
                onchainType,
                strategyHash,
                operator,
                registeredAt: new Date(),
                verifiedOnchain: true,
            },
        });
        return mapPrismaAgentToType(agent);
    } catch {
        return null;
    }
}

// ============================================
// STATISTICS
// ============================================

export async function getAgentStats(): Promise<{
    total: number;
    active: number;
    verified: number;
}> {
    const [total, active, verified] = await Promise.all([
        prisma.agent.count(),
        prisma.agent.count({ where: { status: PrismaAgentStatus.ACTIVE } }),
        prisma.agent.count({ where: { verifiedOnchain: true } }),
    ]);

    return { total, active, verified };
}
