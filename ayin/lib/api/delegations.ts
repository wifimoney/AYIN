/**
 * API functions for delegation-related operations
 * All functions are typed and handle errors appropriately
 */

import type { Delegation, DelegationIntent, ApiResponse } from '../types';
import { formatApiError, AppError } from '../utils/errors';

const API_BASE = '/api';

/**
 * Fetch all delegations for the current user
 */
export async function fetchDelegations(params?: {
  status?: string;
}): Promise<Delegation[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);

    const url = `${API_BASE}/delegations${searchParams.toString() ? `?${searchParams}` : ''}`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new AppError('UNAUTHORIZED');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<Delegation[]> = await response.json();

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
 * Fetch a single delegation by ID
 */
export async function fetchDelegation(id: string): Promise<Delegation> {
  try {
    const response = await fetch(`${API_BASE}/delegations/${id}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new AppError('DELEGATION_NOT_FOUND');
      }
      if (response.status === 401) {
        throw new AppError('UNAUTHORIZED');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'FETCH_FAILED', errorData.message);
    }

    const data: ApiResponse<Delegation> = await response.json();

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
 * Create a new delegation intent
 * The backend handles validation, signing, and on-chain execution
 */
export async function createDelegation(
  intent: DelegationIntent
): Promise<Delegation> {
  try {
    // Validate intent before sending
    validateDelegationIntent(intent);

    const response = await fetch(`${API_BASE}/delegations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(intent),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AppError('UNAUTHORIZED');
      }
      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        throw new AppError(
          errorData.code || 'CONSTRAINTS_INVALID',
          errorData.message
        );
      }
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'TRANSACTION_FAILED', errorData.message);
    }

    const data: ApiResponse<Delegation> = await response.json();

    if (!data.success || !data.data) {
      throw new AppError(data.error || 'TRANSACTION_FAILED');
    }

    return data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('TRANSACTION_FAILED', formatApiError(error));
  }
}

/**
 * Cancel an active delegation
 */
export async function cancelDelegation(id: string): Promise<Delegation> {
  try {
    const response = await fetch(`${API_BASE}/delegations/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new AppError('UNAUTHORIZED');
      }
      if (response.status === 404) {
        throw new AppError('DELEGATION_NOT_FOUND');
      }
      const errorData = await response.json().catch(() => ({}));
      throw new AppError(errorData.code || 'TRANSACTION_FAILED', errorData.message);
    }

    const data: ApiResponse<Delegation> = await response.json();

    if (!data.success || !data.data) {
      throw new AppError(data.error || 'TRANSACTION_FAILED');
    }

    return data.data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('TRANSACTION_FAILED', formatApiError(error));
  }
}

/**
 * Validate delegation intent before submission
 */
function validateDelegationIntent(intent: DelegationIntent): void {
  if (!intent.agentId) {
    throw new AppError('VALIDATION_ERROR', 'Agent ID is required');
  }

  if (intent.allocation <= 0) {
    throw new AppError('VALIDATION_ERROR', 'Allocation must be greater than 0');
  }

  if (intent.duration < 1) {
    throw new AppError('DURATION_TOO_SHORT');
  }

  if (intent.duration > 365) {
    throw new AppError('DURATION_TOO_LONG');
  }

  if (intent.maxDrawdown < 1 || intent.maxDrawdown > 100) {
    throw new AppError('VALIDATION_ERROR', 'Max drawdown must be between 1% and 100%');
  }

  if (intent.maxPosition < 1 || intent.maxPosition > 100) {
    throw new AppError('VALIDATION_ERROR', 'Max position must be between 1% and 100%');
  }
}

