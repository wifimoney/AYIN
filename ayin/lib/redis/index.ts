/**
 * Redis Client
 * Phase 1.3: Move challengeNonces and session stores to Redis
 * 
 * Provides Redis connection for:
 * - Session management
 * - Payment challenge nonces (x402)
 * - Rate limiting
 * - Caching
 */

import Redis from 'ioredis';

// Global type declaration for Redis singleton
declare global {
    // eslint-disable-next-line no-var
    var redis: Redis | undefined;
}

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create singleton instance
function createRedisClient(): Redis {
    const client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        lazyConnect: true,
        enableReadyCheck: true,
    });

    client.on('error', (err) => {
        console.error('[Redis] Connection error:', err.message);
    });

    client.on('connect', () => {
        console.log('[Redis] Connected successfully');
    });

    client.on('reconnecting', () => {
        console.log('[Redis] Reconnecting...');
    });

    return client;
}

// Get or create singleton instance
const redis = globalThis.redis ?? createRedisClient();

// Prevent multiple instances in development (hot reload)
if (process.env.NODE_ENV !== 'production') {
    globalThis.redis = redis;
}

export { redis };
export default redis;

export async function isConnected(): Promise<boolean> {
    return redis.status === 'ready';
}

// ============================================
// REDIS KEY PREFIXES
// ============================================
export const REDIS_KEYS = {
    SESSION: 'session:',
    CHALLENGE: 'x402:challenge:',
    RATE_LIMIT: 'ratelimit:',
    CACHE: 'cache:',
} as const;

// ============================================
// SESSION MANAGEMENT
// ============================================

export interface RedisSession {
    userId: string;
    walletAddress: string;
    fid?: number;
    createdAt: number;
    expiresAt: number;
}

export async function setSession(
    token: string,
    session: RedisSession,
    ttlSeconds: number = 86400 // 24 hours
): Promise<void> {
    const key = `${REDIS_KEYS.SESSION}${token}`;
    await redis.setex(key, ttlSeconds, JSON.stringify(session));
}

export async function getSession(token: string): Promise<RedisSession | null> {
    const key = `${REDIS_KEYS.SESSION}${token}`;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as RedisSession;
}

export async function deleteSession(token: string): Promise<void> {
    const key = `${REDIS_KEYS.SESSION}${token}`;
    await redis.del(key);
}

export async function extendSession(
    token: string,
    ttlSeconds: number = 86400
): Promise<void> {
    const key = `${REDIS_KEYS.SESSION}${token}`;
    await redis.expire(key, ttlSeconds);
}

// ============================================
// x402 PAYMENT CHALLENGE MANAGEMENT
// ============================================

export interface PaymentChallengeData {
    paymentAddress: string;
    amount: string; // BigInt as string for JSON serialization
    token: string;
    endpoint: string;
    minimumChainId: number;
    expiresAt: number; // Unix timestamp
    createdAt: number;
}

export async function setPaymentChallenge(
    nonce: string,
    challenge: PaymentChallengeData,
    ttlSeconds: number = 300 // 5 minutes
): Promise<void> {
    const key = `${REDIS_KEYS.CHALLENGE}${nonce}`;
    await redis.setex(key, ttlSeconds, JSON.stringify(challenge));
}

export async function getPaymentChallenge(
    nonce: string
): Promise<PaymentChallengeData | null> {
    const key = `${REDIS_KEYS.CHALLENGE}${nonce}`;
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as PaymentChallengeData;
}

export async function consumePaymentChallenge(
    nonce: string
): Promise<PaymentChallengeData | null> {
    const key = `${REDIS_KEYS.CHALLENGE}${nonce}`;
    // Atomic get and delete
    const data = await redis.get(key);
    if (!data) return null;
    await redis.del(key);
    return JSON.parse(data) as PaymentChallengeData;
}

// ============================================
// RATE LIMITING
// ============================================

export async function checkRateLimit(
    identifier: string,
    windowSeconds: number,
    maxRequests: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const key = `${REDIS_KEYS.RATE_LIMIT}${identifier}`;
    const now = Math.floor(Date.now() / 1000);

    const multi = redis.multi();
    multi.incr(key);
    multi.ttl(key);

    const results = await multi.exec();
    const count = (results?.[0]?.[1] as number) || 0;
    const ttl = (results?.[1]?.[1] as number) || -1;

    // Set expiry on first request
    if (ttl === -1) {
        await redis.expire(key, windowSeconds);
    }

    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetAt = now + (ttl > 0 ? ttl : windowSeconds);

    return { allowed, remaining, resetAt };
}

// ============================================
// CACHE HELPERS
// ============================================

export async function cacheGet<T>(key: string): Promise<T | null> {
    const fullKey = `${REDIS_KEYS.CACHE}${key}`;
    const data = await redis.get(fullKey);
    if (!data) return null;
    return JSON.parse(data) as T;
}

export async function cacheSet<T>(
    key: string,
    value: T,
    ttlSeconds: number = 60
): Promise<void> {
    const fullKey = `${REDIS_KEYS.CACHE}${key}`;
    await redis.setex(fullKey, ttlSeconds, JSON.stringify(value));
}

export async function cacheDelete(key: string): Promise<void> {
    const fullKey = `${REDIS_KEYS.CACHE}${key}`;
    await redis.del(fullKey);
}
