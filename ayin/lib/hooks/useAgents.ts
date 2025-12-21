'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Agent } from '../types';
import { fetchAgents, fetchAgent, searchAgents } from '../api/agents';
import { formatApiError } from '../utils/errors';

/**
 * Hook to fetch and manage all agents
 */
export function useAgents(params?: { status?: string }) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAgents(params);
      setAgents(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [params?.status]);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const refetch = useCallback(() => {
    loadAgents();
  }, [loadAgents]);

  return { agents, loading, error, refetch };
}

/**
 * Hook to fetch a single agent by ID
 */
export function useAgent(id: string | null) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAgent = useCallback(async () => {
    if (!id) {
      setAgent(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchAgent(id);
      setAgent(data);
    } catch (err) {
      setError(formatApiError(err));
      setAgent(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAgent();
  }, [loadAgent]);

  const refetch = useCallback(() => {
    loadAgent();
  }, [loadAgent]);

  return { agent, loading, error, refetch };
}

/**
 * Hook for searching agents
 */
export function useAgentSearch() {
  const [results, setResults] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await searchAgents(query);
      setResults(data);
    } catch (err) {
      setError(formatApiError(err));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, loading, error, search, clear };
}

