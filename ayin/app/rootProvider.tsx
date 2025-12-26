"use client";
import { ReactNode, useEffect } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, metaMask, walletConnect } from "wagmi/connectors";
import { sdk } from "@farcaster/miniapp-sdk";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { ThemeProvider, useTheme } from "next-themes";

// Determine chain based on environment variable (default to Base Sepolia for demo)
const chainId = process.env.NEXT_PUBLIC_CHAIN_ID
  ? parseInt(process.env.NEXT_PUBLIC_CHAIN_ID, 10)
  : 84532; // Default to Base Sepolia for demo

const selectedChain = chainId === 84532 ? baseSepolia : base;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ||
  (chainId === 84532
    ? 'https://sepolia.base.org'
    : 'https://mainnet.base.org');

// Add WalletConnect only if project ID is provided
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

const connectors = [
  injected(),
  metaMask(),
  ...(walletConnectProjectId ? [walletConnect({ projectId: walletConnectProjectId })] : [])
];

const config = createConfig({
  chains: [selectedChain],
  connectors,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

const queryClient = new QueryClient();

// Component to sync OnchainKit with next-themes
function OnchainKitThemeSync({ children }: { children: ReactNode }) {
  const { theme } = useTheme();

  // Determine the mode: 'light', 'dark', or 'auto'
  const mode = theme === 'system' ? 'auto' : (theme === 'dark' ? 'dark' : 'light');

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={selectedChain}
      config={{
        appearance: {
          mode: mode as 'auto' | 'light' | 'dark',
          theme: 'base', // Base brand colors theme
        },
        wallet: {
          display: 'modal',
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}

export function RootProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize Farcaster Mini App SDK
    try {
      sdk.actions.ready();
    } catch (error) {
      console.debug('Farcaster SDK not available:', error);
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <OnchainKitThemeSync>
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
      </OnchainKitThemeSync>
    </ThemeProvider>
  );
}
