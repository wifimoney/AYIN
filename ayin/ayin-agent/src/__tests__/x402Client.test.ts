import { X402Client } from '../payments/x402Client';
import { PaymentMethod } from '../payments/x402Types';
import { logger } from '../observability/logger';
import { Executor } from '../execution/executor';

describe('X402Client', () => {
    let client: X402Client;
    const mockExecutor = {} as Executor;

    beforeEach(() => {
        client = new X402Client('http://localhost:3000', {
            method: PaymentMethod.MOCK,
            mockBalance: BigInt("10000000000000000000"),
            agentId: 1,
        }, mockExecutor, logger);
    });

    // Since we don't have a real server, we'll mock the internal makeRequest
    // or mock the global fetch. For simplicity and robustness, let's mock fetch.

    const mockFetch = jest.fn();
    (global as any).fetch = mockFetch;

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should successfully fetch data with mock payment', async () => {
        // 1. Initial request -> 402 with challenge
        mockFetch.mockResolvedValueOnce({
            status: 402,
            ok: false,
            headers: {
                get: (key: string) => {
                    if (key === 'www-authenticate') {
                        const challenge = {
                            paymentAddress: '0x123',
                            amount: '100',
                            nonce: 'nonce1',
                            expiresAt: Date.now() + 1000
                        };
                        const str = Buffer.from(JSON.stringify(challenge)).toString('base64');
                        return `x402 ${str}`;
                    }
                    return null;
                }
            },
            json: async () => ({ error: 'Payment Required' })
        });

        // 2. Retry with proof -> 200 OK
        mockFetch.mockResolvedValueOnce({
            status: 200,
            ok: true,
            headers: {
                get: (key: string) => key === 'x402-cost' ? '100' : null
            },
            json: async () => ({ success: true })
        });

        const response = await client.fetchData({
            endpoint: '/market/1/data',
        });

        expect(response.data).toBeDefined();
        expect(response.cost).toBe(BigInt(100));
        expect(response.metadata.agentId).toBe(1);
    });

    it('should log usage on successful fetch', async () => {
        // 1. Initial request -> 402 with challenge
        mockFetch.mockResolvedValueOnce({
            status: 402,
            ok: false,
            headers: {
                get: (key: string) => {
                    if (key === 'www-authenticate') {
                        const challenge = {
                            paymentAddress: '0x123',
                            amount: '100',
                            nonce: 'nonce2',
                            expiresAt: Date.now() + 1000
                        };
                        const str = Buffer.from(JSON.stringify(challenge)).toString('base64');
                        return `x402 ${str}`;
                    }
                    return null;
                }
            },
            json: async () => ({ error: 'Payment Required' })
        });

        // 2. Retry -> 200
        mockFetch.mockResolvedValueOnce({
            status: 200,
            ok: true,
            headers: {
                get: (key: string) => key === 'x402-cost' ? '100' : null
            },
            json: async () => ({ success: true })
        });

        await client.fetchData({
            endpoint: '/market/1/data',
        });

        const logs = client.getUsageLogs();
        expect(logs.length).toBe(1);
        expect(logs[0].success).toBe(true);
        expect(logs[0].endpoint).toBe('/market/1/data');
    });

    it('should reject request with insufficient balance', async () => {
        const clientLowBalance = new X402Client(
            'http://localhost:3000',
            {
                method: PaymentMethod.MOCK,
                mockBalance: BigInt(1), // Very low balance
                agentId: 1,
            },
            mockExecutor,
            logger
        );

        // Initial request -> 402 with high cost
        mockFetch.mockResolvedValueOnce({
            status: 402,
            ok: false,
            headers: {
                get: (key: string) => {
                    if (key === 'www-authenticate') {
                        const challenge = {
                            paymentAddress: '0x123',
                            amount: '1000', // Higher than balance
                            nonce: 'nonce3',
                            expiresAt: Date.now() + 1000
                        };
                        const str = Buffer.from(JSON.stringify(challenge)).toString('base64');
                        return `x402 ${str}`;
                    }
                    return null;
                }
            },
            json: async () => ({ error: 'Payment Required' })
        });

        await expect(clientLowBalance.fetchData({ endpoint: '/data' }))
            .rejects.toThrow('Insufficient mock balance');
    });
});
