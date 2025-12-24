
/**
 * x402 Client Adapter for Next.js
 * Handles communication with the x402 server
 */

export interface X402Market {
    marketId: number;
    yesLiquidity: string;
    noLiquidity: string;
    yesProbability: number;
    estimatedYesPrice: number;
    timestamp: number;
}

export interface X402Agent {
    id: number;
    name: string;
    type: string;
    address: string;
    reputation: number;
    status: 'active' | 'idle' | 'offline';
}

export interface ActivityLog {
    agentId: number;
    endpoint: string;
    amountPaid: string; // serialized BigInt
    timestamp: number;
    success: boolean;
    txHash?: string;
}

export class X402Service {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    /**
     * Fetch market data with x402 cost metadata
     */
    async fetchMarket(marketId: string | number): Promise<{ data: X402Market | null; cost: number }> {
        try {
            // In a real scenario, the frontend would pay.
            // For this viewer, we'll hit the public/protected endpoint and handle the 402 or 200.
            // However, since the frontend is just a "dashboard" seeing what the AGENT sees/pays,
            // we might just want to fetch the public market inputs or the successful log data.

            // But the requirement says "Fetch market data dynamically via the local x402 server".
            // The x402 server has: GET /market/:id/data (protected)

            // Let's assume for the dashboard we use a view-only mode or we simulate the "cost" display.
            // We will proxy the request. If we get 402, we extract the cost to show "This data costs X".

            const res = await fetch(`${this.baseUrl}/market/${marketId}/data`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (res.status === 402) {
                // Extract cost from challenge in WWW-Authenticate header
                const authHeader = res.headers.get('www-authenticate') || '';
                // Format: x402 <base64-json>
                // We can parse the base64 to find the amount
                try {
                    const b64 = authHeader.replace('x402 ', '');
                    if (b64) {
                        const json = JSON.parse(atob(b64));
                        return { data: null, cost: Number(json.amount || 0) };
                    }
                } catch (e) {
                    console.error('Failed to parse x402 challenge', e);
                }
                return { data: null, cost: 0 };
            }

            if (res.ok) {
                const data = await res.json();
                const costHeader = res.headers.get('x402-cost');
                return { data, cost: Number(costHeader || 0) };
            }

            return { data: null, cost: 0 };
        } catch (error) {
            console.error('X402Service fetchMarket error:', error);
            return { data: null, cost: 0 };
        }
    }

    /**
     * Fetch activity logs (admin/public endpoint)
     */
    async fetchActivityLogs(): Promise<ActivityLog[]> {
        try {
            const res = await fetch(`${this.baseUrl}/admin/logs`);
            if (!res.ok) return [];
            const json = await res.json();
            return json.logs || [];
        } catch (error) {
            console.error('X402Service fetchActivityLogs error:', error);
            return [];
        }
    }
}

// Singleton instance for use in API routes
const x402Url = process.env.NEXT_PUBLIC_X402_URL || 'http://localhost:3000';
export const x402Service = new X402Service(x402Url);
