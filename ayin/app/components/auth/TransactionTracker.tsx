import { TransactionStatus, TransactionStatusLabel, TransactionToast, TransactionToastIcon, TransactionToastLabel, TransactionToastAction } from '@coinbase/onchainkit/transaction';

export function TransactionTracker() {
    return (
        <TransactionStatus>
            <TransactionStatusLabel />
            <TransactionToast>
                <TransactionToastIcon />
                <TransactionToastLabel />
                <TransactionToastAction />
            </TransactionToast>
        </TransactionStatus>
    );
}