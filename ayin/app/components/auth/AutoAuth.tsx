'use client';

import { sdk } from '@farcaster/miniapp-sdk';
import { useAccount } from 'wagmi';
import { useEffect, useState } from 'react';

/**
 * AutoAuth Component
 * Handles automatic authentication via Farcaster Quick Auth or context-based fallback.
 * This is a silent component that renders nothing but manages session state.
 */
export function AutoAuth() {
    const { address } = useAccount();
    const [sessionCreated, setSessionCreated] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // Check if already authenticated
                const existingToken = localStorage.getItem('session_token');
                if (existingToken) {
                    setSessionCreated(true);
                    return;
                }

                // Try Quick Auth for secure authentication
                try {
                    const { token } = await sdk.quickAuth.getToken();

                    const response = await fetch('/api/auth/session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            token,
                            walletAddress: address
                        }),
                    });

                    const data = await response.json();

                    if (data.success && data.token) {
                        localStorage.setItem('session_token', data.token);
                        setSessionCreated(true);
                    }
                } catch (quickAuthError) {
                    // Fallback: Try context-based auth (less secure, for backward compatibility)
                    console.warn('Quick Auth unavailable, falling back to context:', quickAuthError);

                    try {
                        const context = await sdk.context;
                        if (context?.user && !sessionCreated) {
                            await fetch('/api/auth/session', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    fid: context.user.fid,
                                    username: context.user.username,
                                    walletAddress: address,
                                }),
                            });
                            setSessionCreated(true);
                            return;
                        }
                    } catch (contextError) {
                        console.warn('Context auth unavailable:', contextError);
                    }

                    // Final fallback: Create session with wallet address only
                    // This handles the case where the user is outside Farcaster
                    if (address && !sessionCreated) {
                        const response = await fetch('/api/auth/session', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ address }),
                        });
                        const data = await response.json();
                        if (data.success && data.token) {
                            localStorage.setItem('session_token', data.token);
                            setSessionCreated(true);
                        }
                    }
                }
            } catch (err) {
                console.error('Auto-auth error:', err);
            }
        };

        checkAuth();
    }, [address, sessionCreated]);

    return null;
}
