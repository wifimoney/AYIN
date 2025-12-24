"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockchainPaymentProvider = exports.MockPaymentProvider = exports.X402Server = void 0;
const express_1 = __importDefault(require("express"));
const ethers_1 = require("ethers");
/**
 * x402 Server: Gated data endpoint
 */
class X402Server {
    constructor(logger, paymentProvider) {
        this.usageLogs = [];
        this.challengeNonces = new Map();
        this.logger = logger;
        this.paymentProvider = paymentProvider;
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(express_1.default.json());
        this.app.use((req, res, next) => {
            this.logger.debug('Incoming request', {
                method: req.method,
                path: req.path,
                ip: req.ip,
            });
            next();
        });
    }
    setupRoutes() {
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
    async handleMarketData(req, res) {
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
            const verified = await this.paymentProvider.verifyPayment(paymentProof);
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
        }
        catch (error) {
            this.logger.error('Payment verification error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * Protected endpoint: Premium signals
     */
    async handleSignals(req, res) {
        const proof = req.headers.authorization?.replace('x402 ', '');
        if (!proof) {
            this.sendPaymentRequired(res, '/signals/premium');
            return;
        }
        try {
            const paymentProof = JSON.parse(proof);
            // Deserialization fix for BigInt
            paymentProof.amount = BigInt(paymentProof.amount);
            const verified = await this.paymentProvider.verifyPayment(paymentProof);
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
        }
        catch (error) {
            this.logger.error('Signals endpoint error', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    validateChallenge(proof, endpoint) {
        const challenge = this.challengeNonces.get(proof.nonce);
        if (!challenge)
            return null;
        if (challenge.expiresAt < Math.floor(Date.now() / 1000))
            return null;
        if (challenge.amount !== proof.amount)
            return null;
        // Optional: enforce endpoint binding
        return challenge;
    }
    /**
     * Public endpoint: Usage logs (admin only)
     */
    async handleLogsEndpoint(req, res) {
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
        const serializedSummary = {};
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
    sendPaymentRequired(res, endpoint) {
        const nonce = this.generateNonce();
        const challenge = {
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
    logUsage(log) {
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
    getUsageSummary() {
        const summary = {};
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
    generateNonce() {
        return 'nonce-' + Math.random().toString(36).substr(2, 16);
    }
    /**
     * Start server
     */
    start(port = 3000) {
        this.app.listen(port, () => {
            this.logger.info(`x402 server listening on port ${port}`);
        });
    }
    /**
     * Get all logs
     */
    getLogs() {
        return [...this.usageLogs];
    }
}
exports.X402Server = X402Server;
/**
 * Mock payment provider (development)
 */
class MockPaymentProvider {
    constructor(logger) {
        this.logger = logger;
    }
    async verifyPayment(proof) {
        this.logger.debug('Verifying mock payment', {
            agentId: proof.agentId,
            amount: proof.amount.toString(),
        });
        // In mock mode, always accept
        return true;
    }
}
exports.MockPaymentProvider = MockPaymentProvider;
/**
 * Blockchain payment provider (future)
 */
class BlockchainPaymentProvider {
    constructor(rpcUrl, logger) {
        this.logger = logger;
        this.provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
    }
    async verifyPayment(proof) {
        try {
            // TODO: Implement blockchain verification
            // 1. Fetch transaction
            // 2. Verify recipient is correct
            // 3. Verify amount matches
            // 4. Verify block inclusion
            this.logger.warn('Blockchain verification not yet implemented');
            return true;
        }
        catch (error) {
            this.logger.error('Payment verification error', error);
            return false;
        }
    }
}
exports.BlockchainPaymentProvider = BlockchainPaymentProvider;
