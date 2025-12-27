'use client';

import { useAuth } from '@/lib/hooks';
import { useAccount } from 'wagmi';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance
} from '@coinbase/onchainkit/identity';

export function WalletButton() {
  const { user } = useAuth();
  const { address } = useAccount();

  return (
    <div className="flex items-center gap-3">
      {/* Show Farcaster identity if available */}
      {user && (user.username || user.fid) && (
        <div className="text-sm text-right mr-2">
          <p className="font-medium text-white/70">
            {user.username ? `@${user.username}` : `FID: ${user.fid}`}
          </p>
        </div>
      )}

      {/* OnchainKit Wallet Component */}
      <Wallet>
        <ConnectWallet>
          <Avatar className="h-6 w-6" />
          <Name />
        </ConnectWallet>
        <WalletDropdown>
          <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
            <Avatar />
            <Name />
            <Address />
            <EthBalance />
          </Identity>
          <WalletDropdownLink icon="wallet" href="https://keys.coinbase.com">
            Wallet
          </WalletDropdownLink>
          <WalletDropdownDisconnect />
        </WalletDropdown>
      </Wallet>
    </div>
  );
}

