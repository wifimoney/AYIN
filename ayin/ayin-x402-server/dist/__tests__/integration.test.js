"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const server_1 = require("../server");
const logger_1 = require("../logger");
describe('x402 Integration', () => {
    let server;
    let app;
    beforeEach(() => {
        const logger = (0, logger_1.createLogger)('debug');
        const provider = new server_1.MockPaymentProvider(logger);
        server = new server_1.X402Server(logger, provider);
        app = server.app; // Expose app for testing
    });
    it('should return 402 for unauthenticated request', async () => {
        const response = await (0, supertest_1.default)(app)
            .get('/market/1/data')
            .expect(402);
        expect(response.headers['www-authenticate']).toBeDefined();
        expect(response.headers['www-authenticate']).toMatch(/^x402 /);
    });
    it('should return 200 with data for authenticated request', async () => {
        // First, get the challenge
        const challengeResponse = await (0, supertest_1.default)(app)
            .get('/market/1/data')
            .expect(402);
        // Parse challenge
        const authHeader = challengeResponse.headers['www-authenticate'];
        const challengeStr = authHeader.replace(/^x402 /, '');
        const challenge = JSON.parse(Buffer.from(challengeStr, 'base64').toString());
        // Create mock proof
        const proof = {
            amount: challenge.amount,
            paymentAddress: challenge.paymentAddress,
            transactionHash: '0x' + 'mock'.repeat(16),
            blockNumber: 1,
            agentId: 1,
            nonce: challenge.nonce,
            timestamp: Math.floor(Date.now() / 1000),
        };
        // Retry with payment
        const response = await (0, supertest_1.default)(app)
            .get('/market/1/data')
            .set('Authorization', `x402 ${JSON.stringify(proof)}`)
            .expect(200);
        expect(response.body).toHaveProperty('yesLiquidity');
        expect(response.headers['x402-cost']).toBeDefined();
    });
    it('should log data usage', async () => {
        // Execute some requests...
        // First, get the challenge
        const challengeResponse = await (0, supertest_1.default)(app)
            .get('/market/1/data')
            .expect(402);
        const authHeader = challengeResponse.headers['www-authenticate'];
        const challengeStr = authHeader.replace(/^x402 /, '');
        const challenge = JSON.parse(Buffer.from(challengeStr, 'base64').toString());
        const proof = {
            amount: challenge.amount,
            paymentAddress: challenge.paymentAddress,
            transactionHash: '0x' + 'mock'.repeat(16),
            blockNumber: 1,
            agentId: 1,
            nonce: challenge.nonce,
            timestamp: Math.floor(Date.now() / 1000),
        };
        await (0, supertest_1.default)(app)
            .get('/market/1/data')
            .set('Authorization', `x402 ${JSON.stringify(proof)}`)
            .expect(200);
        // Then check logs
        const logsResponse = await (0, supertest_1.default)(app)
            .get('/admin/logs')
            .expect(200);
        expect(logsResponse.body).toHaveProperty('logs');
        expect(logsResponse.body.logs.length).toBeGreaterThan(0);
        expect(logsResponse.body).toHaveProperty('summary');
    });
});
