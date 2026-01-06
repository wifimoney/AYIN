# Phase 3: GTM & Scalability Plan

## Objective
Transition the AYIN Agent from a synchronous, single-process runtime to a scalable, distributed system capable of high-frequency trading and high availability.

## Tasks

### 3.1. Asynchronous Job Processing (BullMQ)
- **Goal**: Decouple signal ingestion from trade execution.
- **Why**: Prevents blocking operations, handles retries gracefully, and allows scaling worker nodes.
- **Implementation**:
  - Install `bullmq`.
  - Create `SignalQueue` for incoming market opportunities.
  - Create `ExecutionWorker` to process signals with `RiskEngine` constraints.
  - Integration with existing Redis instance.

### 3.2. Trusted Execution (TEE) Preparation
- **Goal**: Ensure the `RiskEngine` decisions are verifiable.
- **Why**: Users need proof that the agent (and its risk inputs) wasn't tampered with.
- **Implementation**:
  - Create `AttestationService`.
  - Sign `RiskAssessment` results with a dedicated key (simulating TEE private key).
  - Attach signatures to on-chain transactions (as calldata or separate IPFS log).

### 3.3. Production Infrastructure
- **Goal**: Containerize for deployment.
- **Why**: Consistent environments across dev, staging, and prod.
- **Implementation**:
  - `Dockerfile` for `ayin-agent` (optimized multi-stage build).
  - `Dockerfile` for `web` (Next.js).
  - `docker-compose.prod.yml` with health checks and restart policies.

## Execution Order
1. **BullMQ Integration** (Architecture change)
2. **Attestation Service** (Security feature)
3. **Dockerization** (Deployment readiness)
