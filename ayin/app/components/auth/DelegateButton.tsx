'use client';
import { Transaction, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionToast, TransactionToastIcon, TransactionToastLabel, TransactionToastAction } from '@coinbase/onchainkit/transaction';
import { baseSepolia } from 'wagmi/chains';
import { encodeFunctionData } from 'viem';
import { CONTRACTS, ABIS } from '@/lib/contracts';
import { sdk } from '@farcaster/miniapp-sdk';
import { useState, useEffect } from 'react';
import { getPaymasterUrl } from '@/lib/config';

export function DelegateButton({
    agentAddress,
    budget,
    duration
}: {
    agentAddress: string;
    budget: bigint;
    duration: number;
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

    const expiresAt = Math.floor(Date.now() / 1000) + duration;

    const calls = [
        {
            to: CONTRACTS.DELEGATION_POLICY,
            data: encodeFunctionData({
                abi: ABIS.DELEGATION,
                functionName: 'createDelegation',
                args: [agentAddress, budget, BigInt(expiresAt)],
            }),
        },
    ];

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
                        actionType: 'delegation'
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
            calls={calls}
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
                text="Delegate (Free - No Gas)"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold"
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