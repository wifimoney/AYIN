/**
 * Signal Queue - BullMQ Integration
 * Phase 3.1: Asynchronous Job Processing
 * 
 * Decouples signal ingestion from trade execution for scalability.
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { Logger, MarketSignal, DelegationPolicy } from '../types';
import { RiskEngine } from '../risk/risk-engine';
import { SmartWalletExecutor } from '../execution/smart-wallet-executor';

// ============================================
// TYPES
// ============================================

export interface SignalJobData {
    signal: MarketSignal;
    policy: DelegationPolicy;
    agentId: number;
    timestamp: number;
    priority?: number;
}

export interface SignalJobResult {
    success: boolean;
    txHash?: string;
    error?: string;
    executionTimeMs: number;
}

export interface QueueConfig {
    redisUrl: string;
    queueName: string;
    concurrency: number;
    maxRetries: number;
    retryDelayMs: number;
    rateLimitMax: number;
    rateLimitDurationMs: number;
}

const DEFAULT_CONFIG: QueueConfig = {
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    queueName: 'ayin:signals',
    concurrency: 3,
    maxRetries: 3,
    retryDelayMs: 5000,
    rateLimitMax: 10,
    rateLimitDurationMs: 60000,
};

// ============================================
// SIGNAL QUEUE
// ============================================

export class SignalQueue {
    private queue: Queue<SignalJobData, SignalJobResult>;
    private worker: Worker<SignalJobData, SignalJobResult> | null = null;
    private queueEvents: QueueEvents;
    private logger: Logger;
    private config: QueueConfig;
    private riskEngine: RiskEngine | null = null;
    private executor: SmartWalletExecutor | null = null;

    constructor(logger: Logger, config: Partial<QueueConfig> = {}) {
        this.logger = logger;
        this.config = { ...DEFAULT_CONFIG, ...config };

        const connection = { url: this.config.redisUrl };

        this.queue = new Queue<SignalJobData, SignalJobResult>(
            this.config.queueName,
            {
                connection,
                defaultJobOptions: {
                    attempts: this.config.maxRetries,
                    backoff: { type: 'exponential', delay: this.config.retryDelayMs },
                    removeOnComplete: { count: 1000, age: 24 * 3600 },
                    removeOnFail: { count: 5000, age: 7 * 24 * 3600 },
                },
            }
        );

        this.queueEvents = new QueueEvents(this.config.queueName, { connection });
        this.logger.info('SignalQueue initialized', { queueName: this.config.queueName });
    }

    async addSignal(
        signal: MarketSignal,
        policy: DelegationPolicy,
        agentId: number,
        options?: { priority?: number; delay?: number }
    ): Promise<Job<SignalJobData, SignalJobResult>> {
        const job = await this.queue.add('process-signal', {
            signal, policy, agentId, timestamp: Date.now(), priority: options?.priority,
        }, {
            priority: options?.priority || 0,
            delay: options?.delay,
            jobId: `${agentId}-${signal.marketId}-${Date.now()}`,
        });
        this.logger.debug('Signal added to queue', { jobId: job.id, marketId: signal.marketId });
        return job;
    }

    startWorker(riskEngine: RiskEngine, executor: SmartWalletExecutor): void {
        if (this.worker) return;
        this.riskEngine = riskEngine;
        this.executor = executor;

        this.worker = new Worker<SignalJobData, SignalJobResult>(
            this.config.queueName,
            async (job) => this.processJob(job),
            {
                connection: { url: this.config.redisUrl },
                concurrency: this.config.concurrency,
                limiter: { max: this.config.rateLimitMax, duration: this.config.rateLimitDurationMs },
            }
        );

        this.worker.on('completed', (job, result) => {
            this.logger.info('Job completed', { jobId: job.id, success: result.success });
        });
        this.worker.on('failed', (job, error) => {
            this.logger.error('Job failed', { jobId: job?.id, error: error.message });
        });
        this.logger.info('Worker started', { concurrency: this.config.concurrency });
    }

    async stopWorker(): Promise<void> {
        if (this.worker) {
            await this.worker.close();
            this.worker = null;
        }
    }

    private async processJob(job: Job<SignalJobData, SignalJobResult>): Promise<SignalJobResult> {
        const startTime = Date.now();
        const { signal, policy } = job.data;

        if (!this.riskEngine || !this.executor) {
            return { success: false, error: 'Worker not initialized', executionTimeMs: 0 };
        }

        const riskCheck = this.riskEngine.checkTrade({
            marketId: signal.marketId,
            direction: signal.direction,
            size: policy.maxAllocation,
        });

        if (!riskCheck.allowed) {
            return { success: false, error: riskCheck.violations.join(', '), executionTimeMs: Date.now() - startTime };
        }

        const result = await this.executor.executeTrade(signal, policy);
        if (result.success) {
            this.riskEngine.recordTrade({
                id: result.txHash || job.id || 'unknown',
                timestamp: Date.now(),
                marketId: signal.marketId,
                direction: signal.direction,
                size: policy.maxAllocation,
            });
        }

        return { success: result.success, txHash: result.txHash, error: result.error, executionTimeMs: Date.now() - startTime };
    }

    async getStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.queue.getWaitingCount(),
            this.queue.getActiveCount(),
            this.queue.getCompletedCount(),
            this.queue.getFailedCount(),
            this.queue.getDelayedCount(),
        ]);
        return { waiting, active, completed, failed, delayed };
    }

    async close(): Promise<void> {
        await this.stopWorker();
        await this.queueEvents.close();
        await this.queue.close();
    }
}

export function createSignalQueue(logger: Logger, config?: Partial<QueueConfig>): SignalQueue {
    return new SignalQueue(logger, config);
}
