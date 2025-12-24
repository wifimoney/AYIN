import express, { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import { PaymentChallenge, PaymentProof, DataUsageLog, Logger } from './types';

/**
 * Payment verification interface
 */
export interface PaymentProvider {
    verifyPayment(proof: PaymentProof): Promise<boolean>;
}



/**
 * x402 Server: Gated data endpoint
 */
export class X402Server {
    public app: express.Application;
    private logger: Logger;
    private paymentProvider: PaymentProvider;
    private usageLogs: DataUsageLog[] = [];
    private challengeNonces: Map<string, PaymentChallenge> = new Map();

    constructor(logger: Logger, paymentProvider: PaymentProvider) {
        this.logger = logger;
        this.paymentProvider = paymentProvider;
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }

    private setupMiddleware(): void {
        this.app.use(express.json());
        this.app.use((req: Request, res: Response, next: NextFunction) => {
            this.logger.debug('Incoming request', {
                method: req.method,
                path: req.path,
                ip: req.ip,
            });
            next();
        });
    }

    private setupRoutes(): void {
        // Protected endpoint: Market data
        this.app.get('/market/:marketId/data', this.handleMarketData.bind(this));

        // Protected endpoint: Strategy signals (premium)
        this.app.post('/signals/premium', this.handleSignals.bind(this));

        // Public endpoint: Usage logs
        this.app.get('/admin/logs', this.handleLogsEndpoint.bind(this));
    }

    /**
     * Protected endpoint: Market data
     */
    private async handleMarketData(
        req: Request,
        res: Response
    ): Promise<void> {
        const { marketId } = req.params;
        const proof = req.headers.authorization?.replace('x402 ', '');

        // Step 1: Verify payment proof
        if (!proof) {
            this.sendPaymentRequired(res, `/market/${marketId}/data`);
            return;
        }

        try {
            const paymentProof = JSON.parse(proof);
            // Deserialization fix for BigInt
            paymentProof.amount = BigInt(paymentProof.amount);

            const verified = await this.paymentProvider.verifyPayment(paymentProof as PaymentProof);

            if (!verified) {
                this.logUsage({
                    agentId: paymentProof.agentId,
                    endpoint: `/market/${marketId}/data`,
                    amountPaid: paymentProof.amount,
                    timestamp: Math.floor(Date.now() / 1000),
                    success: false,
                    errorMessage: 'Payment verification failed',
                });

                res.status(403).json({ error: 'Payment verification failed' });
                return;
            }

            // Step 2: Return data
            const data = {
                marketId: Number(marketId),
                yesLiquidity: "1000000000000000000000",
                noLiquidity: "500000000000000000000",
                yesProbability: 67,
                estimatedYesPrice: 0.67,
                timestamp: Math.floor(Date.now() / 1000),
            };

            this.logUsage({
                agentId: paymentProof.agentId,
                endpoint: `/market/${marketId}/data`,
                amountPaid: paymentProof.amount,
                timestamp: Math.floor(Date.now() / 1000),
                success: true,
            });

            res.setHeader('x402-cost', paymentProof.amount.toString());
            res.json(data);
        } catch (error) {
            this.logger.error('Payment verification error', error as Error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Protected endpoint: Premium signals
     */
    private async handleSignals(req: Request, res: Response): Promise<void> {
        const proof = req.headers.authorization?.replace('x402 ', '');

        if (!proof) {
            this.sendPaymentRequired(res, '/signals/premium');
            return;
        }

        try {
            const paymentProof = JSON.parse(proof);
            // Deserialization fix for BigInt
            paymentProof.amount = BigInt(paymentProof.amount);

            const verified = await this.paymentProvider.verifyPayment(paymentProof as PaymentProof);

            if (!verified) {
                res.status(403).json({ error: 'Payment verification failed' });
                return;
            }

            // Return expensive data
            const signals = [
                {
                    marketId: 1,
                    direction: 'YES',
                    confidence: 0.85,
                    model: 'v1.2',
                },
                {
                    marketId: 2,
                    direction: 'NO',
                    confidence: 0.72,
                    model: 'v1.2',
                },
            ];

            const challenge = this.validateChallenge(paymentProof, '/signals/premium');

            if (!challenge) {
                res.status(403).json({ error: 'Invalid or expired payment challenge' });
                return;
            }

            this.logUsage({
                agentId: paymentProof.agentId,
                endpoint: '/signals/premium',
                amountPaid: paymentProof.amount,
                timestamp: Math.floor(Date.now() / 1000),
                success: true,
            });

            res.setHeader('x402-cost', paymentProof.amount.toString());
            res.json(signals);
        } catch (error) {
            this.logger.error('Signals endpoint error', error as Error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    private validateChallenge(
        proof: PaymentProof,
        endpoint: string
    ): PaymentChallenge | null {
        const challenge = this.challengeNonces.get(proof.nonce);

        if (!challenge) return null;
        if (challenge.expiresAt < Math.floor(Date.now() / 1000)) return null;
        if (challenge.amount !== proof.amount) return null;

        // Optional: enforce endpoint binding
        return challenge;
    }

    /**
     * Public endpoint: Usage logs (admin only)
     */
    private async handleLogsEndpoint(req: Request, res: Response): Promise<void> {
        // In production, add auth (e.g., API key)
        const agentId = req.query.agentId ? Number(req.query.agentId) : undefined;

        const filtered = agentId
            ? this.usageLogs.filter((log) => log.agentId === agentId)
            : this.usageLogs;

        // Serialize logs for JSON response (BigInt to string)
        const serializedLogs = filtered.map(log => ({
            ...log,
            amountPaid: log.amountPaid.toString()
        }));

        const summary = this.getUsageSummary();
        const serializedSummary: Record<string, { count: number; totalCost: string }> = {};

        for (const [key, val] of Object.entries(summary)) {
            serializedSummary[key] = {
                count: val.count,
                totalCost: val.totalCost.toString()
            };
        }

        res.json({
            logs: serializedLogs,
            summary: serializedSummary,
        });
    }

    /**
     * Send 402 Payment Required challenge
     */
    private sendPaymentRequired(res: Response, endpoint: string): void {
        const nonce = this.generateNonce();

        const challenge: PaymentChallenge = {
            paymentAddress: '0x' + 'payment'.repeat(5).substring(0, 40),
            amount: BigInt(100), // 100 wei for this request
            token: '0x0', // Native token
            nonce,
            expiresAt: Math.floor(Date.now() / 1000) + 300, // 5 minutes
            minimumChainId: 84532, // Base Sepolia
        };

        this.challengeNonces.set(nonce, challenge);

        const serializedChallenge = {
            ...challenge,
            amount: challenge.amount.toString()
        };

        const challengeStr = Buffer.from(JSON.stringify(serializedChallenge)).toString('base64');

        res.status(402).setHeader('WWW-Authenticate', `x402 ${challengeStr}`).json({
            error: 'Payment Required',
            message: 'This endpoint requires x402 payment',
        });

        this.logger.info('Sent 402 challenge', {
            endpoint,
            nonce,
            amount: challenge.amount.toString(),
        });
    }

    /**
     * Log data usage
     */
    private logUsage(log: DataUsageLog): void {
        this.usageLogs.push(log);
        this.logger.info('Data access logged', {
            agentId: log.agentId,
            endpoint: log.endpoint,
            success: log.success,
        });
    }

    /**
     * Get usage summary
     */
    private getUsageSummary(): Record<string, { count: number; totalCost: bigint }> {
        const summary: Record<string, { count: number; totalCost: bigint }> = {};

        for (const log of this.usageLogs) {
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

    /**
     * Generate nonce
     */
    private generateNonce(): string {
        return 'nonce-' + Math.random().toString(36).substr(2, 16);
    }

    /**
     * Start server
     */
    start(port: number = 3000): void {
        this.app.listen(port, () => {
            this.logger.info(`x402 server listening on port ${port}`);
        });
    }

    /**
     * Get all logs
     */
    getLogs(): DataUsageLog[] {
        return [...this.usageLogs];
    }
}

/**
 * Mock payment provider (development)
 */
export class MockPaymentProvider implements PaymentProvider {
    private logger: Logger;

    constructor(logger: Logger) {
        this.logger = logger;
    }

    async verifyPayment(proof: PaymentProof): Promise<boolean> {
        this.logger.debug('Verifying mock payment', {
            agentId: proof.agentId,
            amount: proof.amount.toString(),
        });

        // In mock mode, always accept
        return true;
    }
}

/**
 * Blockchain payment provider (future)
 */
export class BlockchainPaymentProvider implements PaymentProvider {
    private logger: Logger;
    private provider: ethers.providers.JsonRpcProvider;

    constructor(rpcUrl: string, logger: Logger) {
        this.logger = logger;
        this.provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    }

    async verifyPayment(proof: PaymentProof): Promise<boolean> {
        try {
            // TODO: Implement blockchain verification
            // 1. Fetch transaction
            // 2. Verify recipient is correct
            // 3. Verify amount matches
            // 4. Verify block inclusion

            this.logger.warn('Blockchain verification not yet implemented');
            return true;
        } catch (error) {
            this.logger.error('Payment verification error', error as Error);
            return false;
        }
    }
}
