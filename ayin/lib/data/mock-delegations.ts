/**
 * Centralized mock delegation data
 * This is the single source of truth for delegation data until database integration
 */

import type { Delegation } from '../types';

// In-memory storage for delegations (mock)
// In production, this would be stored in a database
let mockDelegations: Delegation[] = [
    {
        id: 'del-1',
        agentId: '1',
        agentName: 'Sentinel Alpha',
        status: 'active',
        constraints: {
            agentId: '1',
            allocation: 5000,
            duration: 30,
            maxDrawdown: 10,
            maxPosition: 20,
            deltaNeutral: true,
            stopLoss: true,
        },
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        expiresAt: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
    },
];

/**
 * Get all delegations
 */
export function getDelegations(filters?: { status?: string }): Delegation[] {
    let delegations = [...mockDelegations];

    if (filters?.status) {
        delegations = delegations.filter((d) => d.status === filters.status);
    }

    return delegations;
}

/**
 * Get delegation by ID
 */
export function getDelegationById(id: string): Delegation | undefined {
    return mockDelegations.find((d) => d.id === id);
}

/**
 * Add a new delegation
 */
export function addDelegation(delegation: Delegation): void {
    mockDelegations.push(delegation);
}

/**
 * Update delegation status
 */
export function updateDelegationStatus(
    id: string,
    status: Delegation['status']
): Delegation | undefined {
    const delegation = mockDelegations.find((d) => d.id === id);
    if (delegation) {
        delegation.status = status;
    }
    return delegation;
}

/**
 * Get delegation index by ID (for checking existence)
 */
export function getDelegationIndex(id: string): number {
    return mockDelegations.findIndex((d) => d.id === id);
}

/**
 * Check if delegation exists for agent
 */
export function hasActiveDelegation(agentId: string): boolean {
    return mockDelegations.some(
        (d) => d.agentId === agentId && d.status === 'active'
    );
}
