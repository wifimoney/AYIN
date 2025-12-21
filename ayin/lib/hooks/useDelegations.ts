'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Delegation, DelegationIntent } from '../types';
import {
  fetchDelegations,
  fetchDelegation,
  createDelegation as apiCreateDelegation,
  cancelDelegation as apiCancelDelegation,
} from '../api/delegations';
import { formatApiError } from '../utils/errors';

/**
 * Hook to fetch and manage all delegations
 */
export function useDelegations(params?: { status?: string }) {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadDelegations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDelegations(params);
      setDelegations(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [params?.status]);

  useEffect(() => {
    loadDelegations();
  }, [loadDelegations]);

  const createDelegation = useCallback(
    async (intent: DelegationIntent): Promise<Delegation | null> => {
      try {
        setSubmitting(true);
        setError(null);
        const newDelegation = await apiCreateDelegation(intent);
        // Add to local state
        setDelegations((prev) => [...prev, newDelegation]);
        return newDelegation;
      } catch (err) {
        setError(formatApiError(err));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    []
  );

  const cancelDelegation = useCallback(async (id: string): Promise<boolean> => {
    try {
      setSubmitting(true);
      setError(null);
      const updated = await apiCancelDelegation(id);
      // Update local state
      setDelegations((prev) =>
        prev.map((d) => (d.id === id ? updated : d))
      );
      return true;
    } catch (err) {
      setError(formatApiError(err));
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  const refetch = useCallback(() => {
    loadDelegations();
  }, [loadDelegations]);

  return {
    delegations,
    loading,
    error,
    submitting,
    createDelegation,
    cancelDelegation,
    refetch,
  };
}

/**
 * Hook to fetch a single delegation by ID
 */
export function useDelegation(id: string | null) {
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDelegation = useCallback(async () => {
    if (!id) {
      setDelegation(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchDelegation(id);
      setDelegation(data);
    } catch (err) {
      setError(formatApiError(err));
      setDelegation(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDelegation();
  }, [loadDelegation]);

  const refetch = useCallback(() => {
    loadDelegation();
  }, [loadDelegation]);

  return { delegation, loading, error, refetch };
}

/**
 * Hook for managing delegation form state
 */
export function useDelegationForm(initialAgentId?: string) {
  const [intent, setIntent] = useState<DelegationIntent>({
    agentId: initialAgentId || '',
    allocation: 5000,
    duration: 30,
    maxDrawdown: 12,
    maxPosition: 20,
    deltaNeutral: true,
    stopLoss: true,
    approvedMarkets: ['Crypto Majors', 'Stablecoin Depegs', 'L2 Activity'],
  });

  const updateIntent = useCallback((updates: Partial<DelegationIntent>) => {
    setIntent((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetIntent = useCallback(() => {
    setIntent({
      agentId: initialAgentId || '',
      allocation: 5000,
      duration: 30,
      maxDrawdown: 12,
      maxPosition: 20,
      deltaNeutral: true,
      stopLoss: true,
      approvedMarkets: ['Crypto Majors', 'Stablecoin Depegs', 'L2 Activity'],
    });
  }, [initialAgentId]);

  // Derived state
  const isHighRisk = intent.allocation > 10000;
  const isValid =
    intent.agentId &&
    intent.allocation > 0 &&
    intent.duration >= 1 &&
    intent.duration <= 365 &&
    intent.maxDrawdown >= 1 &&
    intent.maxDrawdown <= 100 &&
    intent.maxPosition >= 1 &&
    intent.maxPosition <= 100;

  return {
    intent,
    updateIntent,
    resetIntent,
    isHighRisk,
    isValid,
  };
}

