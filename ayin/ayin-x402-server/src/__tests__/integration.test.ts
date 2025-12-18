import request from 'supertest';
import { X402Server, MockPaymentProvider } from '../server';
import { createLogger } from '../logger';

describe('x402 Integration', () => {
    let server: X402Server;
    let app: any;

    beforeEach(() => {
        const logger = createLogger('debug');
        const provider = new MockPaymentProvider(logger);
        server = new X402Server(logger, provider);
        app = server.app; // Expose app for testing
    });

    it('should return 402 for unauthenticated request', async () => {
        const response = await request(app)
            .get('/market/1/data')
            .expect(402);

        expect(response.headers['www-authenticate']).toBeDefined();
        expect(response.headers['www-authenticate']).toMatch(/^x402 /);
    });

    it('should return 200 with data for authenticated request', async () => {
        // First, get the challenge
        const challengeResponse = await request(app)
            .get('/market/1/data')
            .expect(402);

        // Parse challenge
        const authHeader = challengeResponse.headers['www-authenticate'];
        const challengeStr = authHeader.replace(/^x402 /, '');
        const challenge = JSON.parse(
            Buffer.from(challengeStr, 'base64').toString()
        );

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
        const response = await request(app)
            .get('/market/1/data')
            .set('Authorization', `x402 ${JSON.stringify(proof)}`)
            .expect(200);

        expect(response.body).toHaveProperty('yesLiquidity');
        expect(response.headers['x402-cost']).toBeDefined();
    });

    it('should log data usage', async () => {
        // Execute some requests...
        // First, get the challenge
        const challengeResponse = await request(app)
            .get('/market/1/data')
            .expect(402);

        const authHeader = challengeResponse.headers['www-authenticate'];
        const challengeStr = authHeader.replace(/^x402 /, '');
        const challenge = JSON.parse(
            Buffer.from(challengeStr, 'base64').toString()
        );

        const proof = {
            amount: challenge.amount,
            paymentAddress: challenge.paymentAddress,
            transactionHash: '0x' + 'mock'.repeat(16),
            blockNumber: 1,
            agentId: 1,
            nonce: challenge.nonce,
            timestamp: Math.floor(Date.now() / 1000),
        };

        await request(app)
            .get('/market/1/data')
            .set('Authorization', `x402 ${JSON.stringify(proof)}`)
            .expect(200);

        // Then check logs
        const logsResponse = await request(app)
            .get('/admin/logs')
            .expect(200);

        expect(logsResponse.body).toHaveProperty('logs');
        expect(logsResponse.body.logs.length).toBeGreaterThan(0);
        expect(logsResponse.body).toHaveProperty('summary');
    });
});
