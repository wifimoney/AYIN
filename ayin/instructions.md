# AYIN Protocol — Developer Instructions

> **Autonomous Yield & Intelligence Network**  
> A Base-native delegation platform for AI trading agents using ERC-8004 compliant smart contracts.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Coding Standards](#4-coding-standards)
5. [User Stories](#5-user-stories)
6. [APIs and Integrations](#6-apis-and-integrations)

---

## 1. Overview

### Project Goals

AYIN is a **prediction market delegation platform** built on Base that enables users to delegate trading authority to autonomous AI agents. The platform solves the trust problem in agent-based trading by:

- **Non-custodial delegation**: Users retain full custody of their assets while granting limited trading permissions to agents
- **Policy-based constraints**: Smart contracts enforce delegation policies (max trade size, allowed markets, expiry time)
- **Verifiable agents**: ERC-8004 compliant agent registry provides on-chain identity and attribution
- **Transparent execution**: All agent actions are logged and verifiable on-chain via BaseScan

### Core Functionality

| Feature | Description |
|---------|-------------|
| **Agent Discovery** | Browse verified AI trading agents with reputation scores, win rates, and risk profiles |
| **Delegation Creation** | Create on-chain mandates that authorize agents to trade on your behalf |
| **Policy Enforcement** | Smart contracts enforce constraints (max trade size, market whitelist, expiry) |
| **Delegation Revocation** | Instantly revoke agent permissions at any time |
| **Activity Monitoring** | Real-time feed of agent actions across the network |
| **Market Intelligence** | Integration with Polymarket for signal intelligence |

### Key Principles

1. **No Custody** — Users never transfer assets; agents operate within policy constraints
2. **Verifiable** — All agents are registered on-chain with ERC-8004 compliance
3. **Composable** — Built as a Base primitive, embeddable in other applications
4. **Gasless UX** — Paymaster support for sponsored transactions

---

## 2. Tech Stack

### Frontend Framework

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | `^16.1.1-canary.5` | React framework with App Router |
| **React** | `^19.0.0` | UI library |
| **TypeScript** | `^5` | Type-safe JavaScript |

### Web3 Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **@coinbase/onchainkit** | `^1.1.2` | Coinbase wallet components, transaction handling |
| **wagmi** | `^2.19.5` | React hooks for Ethereum |
| **viem** | `^2.43.3` | TypeScript Ethereum library |
| **@tanstack/react-query** | `^5.90.12` | Server state management |

### Base Account & Smart Accounts

| Technology | Version | Purpose |
|------------|---------|---------|
| **@base-org/account** | `^2.5.1` | Base smart account integration |
| **@base-org/account-ui** | `^1.0.1` | UI components for Base accounts |
| **@coinbase/cdp-sdk** | `^1.40.1` | Coinbase Developer Platform SDK |

### Farcaster Integration

| Technology | Version | Purpose |
|------------|---------|---------|
| **@farcaster/miniapp-sdk** | `^0.2.1` | Farcaster Mini App SDK |
| **@farcaster/miniapp-wagmi-connector** | `^1.1.0` | Wagmi connector for Farcaster |
| **@farcaster/frame-sdk** | `^0.1.12` | Frame SDK for embedding |
| **@farcaster/quick-auth** | `^0.0.8` | Quick authentication |

### UI Components

| Technology | Version | Purpose |
|------------|---------|---------|
| **Radix UI** | Various `1.x/2.x` | Accessible, unstyled primitives |
| **Tailwind CSS** | `^3.4.1` | Utility-first CSS framework |
| **Lucide React** | `0.487.0` | Icon library |
| **Motion** | `12.23.24` | Animation library |
| **class-variance-authority** | `0.7.1` | Component variant management |
| **clsx** | `2.1.1` | Conditional class names |
| **tailwind-merge** | `3.2.0` | Merge Tailwind classes safely |

### Observability

| Technology | Version | Purpose |
|------------|---------|---------|
| **@sentry/nextjs** | `^10.31.0` | Error tracking and monitoring |

### Smart Contracts (Foundry)

| Technology | Purpose |
|------------|---------|
| **Solidity** | `^0.8.0` |
| **Foundry** | Smart contract toolchain |
| **forge-std** | Testing framework |

### Networks

| Network | Chain ID | Status |
|---------|----------|--------|
| **Base Sepolia** | `84532` | ✅ Deployed & Active |
| **Base Mainnet** | `8453` | ❌ Pending |

---

## 3. Project Structure

```
ayin/
├── app/                          # Next.js App Router
│   ├── api/                      # API Routes
│   │   ├── agents/               # Agent endpoints
│   │   │   ├── route.ts          # GET /api/agents
│   │   │   └── [id]/route.ts     # GET /api/agents/:id
│   │   ├── delegations/          # Delegation management
│   │   │   ├── route.ts          # GET/POST /api/delegations
│   │   │   └── [id]/route.ts     # GET/DELETE /api/delegations/:id
│   │   ├── markets/              # Market data
│   │   ├── stats/                # Network statistics
│   │   ├── agent-actions/        # Agent action logs
│   │   ├── auth/                 # Authentication
│   │   │   ├── session/route.ts  # Session management
│   │   │   └── auto-auth.tsx     # Auto-authentication component
│   │   └── frame/                # Farcaster frame handling
│   ├── components/               # React components
│   │   ├── HomePage.tsx          # Main application page
│   │   ├── AgentCard.tsx         # Agent display card
│   │   ├── DelegationModal.tsx   # Delegation creation modal
│   │   ├── ActiveDelegation.tsx  # Current delegation display
│   │   ├── ActivityFeed.tsx      # Network activity feed
│   │   ├── MarketFeed.tsx        # Market intelligence
│   │   ├── WalletButton.tsx      # Wallet connection
│   │   ├── Header.tsx            # Navigation header
│   │   ├── ThemeToggle.tsx       # Dark/light mode toggle
│   │   ├── AyinLogo.tsx          # Brand logo component
│   │   ├── auth/                 # Authentication components
│   │   └── ui/                   # Shadcn/Radix UI components (48 files)
│   ├── globals.css               # Global styles & CSS variables
│   ├── layout.tsx                # Root layout with providers
│   ├── page.tsx                  # Entry point
│   ├── providers.tsx             # Context providers
│   ├── rootProvider.tsx          # Wagmi/OnchainKit/Theme providers
│   ├── wagmi.ts                  # Wagmi configuration
│   └── global-error.tsx          # Error boundary
├── lib/                          # Shared utilities
│   ├── api/                      # API client functions
│   │   ├── agents.ts             # Agent API calls
│   │   ├── delegations.ts        # Delegation API calls
│   │   ├── markets.ts            # Market API calls
│   │   └── index.ts              # Exports
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAgents.ts          # Agent data fetching
│   │   ├── useMarkets.ts         # Market data fetching
│   │   ├── useDelegations.ts     # Delegation management
│   │   ├── useDelegationPolicy.ts# Contract interaction hook
│   │   ├── useOnchainAgent.ts    # On-chain agent data
│   │   ├── useAgentActions.ts    # Agent action fetching
│   │   ├── useAuth.ts            # Authentication hook
│   │   └── index.ts              # Exports
│   ├── types/                    # TypeScript types
│   │   └── index.ts              # Domain types (Agent, Market, Delegation, etc.)
│   ├── utils/                    # Utility functions
│   ├── contracts.ts              # Contract addresses and ABIs
│   ├── config.ts                 # Configuration (Paymaster URL, etc.)
│   └── x402.ts                   # x402 payment protocol integration
├── contracts/                    # Smart contracts (Foundry)
│   ├── src/                      # Contract source code
│   │   ├── AgentRegistry.sol     # ERC-8004 agent identity registry
│   │   ├── DelegationPolicy.sol  # Mandate creation and enforcement
│   │   ├── PredictionMarket.sol  # Prediction market contract
│   │   ├── AyinSmartAccount.sol  # Smart account implementation
│   │   └── IAgentRegistry.sol    # Interface definition
│   ├── script/                   # Deployment scripts
│   ├── test/                     # Contract tests
│   ├── DEPLOYMENT.md             # Deployment instructions
│   └── QUICK_START.md            # Quick start guide
├── public/                       # Static assets
├── tailwind.config.ts            # Tailwind configuration
├── next.config.ts                # Next.js configuration with Sentry
├── tsconfig.json                 # TypeScript configuration
├── eslint.config.mjs             # ESLint flat config
├── postcss.config.mjs            # PostCSS configuration
└── package.json                  # Dependencies
```

### Key Directories Explained

| Directory | Purpose |
|-----------|---------|
| `app/api/` | Next.js Route Handlers — server-side API endpoints |
| `app/components/` | Feature components — domain-specific UI |
| `app/components/ui/` | Base UI primitives — Shadcn/Radix components |
| `lib/hooks/` | Custom hooks — data fetching, contract interactions |
| `lib/types/` | TypeScript interfaces — domain models |
| `lib/api/` | API client — wrapper functions for fetch calls |
| `contracts/src/` | Solidity contracts — on-chain logic |

---

## 4. Coding Standards

### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "strict": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Path Aliases

Use `@/` prefix for all imports from the project root:

```typescript
// ✅ Correct
import { useAgents } from '@/lib/hooks';
import { Agent } from '@/lib/types';
import { Button } from '@/app/components/ui/button';

// ❌ Avoid relative imports for cross-directory references
import { useAgents } from '../../lib/hooks';
```

### ESLint Rules

The project uses Next.js recommended rules with flat config:

```javascript
// eslint.config.mjs
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
];
```

### Component Patterns

#### 1. Client Components

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAgents } from '@/lib/hooks';

export function AgentList() {
  const { agents, loading, error } = useAgents();
  
  if (loading) return <Skeleton />;
  if (error) return <ErrorState error={error} />;
  if (!agents.length) return <EmptyState />;
  
  return (/* ... */);
}
```

#### 2. Server Components (API Routes)

```typescript
// app/api/agents/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const agents = await fetchAgents();
  return NextResponse.json(agents);
}
```

#### 3. Custom Hooks Pattern

```typescript
// lib/hooks/useAgents.ts
export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { agents, loading, error };
}
```

### Styling Conventions

#### CSS Variables

The project uses CSS custom properties for theming:

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --base-blue: #0052FF;
  --base-blue-glow: rgba(0, 82, 255, 0.19);
}

.dark {
  --background: 222 39% 4%;
  --bg-gradient-start: #05070A;
  --bg-gradient-mid: #0A0E16;
  --bg-gradient-end: #0E1420;
}
```

#### Tailwind Custom Classes

```css
/* Glass morphism cards */
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 1rem;
}

/* Base blue glow effects */
.glow-base {
  box-shadow: 0 0 12px rgba(0, 82, 255, 0.19);
}
```

#### Typography Hierarchy

```css
/* Labels: Small caps, wide tracking */
.text-[10px] tracking-[0.25em] uppercase font-bold text-[#0052FF]/70

/* Headings: Tight tracking, heavy weight */
.text-xl font-black tracking-tighter uppercase

/* Body: Standard Jakarta Sans */
.font-sans text-white/60
```

### Type Definitions

All domain types are centralized in `lib/types/index.ts`:

```typescript
export type AgentStatus = 'Active' | 'Paused' | 'Risk';
export type RiskLevel = 'Low' | 'Medium' | 'High';
export type DelegationStatus = 'pending' | 'active' | 'failed' | 'expired';

export interface Agent {
  id: string;
  name: string;
  type: string;
  reputation: number;
  status: AgentStatus;
  winRate: string;
  // ... ERC-8004 fields
  onchainId?: number;
  operator?: string;
  strategyHash?: string;
}
```

### Git Conventions

- **Branches**: `feature/`, `fix/`, `chore/` prefixes
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)
- **Excluded directories**: `contracts/`, `ayin-agent/`, `ayin-reputation/`, `ayin-x402-server/` (separate concerns)

---

## 5. User Stories

### US-1: Agent Discovery

> **As a** trader  
> **I want to** browse verified AI agents with their performance metrics  
> **So that** I can choose the best agent for my trading strategy

**Acceptance Criteria:**
- [ ] View list of agents with names, types, and avatars
- [ ] See reputation scores (0-100)
- [ ] See win rate and max drawdown percentages
- [ ] See assets under management (AUM)
- [ ] See risk level classification (Low/Medium/High)
- [ ] View ERC-8004 verification badge
- [ ] Empty state when no agents are available

**Implementation:** `app/components/AgentCard.tsx`, `lib/hooks/useAgents.ts`

---

### US-2: Delegation Creation

> **As a** user with connected wallet  
> **I want to** delegate trading authority to an agent  
> **So that** they can trade on my behalf within my constraints

**Acceptance Criteria:**
- [ ] Click "Delegate" on agent card to open modal
- [ ] Configure allocation amount (ETH)
- [ ] Set maximum trade size
- [ ] Select allowed markets (checkboxes)
- [ ] Set delegation duration/expiry
- [ ] Review non-custodial messaging before confirmation
- [ ] Sign transaction with paymaster sponsorship
- [ ] See transaction status (pending → success/error)
- [ ] Receive confirmation with BaseScan link

**Implementation:** `app/components/DelegationModal.tsx`, `lib/hooks/useDelegationPolicy.ts`

---

### US-3: Delegation Management

> **As a** user with active delegations  
> **I want to** view and revoke my delegations  
> **So that** I maintain control over my trading authority

**Acceptance Criteria:**
- [ ] See active delegation with agent name and constraints
- [ ] View remaining time until expiry
- [ ] See total allocation and risk parameters
- [ ] One-click revocation button
- [ ] Immediate on-chain revocation
- [ ] Confirmation of successful revocation

**Implementation:** `app/components/ActiveDelegation.tsx`, `lib/hooks/useDelegations.ts`

---

### US-4: Activity Monitoring

> **As a** network participant  
> **I want to** see agent activity across the network  
> **So that** I can monitor market movements and agent performance

**Acceptance Criteria:**
- [ ] Real-time activity feed
- [ ] Show agent name and ID for each action
- [ ] Show action type (buy/sell/adjust/stop-loss)
- [ ] Show target market
- [ ] Link to transaction on BaseScan
- [ ] Timestamp formatting

**Implementation:** `app/components/ActivityFeed.tsx`, `lib/hooks/useAgentActions.ts`

---

### US-5: Market Intelligence

> **As a** trader  
> **I want to** see prediction market signals  
> **So that** I can make informed delegation decisions

**Acceptance Criteria:**
- [ ] Display top markets from Polymarket
- [ ] Show market title and probability
- [ ] Show confidence score
- [ ] Show trading volume
- [ ] Category tags (Crypto/Politics/Sports)

**Implementation:** `app/components/MarketFeed.tsx`, `lib/hooks/useMarkets.ts`

---

### US-6: Wallet Connection

> **As a** user  
> **I want to** connect my wallet seamlessly  
> **So that** I can interact with the platform

**Acceptance Criteria:**
- [ ] Connect via Coinbase Smart Wallet
- [ ] Connect via MetaMask
- [ ] Connect via WalletConnect (if configured)
- [ ] Connect via Farcaster Mini App context
- [ ] Show connected address/ENS
- [ ] Disconnect option

**Implementation:** `app/components/WalletButton.tsx`, `app/rootProvider.tsx`

---

## 6. APIs and Integrations

### Internal API Routes

All API routes are defined in `app/api/` using Next.js Route Handlers.

#### `GET /api/agents`

Returns list of all registered agents with ERC-8004 metadata.

```typescript
// Response
{
  "agents": [
    {
      "id": "1",
      "name": "Sentinel Alpha",
      "type": "Trend Following",
      "reputation": 92,
      "status": "Active",
      "winRate": "67%",
      "drawdown": "8.2%",
      "aum": "$2.4M",
      "risk": "Medium",
      "onchainId": 1,
      "operator": "0x...",
      "strategyHash": "0x...",
      "registeredAt": 1735000000,
      "verifiedOnchain": true
    }
  ]
}
```

#### `GET /api/agents/:id`

Returns single agent by ID.

```typescript
// Response
{
  "agent": { /* Agent object */ }
}
```

#### `GET /api/markets`

Returns available prediction markets.

```typescript
// Response
{
  "markets": [
    {
      "id": "btc-100k",
      "title": "Will Bitcoin reach $100K?",
      "volume": "$12.4M",
      "probability": 72,
      "confidence": 85,
      "endDate": "2025-03-31",
      "category": "Crypto",
      "address": "0x..."
    }
  ]
}
```

#### `GET /api/delegations`

Returns user's delegations (requires authentication).

```typescript
// Response
{
  "delegations": [
    {
      "id": "d1",
      "agentId": "1",
      "agentName": "Sentinel Alpha",
      "status": "active",
      "constraints": {
        "allocation": 1.5,
        "maxDrawdown": 15,
        "maxPosition": 0.5,
        "duration": 7
      },
      "createdAt": "2025-12-20T10:00:00Z",
      "expiresAt": "2025-12-27T10:00:00Z"
    }
  ]
}
```

#### `POST /api/delegations`

Creates a new delegation.

```typescript
// Request Body
{
  "agentId": "1",
  "allocation": 1.5,
  "duration": 7,
  "maxDrawdown": 15,
  "maxPosition": 0.5,
  "deltaNeutral": false,
  "stopLoss": true,
  "approvedMarkets": ["btc-100k", "eth-5k"]
}

// Response
{
  "success": true,
  "delegationId": "d123"
}
```

#### `DELETE /api/delegations/:id`

Revokes a delegation.

```typescript
// Response
{
  "success": true,
  "message": "Delegation revoked"
}
```

#### `GET /api/stats`

Returns network statistics.

```typescript
// Response
{
  "activeAgents": 12,
  "totalValueLocked": "$4.2M",
  "volume24h": "$890K"
}
```

#### `GET /api/agent-actions`

Returns recent agent actions.

```typescript
// Response
{
  "actions": [
    {
      "id": "a1",
      "agentId": "1",
      "agentName": "Sentinel Alpha",
      "type": "buy",
      "action": "Market Buy",
      "market": "BTC/USD",
      "timestamp": "2025-12-26T12:00:00Z",
      "txHash": "0x..."
    }
  ]
}
```

---

### Smart Contract Integration

#### Contract Addresses

Defined in `lib/contracts.ts`:

```typescript
// Base Sepolia (Testing)
export const CONTRACTS_BASE_SEPOLIA = {
  AgentRegistry: '0xD585649d1d8170B72b9A332bE9E0aA03e056c61f',
  DelegationPolicy: '0xF7A24BFE63904DAa1d3Ea1020Bc356FDb1adb3DE',
  AyinSmartAccount: '0xeFdfaA65c2dB1099D9fE168FBc7B4f90266f076E',
  PredictionMarket: '0x6056a0bAA7d6BD6c0aA27feee847C11fb5eb5BD9',
};

// Base Mainnet (Production) - Pending deployment
export const CONTRACTS_BASE_MAINNET = {
  AgentRegistry: '0x0000000000000000000000000000000000000000',
  DelegationPolicy: '0x0000000000000000000000000000000000000000',
  AyinSmartAccount: '0x0000000000000000000000000000000000000000',
  PredictionMarket: '0x0000000000000000000000000000000000000000',
};
```

#### Contract ABIs

```typescript
export const ABIS = {
  DELEGATION: [
    {
      name: 'createMandate',
      type: 'function',
      inputs: [
        { name: '_agent', type: 'address' },
        { name: '_maxTradeSize', type: 'uint256' },
        { name: '_allowedMarkets', type: 'address[]' },
        { name: '_expiryTime', type: 'uint256' },
      ],
      outputs: [{ name: 'mandateId', type: 'uint256' }],
      stateMutability: 'nonpayable',
    },
  ],
  MARKET: [
    {
      name: 'placeBet',
      type: 'function',
      inputs: [
        { name: 'marketId', type: 'uint256' },
        { name: 'outcome', type: 'bool' },
        { name: 'amount', type: 'uint256' },
      ],
      stateMutability: 'payable',
    },
  ],
};
```

#### Contract Interaction Hook

```typescript
// lib/hooks/useDelegationPolicy.ts

export interface CreateMandateParams {
  agentAddress: string;
  maxTradeSize: string; // In ETH
  allowedMarkets: string[]; // Market addresses
  expiryTimestamp: number; // Unix timestamp
}

export function useDelegationPolicy() {
  const { address } = useAccount();

  const createMandate = useCallback(
    async (params: CreateMandateParams) => {
      // Encode + execute transaction via OnchainKit
    },
    [address]
  );

  const revokeMandate = useCallback(
    async (agentAddress: string) => {
      // Call DelegationPolicy.revokeAgent()
    },
    [address]
  );

  return { createMandate, revokeMandate };
}
```

---

### External Integrations

#### 1. Coinbase OnchainKit

**Purpose:** Wallet connection, transaction handling, identity resolution

```typescript
// app/rootProvider.tsx
import { OnchainKitProvider } from "@coinbase/onchainkit";

<OnchainKitProvider
  apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
  chain={selectedChain}
  miniKit={{ enabled: true }}
  config={{
    appearance: { mode: 'dark', theme: 'base' },
    wallet: { display: 'modal' },
    paymaster: process.env.NEXT_PUBLIC_PAYMASTER_URL,
  }}
>
```

#### 2. Coinbase Paymaster

**Purpose:** Gasless transactions for improved UX

```typescript
// lib/config.ts
export const DEFAULT_PAYMASTER_URL = 
  'https://api.developer.coinbase.com/rpc/v1/base-sepolia/...';
```

#### 3. Farcaster Mini App

**Purpose:** Embedding in Farcaster frames, social authentication

```typescript
// app/rootProvider.tsx
import { farcasterFrame } from "@farcaster/miniapp-wagmi-connector";

const connectors = [
  farcasterFrame(),
  injected(),
  metaMask(),
];
```

**Frame Metadata:**

```typescript
// app/layout.tsx
export const metadata = {
  other: {
    'fc:frame': JSON.stringify({
      version: "next",
      imageUrl: "https://ayin.app/icon.png",
      button: {
        title: "Launch Ayin",
        action: {
          type: "launch_frame",
          name: "Ayin",
          url: "https://ayin.app",
        },
      },
    }),
  },
};
```

#### 4. Sentry

**Purpose:** Error tracking and performance monitoring

```typescript
// next.config.ts
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  org: "0xguard",
  project: "ayin",
  tunnelRoute: "/monitoring",
});
```

#### 5. BaseScan

**Purpose:** Block explorer for transaction verification

Links are constructed as:

```typescript
const baseUrl = chainId === 84532 
  ? 'https://sepolia.basescan.org' 
  : 'https://basescan.org';

const txLink = `${baseUrl}/tx/${txHash}`;
const addressLink = `${baseUrl}/address/${address}`;
```

---

### Environment Variables

Create `.env.local` in the project root:

```env
# Chain Configuration
NEXT_PUBLIC_CHAIN_ID=84532  # 84532 = Base Sepolia, 8453 = Base Mainnet

# RPC Configuration
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# WalletConnect (Optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# OnchainKit API Key (Optional but recommended)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key

# Paymaster URL (Optional - for gasless transactions)
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base-sepolia/...

# Sentry (for error tracking)
SENTRY_AUTH_TOKEN=your_sentry_auth_token
```

---

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env.local

# 3. Start development server
pnpm run dev

# 4. Open in browser
open http://localhost:3000
```

---

## Contract Deployment

See `contracts/DEPLOYMENT.md` for full instructions.

```bash
cd contracts

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

---

## Related Documentation

- [OnchainKit Docs](https://docs.base.org/onchainkit)
- [Wagmi Documentation](https://wagmi.sh)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Base Network](https://docs.base.org)
- [Farcaster Mini Apps](https://docs.farcaster.xyz/developers/frames/v2/getting-started)

---

*Last Updated: December 2025*
