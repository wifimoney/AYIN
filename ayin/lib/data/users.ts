/**
 * User Repository
 * Phase 1: Persistence Implementation
 * 
 * Handles user profile management with PostgreSQL via Prisma
 */

import { prisma } from '../db';
import { User, Prisma } from '../generated/prisma';

// ============================================
// TYPES
// ============================================

export interface UserProfile {
    id: string;
    walletAddress: string;
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
    createdAt: string;
    updatedAt: string;
}

function mapPrismaUserToProfile(user: User): UserProfile {
    return {
        id: user.id,
        walletAddress: user.walletAddress,
        fid: user.fid ?? undefined,
        username: user.username ?? undefined,
        displayName: user.displayName ?? undefined,
        pfpUrl: user.pfpUrl ?? undefined,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}

// ============================================
// QUERIES
// ============================================

export async function getUserById(id: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
        where: { id },
    });

    if (!user) return null;
    return mapPrismaUserToProfile(user);
}

export async function getUserByWallet(walletAddress: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
        where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) return null;
    return mapPrismaUserToProfile(user);
}

export async function getUserByFid(fid: number): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
        where: { fid },
    });

    if (!user) return null;
    return mapPrismaUserToProfile(user);
}

// ============================================
// MUTATIONS
// ============================================

export interface CreateUserInput {
    walletAddress: string;
    fid?: number;
    username?: string;
    displayName?: string;
    pfpUrl?: string;
}

export async function createOrUpdateUser(input: CreateUserInput): Promise<UserProfile> {
    const walletAddress = input.walletAddress.toLowerCase();

    const user = await prisma.user.upsert({
        where: { walletAddress },
        create: {
            walletAddress,
            fid: input.fid,
            username: input.username,
            displayName: input.displayName,
            pfpUrl: input.pfpUrl,
        },
        update: {
            fid: input.fid,
            username: input.username,
            displayName: input.displayName,
            pfpUrl: input.pfpUrl,
        },
    });

    return mapPrismaUserToProfile(user);
}

export async function updateUserProfile(
    id: string,
    updates: Partial<Omit<CreateUserInput, 'walletAddress'>>
): Promise<UserProfile | null> {
    try {
        const user = await prisma.user.update({
            where: { id },
            data: updates,
        });
        return mapPrismaUserToProfile(user);
    } catch {
        return null;
    }
}

// ============================================
// STATISTICS
// ============================================

export async function getUserStats(): Promise<{
    total: number;
    withFarcaster: number;
    recentlyActive: number;
}> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [total, withFarcaster, recentlyActive] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { fid: { not: null } } }),
        prisma.session.count({
            where: { lastActiveAt: { gte: oneDayAgo } },
        }),
    ]);

    return { total, withFarcaster, recentlyActive };
}

// ============================================
// SESSION MANAGEMENT (Database-backed)
// ============================================

export interface SessionData {
    id: string;
    userId: string;
    token: string;
    expiresAt: string;
    createdAt: string;
    lastActiveAt: string;
}

export async function createSession(
    userId: string,
    token: string,
    expiresInDays: number = 7
): Promise<SessionData> {
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
        data: {
            userId,
            token,
            expiresAt,
        },
    });

    return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
    };
}

export async function getSessionByToken(token: string): Promise<SessionData | null> {
    const session = await prisma.session.findUnique({
        where: { token },
    });

    if (!session) return null;

    // Check if expired
    if (session.expiresAt < new Date()) {
        await prisma.session.delete({ where: { id: session.id } });
        return null;
    }

    return {
        id: session.id,
        userId: session.userId,
        token: session.token,
        expiresAt: session.expiresAt.toISOString(),
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
    };
}

export async function updateSessionActivity(token: string): Promise<void> {
    await prisma.session.update({
        where: { token },
        data: { lastActiveAt: new Date() },
    }).catch(() => {
        // Session may not exist, ignore
    });
}

export async function deleteSession(token: string): Promise<void> {
    await prisma.session.delete({
        where: { token },
    }).catch(() => {
        // Session may not exist, ignore
    });
}

export async function deleteUserSessions(userId: string): Promise<number> {
    const result = await prisma.session.deleteMany({
        where: { userId },
    });
    return result.count;
}

export async function cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.session.deleteMany({
        where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
}
