# AYIN
BASE ODTU / KCL Project

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-onchain`](https://www.npmjs.com/package/create-onchain).


## Getting Started

First, install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

Next, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.


## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Chain Configuration
# Chain ID: 84532 for Base Sepolia (demo), 8453 for Base Mainnet
NEXT_PUBLIC_CHAIN_ID=84532

# RPC Configuration
# Use public Base RPC or Alchemy/Infura endpoint
# Public Base Sepolia: https://sepolia.base.org
# Public Base Mainnet: https://mainnet.base.org
# Alchemy Base Sepolia: https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_RPC_URL=https://sepolia.base.org

# WalletConnect Configuration (optional)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id

# OnchainKit Configuration (optional)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
```

**Note:** The app defaults to Base Sepolia (chain ID 84532) for demo purposes if `NEXT_PUBLIC_CHAIN_ID` is not set.


## Smart Contracts

### Contract Addresses

Contract addresses are centralized in `lib/contracts.ts`. After deployment, update this file with the deployed addresses.

**⚠️ IMPORTANT:** Contract addresses are FROZEN after deployment. Judges will verify these addresses on BaseScan.

### Deployment

See [contracts/DEPLOYMENT.md](./contracts/DEPLOYMENT.md) for detailed deployment and verification instructions.

Quick deployment to Base Sepolia:

```bash
cd contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url https://sepolia.base.org \
  --broadcast \
  --verify \
  --etherscan-api-key $BASESCAN_API_KEY \
  -vvvv
```

### Contract Events

All contracts emit events that are indexed on BaseScan:

- **AgentRegistry**: `AgentRegistered` - Emitted when an agent is registered
- **DelegationPolicy**: `MandateCreated` - Emitted when a delegation is created
- **DelegationPolicy**: `MandateRevoked` - Emitted when a delegation is revoked
- **DelegationPolicy**: `MandateExecution` - Emitted when an agent executes an action

Judges can verify these events on BaseScan by navigating to the contract address and viewing the Events tab.


## Learn More

To learn more about OnchainKit, see our [documentation](https://docs.base.org/onchainkit).

To learn more about Next.js, see the [Next.js documentation](https://nextjs.org/docs).
