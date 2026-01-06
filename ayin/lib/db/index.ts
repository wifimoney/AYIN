/**
 * Database Client Singleton
 * Phase 1: Persistence Implementation
 * 
 * Provides a singleton PrismaClient instance to avoid connection exhaustion
 * in serverless/edge environments.
 */

import { PrismaClient } from '../generated/prisma';

// Global type declaration for PrismaClient singleton
declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// Create singleton instance
const prisma = globalThis.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
});

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

export { prisma };
export default prisma;
