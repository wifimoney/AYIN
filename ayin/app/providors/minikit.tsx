'use client';

import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { baseSepolia } from 'wagmi/chains';
import { ReactNode } from 'react';

export function MiniKit({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider
      projectId={process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID!}
      chain={baseSepolia}
      config={{
        appearance: {
          mode: 'dark',
          theme: 'base',
        }
      }}
    >
      {children}
    </MiniKitProvider>
  );
}