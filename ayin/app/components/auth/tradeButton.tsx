import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionToast, TransactionToastIcon, TransactionToastLabel, TransactionToastAction } from '@coinbase/onchainkit/transaction';
import { encodeFunctionData } from 'viem';
import { baseSepolia } from 'wagmi/chains';
import { sdk } from '@farcaster/miniapp-sdk';
import { useState, useEffect } from 'react';
import { CONTRACTS, ABIS } from '@/lib/contracts';
import { getPaymasterUrl } from '@/lib/config';

export function TradeButton({
    marketId,
    outcome,
    amount
}: {
    marketId: bigint;
    outcome: boolean;
    amount: bigint;
}) {
    const [context, setContext] = useState<any>(null);

    useEffect(() => {
        const loadContext = async () => {
            try {
                const ctx = await sdk.context;
                setContext(ctx);
            } catch (e) {
                console.error('Failed to load SDK context', e);
            }
        };
        loadContext();
    }, []);

    const fid = context?.user?.fid;
    const username = context?.user?.username;

    const handleSuccess = async (response: any) => {
        if (response.transactionHash) {
            try {
                await fetch('/api/agent-actions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fid,
                        username,
                        transactionHash: response.transactionHash,
                        actionType: 'trade'
                    }),
                });
            } catch (error) {
                console.error('Failed to log transaction', error);
            }
        }
    };

    return (
        <Transaction
            chainId={baseSepolia.id}
            calls={[{
                to: CONTRACTS.PREDICTION_MARKET,
                data: encodeFunctionData({
                    abi: ABIS.MARKET,
                    functionName: 'placeBet',
                    args: [marketId, outcome, amount],
                }),
                value: amount,
            }]}
            capabilities={{
                paymasterService: { url: getPaymasterUrl() },
            }}
            onStatus={(status) => {
                if (status.statusName === 'success') {
                    handleSuccess(status.statusData);
                }
            }}
        >
            <TransactionButton
                text={`Trade ${outcome ? 'YES' : 'NO'} - Free`}
                className="bg-green-600 px-4 py-2 rounded"
            />
            <TransactionStatus>
                <TransactionStatusLabel />
                <TransactionToast>
                    <TransactionToastIcon />
                    <TransactionToastLabel />
                    <TransactionToastAction />
                </TransactionToast>
            </TransactionStatus>
        </Transaction>
    );
}