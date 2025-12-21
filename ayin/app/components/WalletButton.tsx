'use client';

import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { formatAddress } from '@/lib/utils/index';
import { ChevronDown, LogOut } from 'lucide-react';

export function WalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showDropdown, setShowDropdown] = useState(false);

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => {
            const connector = connectors[0];
            if (connector) {
              connect({ connector });
            }
          }}
          disabled={isPending}
          className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
      >
        <span className="font-mono">{formatAddress(address || '')}</span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Connected Wallet
              </p>
              <p className="text-sm font-mono text-gray-900 break-all">
                {address}
              </p>
            </div>
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}

