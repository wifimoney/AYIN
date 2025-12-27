/**
 * Data layer exports
 * Central export point for all mock data stores
 */

export { MOCK_AGENTS, getAgentById, getAgents } from './mock-agents';
export {
    getDelegations,
    getDelegationById,
    addDelegation,
    updateDelegationStatus,
    getDelegationIndex,
    hasActiveDelegation,
} from './mock-delegations';
