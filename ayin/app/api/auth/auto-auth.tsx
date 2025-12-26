'use client';

import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

export function AutoAuth() {
  const { context } = useMiniKit();
  const { address } = useAccount();
  const [sessionCreated, setSessionCreated] = useState(false);
  
  useEffect(() => {
    if (context?.user && !sessionCreated) {
      fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: context.user.fid,
          username: context.user.username,
          walletAddress: address,
        }),
      })
        .then(() => setSessionCreated(true))
        .catch(console.error);
    }
  }, [context, address, sessionCreated]);
  
  return null;
}