# AYIN Phase 1: Persistence Implementation

This document covers the implementation of Phase 1 from the technical audit, which addresses the "immediate fixes" required to move from hackathon-grade to production-ready.

## Overview

Phase 1 addresses four critical issues:

| # | Issue | Solution |
|---|-------|----------|
| 1 | Mock Database | PostgreSQL via Prisma |
| 2 | Mock x402 Payments | Signature verification |
| 3 | In-Memory State | Redis for sessions/nonces |
| 4 | Disconnected Agent | HTTP service integration |

## Setup Guide

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 7+
- pnpm 8+

### 1. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env.local
```

Configure the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ayin?schema=public"

# Redis
REDIS_URL="redis://localhost:6379"

# Agent Service
AGENT_SERVICE_URL="http://localhost:3001"
AGENT_SERVICE_TOKEN="your-secure-token"

# Auth
JWT_SECRET="your-production-secret-min-32-chars"
```

### 2. Database Setup

Generate Prisma client:

```bash
pnpm db:generate
```

Push schema to database (development):

```bash
pnpm db:push
```

Or create migrations (production):

```bash
pnpm db:migrate
```

Seed initial data:

```bash
pnpm db:seed
```

### 3. Start Services

Start all services in development:

```bash
# Terminal 1: Next.js App
pnpm dev

# Terminal 2: Agent Service
pnpm dev:agent

# Terminal 3: x402 Server
pnpm dev:x402
```

## Architecture Changes

### Data Layer (`lib/data/`)

The data layer has been refactored from in-memory mocks to Prisma repositories:

```
lib/data/
├── index.ts          # Central exports
├── agents.ts         # Agent repository (Prisma)
├── delegations.ts    # Delegation repository (Prisma)
├── users.ts          # User repository (Prisma)
├── mock-agents.ts    # Kept for seeding only
└── mock-delegations.ts  # Deprecated
```

**Key Changes:**
- All functions are now `async` and return Promises
- User tracking for delegations
- Proper TypeScript types from Prisma

### Database Schema (`prisma/schema.prisma`)

New models:
- `User` - User profiles with wallet/Farcaster integration
- `Session` - Database-backed sessions
- `Agent` - Agent registry with onchain data
- `Delegation` - User-agent delegation relationships
- `AgentAction` - Audit trail for agent actions
- `PaymentChallenge` - x402 payment challenges
- `PaymentLog` - Payment verification logs

### Redis Integration (`lib/redis/`)

Redis is used for:
- Session caching (fast access)
- Payment challenge nonces (TTL-based expiry)
- Rate limiting
- General caching

### Agent Service Client (`lib/api/agent-service.ts`)

New module for communicating with the agent service:
- `notifyAgentService()` - Notify agent of new delegation
- `checkAgentServiceHealth()` - Health check
- `cancelDelegationViaAgent()` - Cancel delegation
- `getDelegationStatusFromAgent()` - Get status

### Callback Endpoint (`app/api/delegations/[id]/callback/route.ts`)

New endpoint for agent service to report delegation status:
- POST `/api/delegations/:id/callback`
- Service-to-service authentication via `X-Service-Token`

## x402 Server Security (Phase 1.2)

The x402 server now includes signature verification:

### `ayin-x402-server/src/providers/signature-provider.ts`

- EIP-712 typed data signature verification
- Replay attack protection via nonce tracking
- Trusted signer allowlist
- Redis-backed variant for production

### `ayin-x402-server/src/redis-store.ts`

Redis store for x402 server:
- Payment challenge storage with TTL
- Usage log storage
- Rate limiting per agent
- Nonce tracking for replay protection

## API Changes

### Breaking Changes

1. **Data functions are async** - All `getAgents()`, `getDelegations()`, etc. now return Promises
2. **User context required** - Delegations are now tied to users
3. **Callback-based activation** - Delegations activate via callback, not setTimeout

### New Endpoints

- `POST /api/delegations/:id/callback` - Agent service callback

## Scripts

```bash
pnpm db:generate     # Generate Prisma client
pnpm db:push         # Push schema (dev)
pnpm db:migrate      # Create migration (prod)
pnpm db:migrate:prod # Apply migrations (prod)
pnpm db:seed         # Seed database
pnpm db:studio       # Open Prisma Studio
pnpm db:reset        # Reset database
```

## Next Steps (Phase 2)

After Phase 1 is complete, proceed to Phase 2:

1. **Smart Contract Integration** - Deploy ERC-8004 Service Manager
2. **Agent Guardrails** - Implement RiskEngine with hard limits
3. **Execution Logic** - Uncomment and implement `executeTrade()`
4. **Smart Wallet** - Use Coinbase Smart Wallet for agent operations

## Testing

Run TypeScript checks:

```bash
pnpm exec tsc --noEmit
```

Build the application:

```bash
pnpm build
```

## Troubleshooting

### "Cannot find module '../generated/prisma'"

Run `pnpm db:generate` to generate the Prisma client.

### Database connection issues

Verify `DATABASE_URL` is set correctly and PostgreSQL is running.

### Redis connection issues

Verify `REDIS_URL` is set correctly and Redis is running.

## File Structure

```
ayin/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Seeding script
│   └── migrations/        # Migration files
├── lib/
│   ├── db/
│   │   └── index.ts       # Prisma client singleton
│   ├── redis/
│   │   └── index.ts       # Redis client singleton
│   ├── data/
│   │   ├── agents.ts      # Agent repository
│   │   ├── delegations.ts # Delegation repository
│   │   └── users.ts       # User repository
│   └── api/
│       └── agent-service.ts # Agent service client
├── app/api/
│   ├── agents/
│   ├── delegations/
│   │   └── [id]/
│   │       └── callback/  # NEW: Agent callback
│   └── ...
└── ayin-x402-server/
    └── src/
        ├── providers/
        │   └── signature-provider.ts  # NEW: Signature verification
        └── redis-store.ts             # NEW: Redis store
```
