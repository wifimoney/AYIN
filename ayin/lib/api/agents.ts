/**
 * API functions for agent-related operations
 * All functions are typed and handle errors appropriately
 */

import type { Agent, ApiResponse, PaginatedResponse } from '../types';
import { formatApiError, AppError } from '../utils/errors';

const API_BASE = '/api';

/**
 * Fetch all agents with optional pagination
 */
export async function fetchAgents(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<Agent[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.status) searchParams.set('status', params.status);

    const url = `${API_BASE}/agents${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<Agent[]> = await response.json();

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
 * Fetch a single agent by ID
 */
export async function fetchAgent(id: string): Promise<Agent> {
  try {
    const response = await fetch(`${API_BASE}/agents/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError('AGENT_NOT_FOUND');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<Agent> = await response.json();

    if (!data.success || !data.data) {
      throw new AppError(data.error || 'AGENT_NOT_FOUND');
    }

    return data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FETCH_FAILED', formatApiError(error));
  }
}

/**
 * Search agents by name or type
 */
export async function searchAgents(query: string): Promise<Agent[]> {
  try {
    const response = await fetch(
      `${API_BASE}/agents?search=${encodeURIComponent(query)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<Agent[]> = await response.json();

    if (!data.success || !data.data) {
      throw new AppError(data.error || 'FETCH_FAILED');
    }

    return data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('FETCH_FAILED', formatApiError(error));
  }
}

