'use client';

import { useMiniKit } from '@coinbase/onchainkit/minikit';
import { useAccount } from 'wagmi';

export function UserBadge() {
  const { context } = useMiniKit();
  const { address } = useAccount();
  
  if (!context) return null;
  
  const { user } = context;
  
  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-lg px-4 py-2">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm">
        {user.username?.[0]?.toUpperCase() || '?'}
      </div>
      <div className="text-sm">
        <p className="font-medium">{user.username || `FID ${user.fid}`}</p>
        {address && (
          <p className="text-xs text-gray-400">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
        )}
      </div>
    </div>
  );
}