/**
 * Delegation Repository
 * Phase 1: Persistence Implementation
 * 
 * Replaces mock-delegations.ts with real PostgreSQL queries via Prisma
 */

import { prisma } from '../db';
import type { Delegation as DelegationType, DelegationIntent, DelegationStatus } from '../types';
import { Delegation, DelegationStatus as PrismaDelegationStatus, Prisma } from '../generated/prisma';

// ============================================
// TYPE CONVERTERS
// ============================================

function mapPrismaStatusToType(status: PrismaDelegationStatus): DelegationStatus {
    const mapping: Record<PrismaDelegationStatus, DelegationStatus> = {
        PENDING: 'pending',
        ACTIVE: 'active',
        FAILED: 'failed',
        EXPIRED: 'expired',
        CANCELLED: 'expired', // Map CANCELLED to expired for backwards compatibility
    };
    return mapping[status];
}

function mapTypeStatusToPrisma(status: DelegationStatus): PrismaDelegationStatus {
    const mapping: Record<DelegationStatus, PrismaDelegationStatus> = {
        'pending': PrismaDelegationStatus.PENDING,
        'active': PrismaDelegationStatus.ACTIVE,
        'failed': PrismaDelegationStatus.FAILED,
        'expired': PrismaDelegationStatus.EXPIRED,
    };
    return mapping[status];
}

function mapPrismaDelegationToType(
    delegation: Delegation & { agent?: { name: string } | null }
): DelegationType {
    return {
        id: delegation.id,
        agentId: delegation.agentId,
        agentName: delegation.agent?.name,
        status: mapPrismaStatusToType(delegation.status),
        constraints: {
            agentId: delegation.agentId,
            allocation: delegation.allocation,
            duration: delegation.duration,
            maxDrawdown: delegation.maxDrawdown,
            maxPosition: delegation.maxPosition,
            deltaNeutral: delegation.deltaNeutral,
            stopLoss: delegation.stopLoss,
            approvedMarkets: delegation.approvedMarkets,
        },
        createdAt: delegation.createdAt.toISOString(),
        expiresAt: delegation.expiresAt.toISOString(),
    };
}

// ============================================
// QUERIES
// ============================================

export interface DelegationFilters {
    status?: DelegationStatus;
    userId?: string;
    agentId?: string;
}

export async function getDelegations(filters?: DelegationFilters): Promise<DelegationType[]> {
    const where: Prisma.DelegationWhereInput = {};

    if (filters?.status) {
        where.status = mapTypeStatusToPrisma(filters.status);
    }

    if (filters?.userId) {
        where.userId = filters.userId;
    }

    if (filters?.agentId) {
        where.agentId = filters.agentId;
    }

    const delegations = await prisma.delegation.findMany({
        where,
        include: { agent: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return delegations.map(mapPrismaDelegationToType);
}

export async function getDelegationById(id: string): Promise<DelegationType | null> {
    const delegation = await prisma.delegation.findUnique({
        where: { id },
        include: { agent: { select: { name: true } } },
    });

    if (!delegation) return null;
    return mapPrismaDelegationToType(delegation);
}

export async function getDelegationsByUserId(userId: string): Promise<DelegationType[]> {
    const delegations = await prisma.delegation.findMany({
        where: { userId },
        include: { agent: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return delegations.map(mapPrismaDelegationToType);
}

export async function hasActiveDelegation(agentId: string, userId?: string): Promise<boolean> {
    const where: Prisma.DelegationWhereInput = {
        agentId,
        status: PrismaDelegationStatus.ACTIVE,
    };

    if (userId) {
        where.userId = userId;
    }

    const count = await prisma.delegation.count({ where });
    return count > 0;
}

// ============================================
// MUTATIONS
// ============================================

export interface CreateDelegationInput {
    userId: string;
    intent: DelegationIntent;
}

export async function createDelegation(input: CreateDelegationInput): Promise<DelegationType> {
    const { userId, intent } = input;
    const expiresAt = new Date(Date.now() + intent.duration * 24 * 60 * 60 * 1000);

    const delegation = await prisma.delegation.create({
        data: {
            userId,
            agentId: intent.agentId,
            status: PrismaDelegationStatus.PENDING,
            allocation: intent.allocation,
            duration: intent.duration,
            maxDrawdown: intent.maxDrawdown,
            maxPosition: intent.maxPosition,
            deltaNeutral: intent.deltaNeutral,
            stopLoss: intent.stopLoss,
            approvedMarkets: intent.approvedMarkets ?? [],
            expiresAt,
        },
        include: { agent: { select: { name: true } } },
    });

    return mapPrismaDelegationToType(delegation);
}

export async function updateDelegationStatus(
    id: string,
    status: DelegationStatus,
    txHash?: string
): Promise<DelegationType | null> {
    try {
        const data: Prisma.DelegationUpdateInput = {
            status: mapTypeStatusToPrisma(status),
        };

        if (txHash) {
            data.txHash = txHash;
        }

        const delegation = await prisma.delegation.update({
            where: { id },
            data,
            include: { agent: { select: { name: true } } },
        });

        return mapPrismaDelegationToType(delegation);
    } catch {
        return null;
    }
}

export async function activateDelegation(
    id: string,
    txHash: string,
    onchainId?: string
): Promise<DelegationType | null> {
    try {
        const delegation = await prisma.delegation.update({
            where: { id },
            data: {
                status: PrismaDelegationStatus.ACTIVE,
                txHash,
                onchainId,
            },
            include: { agent: { select: { name: true } } },
        });

        return mapPrismaDelegationToType(delegation);
    } catch {
        return null;
    }
}

export async function cancelDelegation(id: string): Promise<DelegationType | null> {
    try {
        const delegation = await prisma.delegation.update({
            where: { id },
            data: { status: PrismaDelegationStatus.CANCELLED },
            include: { agent: { select: { name: true } } },
        });

        return mapPrismaDelegationToType(delegation);
    } catch {
        return null;
    }
}

// ============================================
// EXPIRATION HANDLING
// ============================================

export async function expireOldDelegations(): Promise<number> {
    const result = await prisma.delegation.updateMany({
        where: {
            status: PrismaDelegationStatus.ACTIVE,
            expiresAt: { lt: new Date() },
        },
        data: { status: PrismaDelegationStatus.EXPIRED },
    });

    return result.count;
}

// ============================================
// STATISTICS
// ============================================

export async function getDelegationStats(userId?: string): Promise<{
    total: number;
    active: number;
    pending: number;
    expired: number;
    totalAllocation: number;
}> {
    const where: Prisma.DelegationWhereInput = userId ? { userId } : {};

    const [total, active, pending, expired, allocationSum] = await Promise.all([
        prisma.delegation.count({ where }),
        prisma.delegation.count({ where: { ...where, status: PrismaDelegationStatus.ACTIVE } }),
        prisma.delegation.count({ where: { ...where, status: PrismaDelegationStatus.PENDING } }),
        prisma.delegation.count({ where: { ...where, status: PrismaDelegationStatus.EXPIRED } }),
        prisma.delegation.aggregate({
            where: { ...where, status: PrismaDelegationStatus.ACTIVE },
            _sum: { allocation: true },
        }),
    ]);

    return {
        total,
        active,
        pending,
        expired,
        totalAllocation: allocationSum._sum.allocation ?? 0,
    };
}
