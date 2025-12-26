'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

export function AutoAuth() {
    const { address } = useAccount();
    const [sessionCreated, setSessionCreated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const context = await sdk.context;
                // Check if context and user exist (context might be null if not in frame)
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
            } catch (err) {
                console.error('Error fetching context', err);
            }
        };

        checkAuth();
    }, [address, sessionCreated]);

    return null;
}