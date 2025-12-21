/**
 * Error handling utilities for user-friendly error messages
 * Maps backend/RPC errors to readable UI messages
 */

// Common error codes from backend/blockchain
const ERROR_MESSAGES: Record<string, string> = {
  // Network errors
  'NETWORK_ERROR': 'Unable to connect to the server. Please check your connection.',
  'TIMEOUT': 'The request took too long. Please try again.',
  'FETCH_FAILED': 'Failed to load data. Please refresh the page.',
  
  // Authentication errors
  'UNAUTHORIZED': 'You need to connect your wallet to continue.',
  'FORBIDDEN': 'You do not have permission to perform this action.',
  'SESSION_EXPIRED': 'Your session has expired. Please reconnect your wallet.',
  
  // Delegation errors
  'INSUFFICIENT_FUNDS': 'You do not have enough funds for this delegation.',
  'ALLOCATION_TOO_HIGH': 'The allocation amount exceeds your available balance.',
  'AGENT_UNAVAILABLE': 'This agent is currently unavailable for delegation.',
  'DELEGATION_EXISTS': 'You already have an active delegation with this agent.',
  'CONSTRAINTS_INVALID': 'The specified constraints are not valid.',
  'DURATION_TOO_SHORT': 'Minimum delegation duration is 1 day.',
  'DURATION_TOO_LONG': 'Maximum delegation duration is 365 days.',
  
  // Agent errors
  'AGENT_NOT_FOUND': 'The requested agent could not be found.',
  'AGENT_PAUSED': 'This agent is currently paused and not accepting delegations.',
  'AGENT_AT_CAPACITY': 'This agent has reached its maximum capacity.',
  
  // Market errors
  'MARKET_NOT_FOUND': 'The requested market could not be found.',
  'MARKET_CLOSED': 'This market has already closed.',
  'MARKET_RESOLVED': 'This market has been resolved.',
  
  // Blockchain errors
  'TRANSACTION_FAILED': 'The transaction could not be completed. Please try again.',
  'GAS_ESTIMATION_FAILED': 'Unable to estimate gas for this transaction.',
  'NONCE_TOO_LOW': 'Transaction error. Please try again.',
  'REPLACEMENT_UNDERPRICED': 'Transaction fee too low. Please try again.',
  
  // Generic
  'UNKNOWN_ERROR': 'Something went wrong. Please try again later.',
  'VALIDATION_ERROR': 'Please check your input and try again.',
  'SERVER_ERROR': 'Server error. Our team has been notified.',
};

/**
 * Format an API error into a user-friendly message
 */
export function formatApiError(error: unknown): string {
  // Handle string errors
  if (typeof error === 'string') {
    return ERROR_MESSAGES[error] || error;
  }
  
  // Handle Error objects
  if (error instanceof Error) {
    // Check if it's a known error code
    const code = extractErrorCode(error.message);
    if (code && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }
    
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return ERROR_MESSAGES['NETWORK_ERROR'];
    }
    
    // Check for timeout
    if (error.message.includes('timeout') || error.message.includes('aborted')) {
      return ERROR_MESSAGES['TIMEOUT'];
    }
    
    // Return a sanitized version of the error message
    return sanitizeErrorMessage(error.message);
  }
  
  // Handle API response errors
  if (isApiError(error)) {
    const code = error.code || error.error;
    if (code && ERROR_MESSAGES[code]) {
      return ERROR_MESSAGES[code];
    }
    if (error.message) {
      return sanitizeErrorMessage(error.message);
    }
  }
  
  return ERROR_MESSAGES['UNKNOWN_ERROR'];
}

/**
 * Extract error code from error message
 */
function extractErrorCode(message: string): string | null {
  // Match patterns like "error code: SOME_CODE" or "[SOME_CODE]"
  const codeMatch = message.match(/\[([A-Z_]+)\]/) || 
                    message.match(/code[:\s]+([A-Z_]+)/i);
  return codeMatch ? codeMatch[1] : null;
}

/**
 * Sanitize error messages to remove technical details
 */
function sanitizeErrorMessage(message: string): string {
  // Remove hex addresses
  let sanitized = message.replace(/0x[a-fA-F0-9]{40}/g, '[address]');
  
  // Remove transaction hashes
  sanitized = sanitized.replace(/0x[a-fA-F0-9]{64}/g, '[tx]');
  
  // Remove stack traces
  sanitized = sanitized.split('\n')[0];
  
  // Truncate if too long
  if (sanitized.length > 150) {
    sanitized = sanitized.substring(0, 147) + '...';
  }
  
  return sanitized;
}

/**
 * Type guard for API error objects
 */
interface ApiErrorObject {
  code?: string;
  error?: string;
  message?: string;
}

function isApiError(error: unknown): error is ApiErrorObject {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('code' in error || 'error' in error || 'message' in error)
  );
}

/**
 * Create a typed error for throwing
 */
export class AppError extends Error {
  code: string;
  
  constructor(code: string, message?: string) {
    super(message || ERROR_MESSAGES[code] || ERROR_MESSAGES['UNKNOWN_ERROR']);
    this.code = code;
    this.name = 'AppError';
  }
}

/**
 * Check if an error should trigger a retry
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT', 'SERVER_ERROR'];
    const code = extractErrorCode(error.message);
    if (code && retryableCodes.includes(code)) {
      return true;
    }
    
    // Network-related errors
    if (error.message.includes('fetch') || 
        error.message.includes('network') ||
        error.message.includes('timeout')) {
      return true;
    }
  }
  
  return false;
}

