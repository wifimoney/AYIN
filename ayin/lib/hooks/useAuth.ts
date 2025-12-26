import { useState, useEffect, useCallback } from 'react';
import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';

export interface AuthUser {
    fid: number;
    username?: string;
    walletAddress?: string;
}

export function useAuth() {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);
    const { context } = useMiniKit();
    const { address } = useAccount();

    // Fetch session from server on mount
    useEffect(() => {
        async function fetchSession() {
            try {
                const res = await fetch('/api/auth/session');
                if (res.ok) {
                    const data = await res.json();
                    if (data.user) {
                        setUser(data.user);
                    }
                }
            } catch (e) {
                console.error('Failed to fetch session', e);
            } finally {
                setLoading(false);
            }
        }
        fetchSession();
    }, []);

    // Sync MiniKit context to session if available and different
    useEffect(() => {
        if (context?.user?.fid && (!user || user.fid !== context.user.fid)) {
            const newUser = {
                fid: context.user.fid,
                username: context.user.username || undefined,
                walletAddress: address
            };

            setUser(newUser);

            // Persist to server
            fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            }).catch(console.error);
        }
    }, [context?.user, address, user]);

    return {
        user,
        loading,
        isAuthenticated: !!user
    };
}
