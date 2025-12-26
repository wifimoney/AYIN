'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import {
  Transaction,
  TransactionButton,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { baseSepolia } from 'wagmi/chains';
import { CONTRACTS, ABIS } from '@/lib/contracts';
import { getPaymasterUrl } from '@/lib/config';
import type { Agent } from '@/lib/types';

interface DelegationModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent?: Agent;
  onSuccess?: () => void;
}

export default function DelegationModal({
  isOpen,
  onClose,
  agent,
  onSuccess,
}: DelegationModalProps) {
  const { address } = useAccount();
  const [step, setStep] = useState(1);
  const [budget, setBudget] = useState('');
  const [duration, setDuration] = useState(7);
  const [customDuration, setCustomDuration] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setBudget('');
      setDuration(7);
      setCustomDuration('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleStatusChange = async (status: LifecycleStatus) => {
    console.log('Transaction status:', status);

    if (status.statusName === 'success') {
      // Track delegation in backend
      try {
        await fetch('/api/delegations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentId: agent?.id || agent?.operator,
            allocation: parseFloat(budget),
            duration: duration,
            maxDrawdown: 20, // Default to moderate risk
            maxPosition: 20,
            deltaNeutral: true,
            stopLoss: true,
            approvedMarkets: ['Crypto Majors', 'L2 Activity'],
          }),
        });
      } catch (error) {
        console.error('Failed to track delegation:', error);
      }

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    }
  };

  const isValidBudget = budget && parseFloat(budget) > 0;
  const isValidDuration = duration > 0;

  // Prepare transaction data
  const agentAddress = (agent?.operator || '0xdA31A1967F0007fA623549132484db7592d3B413') as `0x${string}`;
  const maxTradeSize = budget ? parseEther(budget) : parseEther('0.1');
  const allowedMarkets = ['0x9B1d4f761dDe6B913A59c9F312308c177a951476'] as `0x${string}`[]; // Fallback market
  const expiryTime = BigInt(Math.floor(Date.now() / 1000) + duration * 24 * 60 * 60);

  const encodedData = encodeFunctionData({
    abi: ABIS.DELEGATION,
    functionName: 'createMandate',
    args: [agentAddress, maxTradeSize, allowedMarkets, expiryTime],
  });

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Create Delegation</h2>
            <p className="text-sm text-gray-400 mt-1">
              Delegate to {agent?.name || 'agent'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex justify-between items-center">
            {[
              { num: 1, label: 'Budget' },
              { num: 2, label: 'Duration' },
              { num: 3, label: 'Confirm' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${step >= s.num
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400'
                      }`}
                  >
                    {s.num}
                  </div>
                  <span className="text-xs text-gray-400 mt-1">{s.label}</span>
                </div>
                {idx < 2 && (
                  <div
                    className={`h-0.5 flex-1 -mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-gray-700'
                      }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Budget */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delegation Budget
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    ETH
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Recommended: 0.01 - 1.0 ETH
                </p>
              </div>

              {/* Quick Amount Buttons */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Quick amounts:</p>
                <div className="grid grid-cols-4 gap-2">
                  {['0.01', '0.05', '0.1', '0.5'].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setBudget(amount)}
                      className="bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg py-2 text-sm transition-colors"
                    >
                      {amount} ETH
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Info */}
              {agent && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <h4 className="font-semibold mb-3">Agent Performance</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Win Rate</p>
                      <p className="font-semibold text-green-400">
                        {agent.winRate || '78%'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Type</p>
                      <p className="font-semibold">{agent.type}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Reputation</p>
                      <p className="font-semibold text-blue-400">
                        {agent.reputation}/100
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Duration */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Delegation Duration
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { days: 1, label: '1 Day' },
                    { days: 7, label: '1 Week' },
                    { days: 14, label: '2 Weeks' },
                    { days: 30, label: '1 Month' },
                  ].map((option) => (
                    <button
                      key={option.days}
                      onClick={() => {
                        setDuration(option.days);
                        setCustomDuration('');
                      }}
                      className={`py-3 px-4 rounded-lg border-2 transition-all ${duration === option.days && !customDuration
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                    >
                      <p className="font-semibold">{option.label}</p>
                      <p className="text-xs text-gray-400">{option.days} days</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Or set custom duration (days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDuration}
                  onChange={(e) => {
                    setCustomDuration(e.target.value);
                    setDuration(parseInt(e.target.value) || 0);
                  }}
                  placeholder="Enter custom days"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Duration Info */}
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-sm text-blue-300">
                  ℹ️ Delegation expires in{' '}
                  <strong>{duration} day{duration !== 1 ? 's' : ''}</strong>
                  <br />
                  <span className="text-xs text-gray-400">
                    You can withdraw unused funds after expiry
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h4 className="font-semibold mb-4">Delegation Summary</h4>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Agent</span>
                    <span className="font-medium">{agent?.name || 'Selected Agent'}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Budget</span>
                    <span className="font-semibold text-lg">{budget} ETH</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Duration</span>
                    <span className="font-medium">
                      {duration} day{duration !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Expires</span>
                    <span className="font-medium">
                      {new Date(Date.now() + duration * 86400000).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Gas Fee</span>
                      <span className="text-green-400 font-semibold">
                        FREE ✨
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Component */}
              {address && agent && budget && (
                <Transaction
                  chainId={baseSepolia.id}
                  calls={[
                    {
                      to: CONTRACTS.DELEGATION_POLICY as `0x${string}`,
                      data: encodedData,
                    },
                  ]}
                  capabilities={{
                    paymasterService: {
                      url: getPaymasterUrl(),
                    },
                  }}
                  onStatus={handleStatusChange}
                >
                  <TransactionButton
                    text="Confirm Delegation"
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white font-semibold py-3 rounded-lg transition-opacity"
                  />
                  <TransactionStatus>
                    <div className="mt-4">
                      <TransactionStatusLabel />
                      <TransactionStatusAction />
                    </div>
                  </TransactionStatus>
                </Transaction>
              )}

              {/* Terms */}
              <div className="text-xs text-gray-500 bg-gray-800/50 rounded-lg p-3">
                <p>
                  ⚠️ By confirming, you delegate {budget} ETH to {agent?.name} for {duration} days.
                  The agent will use this budget to trade on your behalf.
                  Unused funds can be withdrawn after expiry.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4 flex gap-3">
          {step > 1 && step < 3 && (
            <button
              onClick={handleBack}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Back
            </button>
          )}

          {step < 3 && (
            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !isValidBudget) ||
                (step === 2 && !isValidDuration)
              }
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Continue
            </button>
          )}

          {step === 1 && (
            <button
              onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}