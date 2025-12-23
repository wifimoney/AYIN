'use client';

import { useState, useEffect, useCallback } from 'react';
import type { AgentAction, ApiResponse } from '../types';
import { formatApiError } from '../utils/errors';

/**
 * Hook to fetch and manage agent actions
 */
export function useAgentActions(agentId?: string) {
    const [actions, setActions] = useState<AgentAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadActions = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const url = agentId
                ? `/api/agent-actions?agentId=${agentId}`
                : '/api/agent-actions';

            const response = await fetch(url);
            const result: ApiResponse<AgentAction[]> = await response.json();

            if (result.success && result.data) {
                setActions(result.data);
            } else {
                setError(result.error || 'Failed to fetch actions');
            }
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setLoading(false);
        }
    }, [agentId]);

    useEffect(() => {
        loadActions();
    }, [loadActions]);

    const refetch = useCallback(() => {
        loadActions();
    }, [loadActions]);

    return { actions, loading, error, refetch };
}
