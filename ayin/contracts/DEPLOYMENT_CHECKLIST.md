# Deployment Checklist

Use this checklist to ensure all steps are completed before and after deployment.

## Pre-Deployment

- [ ] **Environment Setup**
  - [ ] Foundry installed (`foundryup`)
  - [ ] `.env` file created in `contracts/` directory
  - [ ] `PRIVATE_KEY` set in `.env` (deployer address has ETH for gas)
  - [ ] `BASESCAN_API_KEY` set in `.env` (for verification)

- [ ] **Network Access**
  - [ ] Base Sepolia RPC URL accessible
  - [ ] Deployer address funded with ETH on Base Sepolia
  - [ ] Test connection: `cast block-number --rpc-url https://sepolia.base.org`

- [ ] **Code Review**
  - [ ] All contracts compile successfully: `forge build`
  - [ ] All tests pass: `forge test`
  - [ ] Deployment script syntax correct

## Deployment

- [ ] **Deploy to Base Sepolia**
  ```bash
  cd contracts
  forge script script/Deploy.s.sol:DeployScript \
    --rpc-url https://sepolia.base.org \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvvv
  ```

- [ ] **Save Contract Addresses**
  - [ ] Copy all deployed addresses from console output
  - [ ] Update `lib/contracts.ts` with actual addresses
  - [ ] Replace all `0x0000...` placeholders

- [ ] **Verify Contracts on BaseScan**
  - [ ] Navigate to each contract on [Base Sepolia Explorer](https://sepolia.basescan.org)
  - [ ] Verify "Contract" tab shows verified source code
  - [ ] If not auto-verified, verify manually (see DEPLOYMENT.md)

## Post-Deployment Verification

- [ ] **Contract Functionality**
  - [ ] Register an agent: Call `AgentRegistry.registerAgent()`
  - [ ] Verify `AgentRegistered` event on BaseScan
  - [ ] Create a mandate: Call `DelegationPolicy.createMandate()`
  - [ ] Verify `MandateCreated` event on BaseScan
  - [ ] Revoke a mandate: Call `DelegationPolicy.revokeAgent()`
  - [ ] Verify `MandateRevoked` event on BaseScan
  - [ ] Execute a trade: Call `DelegationPolicy.enforcePolicy()` (via smart account)
  - [ ] Verify `MandateExecution` event on BaseScan

- [ ] **BaseScan Event Verification (for Judges)**
  - [ ] AgentRegistry events visible: `https://sepolia.basescan.org/address/<AGENT_REGISTRY_ADDRESS>#events`
  - [ ] DelegationPolicy events visible: `https://sepolia.basescan.org/address/<DELEGATION_POLICY_ADDRESS>#events`
  - [ ] All events properly indexed and searchable

- [ ] **Documentation**
  - [ ] Contract addresses committed to `lib/contracts.ts`
  - [ ] BaseScan links documented
  - [ ] Deployment transaction hashes saved

## Production Deployment (Base Mainnet)

- [ ] **Pre-Production Checks**
  - [ ] All contracts tested on Base Sepolia
  - [ ] All events verified and working
  - [ ] Security review completed
  - [ ] Deployer address funded with ETH on Base Mainnet

- [ ] **Deploy to Base Mainnet**
  ```bash
  forge script script/Deploy.s.sol:DeployScript \
    --rpc-url https://mainnet.base.org \
    --broadcast \
    --verify \
    --etherscan-api-key $BASESCAN_API_KEY \
    -vvvv
  ```

- [ ] **Update Production Addresses**
  - [ ] Update `CONTRACTS_BASE_MAINNET` in `lib/contracts.ts`
  - [ ] Commit and tag release

## Quick Reference

### Contract Addresses File
- Location: `lib/contracts.ts`
- Update after each deployment
- Addresses are FROZEN after deployment

### BaseScan Links
- Base Sepolia: https://sepolia.basescan.org
- Base Mainnet: https://basescan.org

### Required Events (for Judges)
1. `AgentRegistered` - AgentRegistry contract
2. `MandateCreated` - DelegationPolicy contract  
3. `MandateRevoked` - DelegationPolicy contract
4. `MandateExecution` - DelegationPolicy contract

### Testing Commands
```bash
# Check contract on BaseScan
cast code <CONTRACT_ADDRESS> --rpc-url https://sepolia.base.org

# Read contract state
cast call <CONTRACT_ADDRESS> "functionName()" --rpc-url https://sepolia.base.org

# Send transaction
cast send <CONTRACT_ADDRESS> "functionName()" \
  --rpc-url https://sepolia.base.org \
  --private-key $PRIVATE_KEY
```

