'use client';

import { useMiniKit } from '@coinbase/onchainkit/minikit';
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
  const { context } = useMiniKit();
  const { address } = useAccount();

  return (
    <div className="flex items-center gap-3">
      {/* Show Farcaster identity if available */}
      {context?.user && (
        <div className="text-sm text-right mr-2">
          <p className="font-medium">
            {context.user.username ? `@${context.user.username}` : `FID: ${context.user.fid}`}
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

