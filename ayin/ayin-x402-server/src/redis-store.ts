/**
 * Redis Store for x402 Server
 * Phase 1.3: Redis for State
 * 
 * Replaces in-memory Map storage with Redis for:
 * - Payment challenge nonces (with TTL)
 * - Usage logs (with configurable retention)
 * - Rate limiting
 */

import Redis from 'ioredis';
import { PaymentChallenge, DataUsageLog, Logger } from './types';

// Redis key prefixes
const KEYS = {
    CHALLENGE: 'x402:challenge:',
    USAGE_LOG: 'x402:log:',
    USAGE_COUNTER: 'x402:counter:',
    RATE_LIMIT: 'x402:ratelimit:',
} as const;

// Default TTLs in seconds
const TTL = {
    CHALLENGE: 300,    // 5 minutes
    USAGE_LOG: 86400,  // 24 hours
    RATE_LIMIT: 60,    // 1 minute window
} as const;

export class RedisStore {
    private redis: Redis;
    private logger: Logger;

    constructor(redisUrl: string, logger: Logger) {
        this.logger = logger;
        this.redis = new Redis(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => Math.min(times * 100, 3000),
            lazyConnect: true,
            enableReadyCheck: true,
        });

        this.redis.on('error', (err) => {
            this.logger.error('Redis connection error', err);
        });

        this.redis.on('connect', () => {
            this.logger.info('Redis connected for x402 server');
        });
    }

    // ============================================
    // CHALLENGE MANAGEMENT
    // ============================================

    async setChallenge(nonce: string, challenge: PaymentChallenge): Promise<void> {
        const key = `${KEYS.CHALLENGE}${nonce}`;
        const serialized = {
            ...challenge,
            amount: challenge.amount.toString(), // BigInt to string
        };
        await this.redis.setex(key, TTL.CHALLENGE, JSON.stringify(serialized));
        this.logger.debug('Challenge stored', { nonce, expiresIn: TTL.CHALLENGE });
    }

    async getChallenge(nonce: string): Promise<PaymentChallenge | null> {
        const key = `${KEYS.CHALLENGE}${nonce}`;
        const data = await this.redis.get(key);

        if (!data) return null;

        const parsed = JSON.parse(data);
        return {
            ...parsed,
            amount: BigInt(parsed.amount), // String back to BigInt
        };
    }

    async consumeChallenge(nonce: string): Promise<PaymentChallenge | null> {
        const key = `${KEYS.CHALLENGE}${nonce}`;

        // Get and delete atomically
        const pipeline = this.redis.pipeline();
        pipeline.get(key);
        pipeline.del(key);
        const results = await pipeline.exec();

        const data = results?.[0]?.[1] as string | null;
        if (!data) return null;

        const parsed = JSON.parse(data);
        return {
            ...parsed,
            amount: BigInt(parsed.amount),
        };
    }

    // ============================================
    // USAGE LOG MANAGEMENT
    // ============================================

    async logUsage(log: DataUsageLog): Promise<void> {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const key = `${KEYS.USAGE_LOG}${id}`;

        const serialized = {
            ...log,
            amountPaid: log.amountPaid.toString(),
        };

        // Store log with TTL
        await this.redis.setex(key, TTL.USAGE_LOG, JSON.stringify(serialized));

        // Increment counter for agent
        const counterKey = `${KEYS.USAGE_COUNTER}agent:${log.agentId}`;
        await this.redis.incr(counterKey);

        this.logger.debug('Usage logged', { id, agentId: log.agentId });
    }

    async getUsageLogs(agentId?: number, limit: number = 100): Promise<DataUsageLog[]> {
        // Scan for log keys
        const pattern = `${KEYS.USAGE_LOG}*`;
        const keys: string[] = [];

        // Use SCAN to find keys (non-blocking)
        let cursor = '0';
        do {
            const [newCursor, foundKeys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
            cursor = newCursor;
            keys.push(...foundKeys);
        } while (cursor !== '0' && keys.length < limit);

        if (keys.length === 0) return [];

        // Get values for all keys
        const values = await this.redis.mget(...keys.slice(0, limit));

        const logs: DataUsageLog[] = values
            .filter((v): v is string => v !== null)
            .map(v => {
                const parsed = JSON.parse(v);
                return {
                    ...parsed,
                    amountPaid: BigInt(parsed.amountPaid),
                };
            });

        // Filter by agentId if specified
        if (agentId !== undefined) {
            return logs.filter(log => log.agentId === agentId);
        }

        return logs;
    }

    async getUsageSummary(): Promise<Record<string, { count: number; totalCost: bigint }>> {
        const summary: Record<string, { count: number; totalCost: bigint }> = {};

        // Get all usage logs
        const logs = await this.getUsageLogs(undefined, 1000);

        for (const log of logs) {
            const key = `agent-${log.agentId}`;
            if (!summary[key]) {
                summary[key] = { count: 0, totalCost: BigInt(0) };
            }
            summary[key].count++;
            if (log.success) {
                summary[key].totalCost += log.amountPaid;
            }
        }

        return summary;
    }

    // ============================================
    // RATE LIMITING
    // ============================================

    async checkRateLimit(
        identifier: string,
        windowSeconds: number = TTL.RATE_LIMIT,
        maxRequests: number = 100
    ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
        const key = `${KEYS.RATE_LIMIT}${identifier}`;
        const now = Math.floor(Date.now() / 1000);

        const pipeline = this.redis.pipeline();
        pipeline.incr(key);
        pipeline.ttl(key);
        const results = await pipeline.exec();

        const count = (results?.[0]?.[1] as number) || 0;
        const ttl = (results?.[1]?.[1] as number) || -1;

        // Set expiry on first request
        if (ttl === -1) {
            await this.redis.expire(key, windowSeconds);
        }

        const allowed = count <= maxRequests;
        const remaining = Math.max(0, maxRequests - count);
        const resetAt = now + (ttl > 0 ? ttl : windowSeconds);

        return { allowed, remaining, resetAt };
    }

    // ============================================
    // NONCE TRACKING (for signature verification)
    // ============================================

    async isNonceUsed(nonce: string): Promise<boolean> {
        const key = `x402:nonce:${nonce}`;
        const exists = await this.redis.exists(key);
        return exists === 1;
    }

    async markNonceAsUsed(nonce: string, ttlSeconds: number = 3600): Promise<boolean> {
        const key = `x402:nonce:${nonce}`;
        // Use setnx + expire as fallback for type safety
        const wasSet = await this.redis.setnx(key, '1');
        if (wasSet === 1) {
            await this.redis.expire(key, ttlSeconds);
            return true;
        }
        return false;
    }

    // ============================================
    // LIFECYCLE
    // ============================================

    async connect(): Promise<void> {
        await this.redis.connect();
    }

    async disconnect(): Promise<void> {
        await this.redis.quit();
    }

    async ping(): Promise<boolean> {
        try {
            const result = await this.redis.ping();
            return result === 'PONG';
        } catch {
            return false;
        }
    }
}
