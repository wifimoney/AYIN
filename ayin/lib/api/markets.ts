/**
 * API functions for market-related operations
 * All functions are typed and handle errors appropriately
 */

import type { Market, ApiResponse, NetworkStats } from '../types';
import { formatApiError, AppError } from '../utils/errors';

const API_BASE = '/api';

/**
 * Fetch all markets with optional filtering
 */
export async function fetchMarkets(params?: {
  page?: number;
  limit?: number;
  category?: string;
}): Promise<Market[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.category) searchParams.set('category', params.category);

    const url = `${API_BASE}/markets${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<Market[]> = await response.json();

    if (!data.success || !data.data) {
      throw new AppError(data.error || 'FETCH_FAILED');
    }

    return data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FETCH_FAILED', formatApiError(error));
  }
}

/**
 * Fetch a single market by ID
 */
export async function fetchMarket(id: string): Promise<Market> {
  try {
    const response = await fetch(`${API_BASE}/markets/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError('MARKET_NOT_FOUND');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<Market> = await response.json();

    if (!data.success || !data.data) {
      throw new AppError(data.error || 'MARKET_NOT_FOUND');
    }

    return data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FETCH_FAILED', formatApiError(error));
  }
}

/**
 * Search markets by title
 */
export async function searchMarkets(query: string): Promise<Market[]> {
  try {
    const response = await fetch(
      `${API_BASE}/markets?search=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<Market[]> = await response.json();

    if (!data.success || !data.data) {
      throw new AppError(data.error || 'FETCH_FAILED');
    }

    return data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FETCH_FAILED', formatApiError(error));
  }
}

/**
 * Fetch network statistics
 */
export async function fetchNetworkStats(): Promise<NetworkStats> {
  try {
    const response = await fetch(`${API_BASE}/stats`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<NetworkStats> = await response.json();

    if (!data.success || !data.data) {
      throw new AppError(data.error || 'FETCH_FAILED');
    }

    return data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    // Return default stats on error
    return {
      activeAgents: 0,
      totalValueLocked: '$0',
      volume24h: '$0',
    };
  }
}

