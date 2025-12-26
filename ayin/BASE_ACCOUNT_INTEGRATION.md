# Base Account Integration Guide

## ✅ Installation Complete

All Base Account packages have been successfully installed:
- `wagmi` - Ethereum library for React
- `viem` - TypeScript interface for Ethereum
- `@tanstack/react-query` - Data fetching and caching
- `@base-org/account` - Base Account SDK
- `@base-org/account-ui/react` - Base Account UI components
- `jsonwebtoken` - JWT authentication

## 🔧 Configuration Files Created

### 1. **app/wagmi.ts**
Wagmi configuration with Base Account connector, cookie storage, and SSR support.

### 2. **app/providers.tsx**
React Query + Wagmi providers wrapper for global state management.

### 3. **app/components/SignInWithBase.tsx**
Base Account authentication component with SIWE (Sign-In With Ethereum) support.

### 4. **app/components/Header.tsx**
Header component showing Base Account connection status and sign-in button.

### 5. **app/api/auth/session/route.ts** (Updated)
Enhanced to support both:
- Base Account authentication (address-based)
- Farcaster authentication (FID-based)

### 6. **lib/auth/index.ts** (Enhanced)
Unified JWT session management supporting both authentication methods.

## 🚀 How to Use

### Basic Usage in Your App

Replace your existing `RootProvider` with the new `Providers` component in `app/layout.tsx`:

```tsx
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

### Using the Header Component

```tsx
import Header from '@/app/components/Header'

export default function YourPage() {
  return (
    <div>
      <Header />
      {/* Your content */}
    </div>
  )
}
```

### Checking Authentication Status

```tsx
'use client'
import { useAccount } from 'wagmi'

export function YourComponent() {
  const { address, isConnected, connector } = useAccount()
  
  if (!isConnected) {
    return <p>Please sign in with Base Account</p>
  }
  
  return (
    <div>
      <p>Connected: {address}</p>
      <p>Via: {connector?.name}</p>
    </div>
  )
}
```

## 🔐 Environment Variables

Make sure `.env.local` contains:
```
JWT_SECRET="super-secret-dev-key"
```

(Change this to a secure secret in production!)

## 📝 Next Steps

1. **Update your root layout** to use the new `Providers` component
2. **Add the Header** component to your main page
3. **Test the authentication flow** by clicking "Sign In with Base"
4. **Protect your API routes** using the enhanced `getSession()` helper

## 🧪 Testing

Start your dev server:
```bash
npm run dev
```

Visit your app and test:
1. Click "Sign In with Base"
2. Approve the connection in your wallet
3. Verify your address appears in the header
4. Check that JWT token is stored in localStorage

## 🎨 Customization

The `SignInWithBase` button supports customization:

```tsx
<SignInWithBaseButton
  variant="solid"      // or "outline"
  colorScheme="system" // or "light" | "dark"
  onClick={handleConnect}
/>
```

## 🔗 Integration Points

- **Existing Farcaster auth** continues to work alongside Base Account
- **Session tokens** are unified (same JWT format)
- **API routes** automatically support both auth methods
- **Client state** is managed through wagmi hooks

## ⚠️ Known Issues

- TypeScript may show version conflicts between wagmi versions - this is expected when migrating
- Make sure to use the wagmi hooks from the new config, not the old rootProvider

---

**Created by AYIN Integration Assistant** 🚀
