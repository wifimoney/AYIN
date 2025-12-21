'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Market, NetworkStats } from '../types';
import { fetchMarkets, fetchMarket, searchMarkets, fetchNetworkStats } from '../api/markets';
import { formatApiError } from '../utils/errors';

/**
 * Hook to fetch and manage all markets
 */
export function useMarkets(params?: { category?: string }) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchMarkets(params);
      setMarkets(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [params?.category]);

  useEffect(() => {
    loadMarkets();
  }, [loadMarkets]);

  const refetch = useCallback(() => {
    loadMarkets();
  }, [loadMarkets]);

  return { markets, loading, error, refetch };
}

/**
 * Hook to fetch a single market by ID
 */
export function useMarket(id: string | null) {
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMarket = useCallback(async () => {
    if (!id) {
      setMarket(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await fetchMarket(id);
      setMarket(data);
    } catch (err) {
      setError(formatApiError(err));
      setMarket(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  const refetch = useCallback(() => {
    loadMarket();
  }, [loadMarket]);

  return { market, loading, error, refetch };
}

/**
 * Hook for searching markets
 */
export function useMarketSearch() {
  const [results, setResults] = useState<Market[]>([]);
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
      const data = await searchMarkets(query);
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

/**
 * Hook to fetch network statistics
 */
export function useNetworkStats() {
  const [stats, setStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchNetworkStats();
      setStats(data);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const refetch = useCallback(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, refetch };
}

