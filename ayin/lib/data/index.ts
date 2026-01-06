/**
 * Data Layer Exports
 * Phase 1: Persistence Implementation
 * 
 * Central export point for all data repositories.
 * Now using PostgreSQL via Prisma instead of in-memory mocks.
 * 
 * MIGRATION NOTICE:
 * - Functions are async now (they return Promises)
 * - Import from specific modules for type safety
 */

// ============================================
// AGENT EXPORTS
// ============================================
export {
    getAgents,
    getAgentById,
    getAgentByOnchainId,
    createAgent,
    updateAgentStatus,
    updateAgentReputation,
    verifyAgentOnchain,
    getAgentStats,
    type AgentFilters,
    type CreateAgentInput,
} from './agents';

// ============================================
// DELEGATION EXPORTS
// ============================================
export {
    getDelegations,
    getDelegationById,
    getDelegationsByUserId,
    hasActiveDelegation,
    createDelegation,
    updateDelegationStatus,
    activateDelegation,
    cancelDelegation,
    expireOldDelegations,
    getDelegationStats,
    type DelegationFilters,
    type CreateDelegationInput,
} from './delegations';

// ============================================
// USER EXPORTS
// ============================================
export {
    getUserById,
    getUserByWallet,
    getUserByFid,
    createOrUpdateUser,
    updateUserProfile,
    getUserStats,
    createSession,
    getSessionByToken,
    updateSessionActivity,
    deleteSession,
    deleteUserSessions,
    cleanupExpiredSessions,
    type UserProfile,
    type CreateUserInput,
    type SessionData,
} from './users';

// ============================================
// BACKWARDS COMPATIBILITY LAYER
// Keep mock data available for seeding/testing
// ============================================
export { MOCK_AGENTS } from './mock-agents';
