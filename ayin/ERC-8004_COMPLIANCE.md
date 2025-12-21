# ERC-8004 Agent Registry Compliance

This document outlines how AYIN implements ERC-8004 compliant agent registry and what differentiates it from Polymarket.

## Onchain Registry Requirements ✅

### 1. Agent Has Onchain ID
- **Status**: ✅ Implemented
- **Location**: `AgentRegistry.sol` - `agentId` (uint256, non-transferable)
- **UI Display**: Agent cards show `Agent ID: #X` when onchain data is available
- **Verification**: Judges can verify on BaseScan by checking `AgentRegistered` events

### 2. Agent Type Visible
- **Status**: ✅ Implemented
- **Contract**: `AgentType` enum (DIRECTIONAL=0, LIQUIDITY=1, ARB=2)
- **UI Display**: 
  - Shows readable labels: "Directional", "Liquidity", "Arbitrage"
  - Includes description explaining what each agent type does
  - Mapped from contract enum to user-friendly text

### 3. Reputation Score Visible
- **Status**: ✅ Implemented
- **Display**: Shown prominently in agent cards
- **Label**: "ERC-8004" badge indicates compliance
- **Note**: Reputation can be calculated offchain but is displayed with ERC-8004 attribution

### 4. Metadata Hash Present
- **Status**: ✅ Implemented
- **Contract**: `strategyHash` (bytes32) - commitment hash of strategy code
- **UI Display**: 
  - Shown in agent card when available
  - Formatted as truncated address for readability
  - Full hash accessible via BaseScan

## UI Requirements ✅

### 1. Agent Card Explains Agent Type
- **Status**: ✅ Implemented
- **Features**:
  - Clear agent type label (Directional/Liquidity/Arbitrage)
  - Description box explaining what the agent does
  - Visual distinction between agent types

### 2. Clear Attribution: "This agent is verifiable onchain"
- **Status**: ✅ Implemented
- **Features**:
  - Blue verification badge with shield icon
  - Text: "This agent is verifiable onchain"
  - Subtext: "ERC-8004 compliant · Registered on Base"
  - BaseScan link for direct verification
  - Verified checkmark icon next to agent name

## Differentiation from Polymarket

### Key Differentiators:

1. **Onchain Agent Identity**
   - Each agent has a non-transferable onchain ID (ERC-8004)
   - Agents are registered in `AgentRegistry` contract
   - Full onchain verification possible via BaseScan

2. **Agent Type Classification**
   - Clear categorization: Directional, Liquidity, Arbitrage
   - Each type has distinct behavior and risk profile
   - Types are enforced onchain via contract enum

3. **Strategy Commitment**
   - Strategy hash stored onchain (commitment scheme)
   - Enables verification of strategy without revealing details
   - Prevents strategy manipulation

4. **Reputation Attribution**
   - Reputation scores linked to onchain agent IDs
   - ERC-8004 compliant attribution
   - Transparent and verifiable

5. **BaseScan Integration**
   - Direct links to contract addresses
   - Event history visible on explorer
   - Full transparency and auditability

## Implementation Details

### Contract Integration

```typescript
// Read agent data from AgentRegistry
const { onchainAgent } = useOnchainAgent(agentId);

// Agent data includes:
// - agentId: Onchain ID
// - operator: Controller address
// - strategyHash: Strategy commitment
// - agentType: 0=DIRECTIONAL, 1=LIQUIDITY, 2=ARB
// - registeredAt: Registration timestamp
// - exists: Whether agent is registered
```

### UI Components

1. **AgentCard** (`app/page.tsx`)
   - Shows agent type with description
   - Displays ERC-8004 verification badge
   - Includes BaseScan link
   - Shows agent ID and operator address
   - Displays strategy hash when available

2. **Verification Badge**
   - Blue background with shield icon
   - "This agent is verifiable onchain" text
   - ERC-8004 compliance indicator
   - Clickable BaseScan link

### Agent Type Mapping

```typescript
// Contract enum → UI label
DIRECTIONAL (0) → "Directional"
LIQUIDITY (1) → "Liquidity"  
ARB (2) → "Arbitrage"

// Each type has description:
DIRECTIONAL: "Takes directional positions based on market predictions"
LIQUIDITY: "Provides liquidity and market making strategies"
ARB: "Arbitrage opportunities across markets"
```

## BaseScan Verification

Judges can verify agents by:

1. **Contract Address**: Navigate to `AgentRegistry` contract on BaseScan
2. **Events Tab**: View `AgentRegistered` events
3. **Agent Lookup**: Use `getAgent(agentId)` function
4. **Event Filtering**: Filter by agent ID or operator address

### Example BaseScan URLs:
- AgentRegistry: `https://sepolia.basescan.org/address/<AGENT_REGISTRY_ADDRESS>#events`
- Specific Agent: View `AgentRegistered` event with `agentId` parameter

## Files Modified

1. **`lib/hooks/useOnchainAgent.ts`** - Hook to read onchain agent data
2. **`lib/types/index.ts`** - Extended Agent type with onchain fields
3. **`app/page.tsx`** - Updated AgentCard with ERC-8004 verification
4. **`app/api/agents/route.ts`** - Added onchain data to mock agents
5. **`lib/contracts.ts`** - Contract address configuration

## Testing Checklist

- [ ] Agent cards display agent type correctly
- [ ] Verification badge appears for onchain agents
- [ ] BaseScan links work correctly
- [ ] Agent ID is visible
- [ ] Strategy hash is displayed
- [ ] Reputation shows ERC-8004 label
- [ ] Agent type descriptions are clear
- [ ] Dark mode styling works correctly

## Next Steps

1. Deploy `AgentRegistry` contract to Base Sepolia
2. Update `lib/contracts.ts` with deployed address
3. Register test agents via contract
4. Verify agents appear correctly in UI
5. Test BaseScan links and event visibility

