/**
 * Agent Service Client
 * Phase 1.4: Connect the Wires
 * 
 * This module provides HTTP/RPC communication with the ayin-agent service.
 * It replaces the setTimeout mock with real service calls.
 */

import type { DelegationIntent } from '@/lib/types';
import { updateDelegationStatus, activateDelegation } from '@/lib/data';

// Agent service configuration
const AGENT_SERVICE_URL = process.env.AGENT_SERVICE_URL || 'http://localhost:3001';
const AGENT_SERVICE_TIMEOUT = parseInt(process.env.AGENT_SERVICE_TIMEOUT || '30000', 10);

// ============================================
// TYPES
// ============================================

export interface AgentServiceResponse {
    success: boolean;
    delegationId: string;
    txHash?: string;
    onchainId?: string;
    error?: string;
}

export interface DelegationRequest {
    delegationId: string;
    intent: DelegationIntent;
    callbackUrl?: string;
}

// ============================================
// SERVICE CLIENT
// ============================================

/**
 * Notify the agent service of a new delegation
 * The agent service will:
 * 1. Validate the delegation parameters
 * 2. Prepare the smart wallet transaction
 * 3. Execute the delegation on-chain
 * 4. Update the delegation status via callback
 */
export async function notifyAgentService(
    delegationId: string,
    intent: DelegationIntent
): Promise<AgentServiceResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AGENT_SERVICE_TIMEOUT);

    try {
        console.log(`[AgentService] Notifying agent service of delegation ${delegationId}`);

        const response = await fetch(`${AGENT_SERVICE_URL}/api/delegations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // TODO: Add service-to-service auth token
                'X-Service-Token': process.env.AGENT_SERVICE_TOKEN || 'dev-token',
            },
            body: JSON.stringify({
                delegationId,
                intent,
                callbackUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/delegations/${delegationId}/callback`,
            } as DelegationRequest),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`[AgentService] Failed to process delegation: ${response.status}`, errorData);

            // Mark delegation as failed
            await updateDelegationStatus(delegationId, 'failed');

            return {
                success: false,
                delegationId,
                error: errorData.error || `HTTP ${response.status}`,
            };
        }

        const data: AgentServiceResponse = await response.json();
        console.log(`[AgentService] Delegation ${delegationId} processed:`, data);

        // If the agent service returns a txHash, activate the delegation
        if (data.success && data.txHash) {
            await activateDelegation(delegationId, data.txHash, data.onchainId);
        }

        return data;
    } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof Error && error.name === 'AbortError') {
            console.error(`[AgentService] Request timeout for delegation ${delegationId}`);
            await updateDelegationStatus(delegationId, 'failed');
            return {
                success: false,
                delegationId,
                error: 'TIMEOUT',
            };
        }

        console.error(`[AgentService] Error processing delegation ${delegationId}:`, error);

        // Check if agent service is unreachable - fail the delegation
        if (error instanceof TypeError && error.message.includes('fetch')) {
            console.error('[AgentService] Agent service unreachable - failing delegation');
            await updateDelegationStatus(delegationId, 'failed');
        }

        return {
            success: false,
            delegationId,
            error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        };
    }
}

/**
 * Check the health of the agent service
 */
export async function checkAgentServiceHealth(): Promise<{
    healthy: boolean;
    latencyMs: number;
    error?: string;
}> {
    const start = Date.now();

    try {
        const response = await fetch(`${AGENT_SERVICE_URL}/health`, {
            method: 'GET',
            headers: {
                'X-Service-Token': process.env.AGENT_SERVICE_TOKEN || 'dev-token',
            },
        });

        const latencyMs = Date.now() - start;

        if (!response.ok) {
            return {
                healthy: false,
                latencyMs,
                error: `HTTP ${response.status}`,
            };
        }

        return {
            healthy: true,
            latencyMs,
        };
    } catch (error) {
        return {
            healthy: false,
            latencyMs: Date.now() - start,
            error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        };
    }
}

/**
 * Cancel a delegation via the agent service
 */
export async function cancelDelegationViaAgent(
    delegationId: string
): Promise<AgentServiceResponse> {
    try {
        const response = await fetch(`${AGENT_SERVICE_URL}/api/delegations/${delegationId}/cancel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Service-Token': process.env.AGENT_SERVICE_TOKEN || 'dev-token',
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                delegationId,
                error: errorData.error || `HTTP ${response.status}`,
            };
        }

        return await response.json();
    } catch (error) {
        return {
            success: false,
            delegationId,
            error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        };
    }
}

/**
 * Get delegation status from the agent service
 */
export async function getDelegationStatusFromAgent(
    delegationId: string
): Promise<{
    status: string;
    lastActivity?: string;
    error?: string;
}> {
    try {
        const response = await fetch(`${AGENT_SERVICE_URL}/api/delegations/${delegationId}/status`, {
            method: 'GET',
            headers: {
                'X-Service-Token': process.env.AGENT_SERVICE_TOKEN || 'dev-token',
            },
        });

        if (!response.ok) {
            return {
                status: 'unknown',
                error: `HTTP ${response.status}`,
            };
        }

        return await response.json();
    } catch (error) {
        return {
            status: 'unknown',
            error: error instanceof Error ? error.message : 'UNKNOWN_ERROR',
        };
    }
}
