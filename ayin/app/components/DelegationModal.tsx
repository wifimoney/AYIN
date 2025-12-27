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
      className="fixed inset-0 bg-[#05070A]/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#0A0E16] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-[0_0_30px_rgba(0,82,255,0.15)]">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0E16]/95 backdrop-blur-sm border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Create Delegation</h2>
            <p className="text-sm text-gray-400 mt-1">
              Delegate to {agent?.name || 'agent'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
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
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex justify-between items-center">
            {[
              { num: 1, label: 'Budget' },
              { num: 2, label: 'Duration' },
              { num: 3, label: 'Confirm' },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${step >= s.num
                      ? 'bg-[#0052FF] text-white shadow-[0_0_12px_rgba(0,82,255,0.5)]'
                      : 'bg-white/5 text-gray-500'
                      }`}
                  >
                    {s.num}
                  </div>
                  <span className={`text-xs mt-1 ${step >= s.num ? 'text-[#0052FF]' : 'text-gray-500'}`}>{s.label}</span>
                </div>
                {idx < 2 && (
                  <div
                    className={`h-0.5 flex-1 -mx-2 transition-all ${step > s.num ? 'bg-[#0052FF]' : 'bg-white/10'
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
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-lg text-white focus:border-[#0052FF] focus:outline-none focus:ring-1 focus:ring-[#0052FF]/30 transition-all placeholder:text-gray-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
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
                      className={`bg-white/5 hover:bg-[#0052FF]/10 border rounded-xl py-2 text-sm font-medium transition-all ${budget === amount
                          ? 'border-[#0052FF] text-[#0052FF] shadow-[0_0_12px_rgba(0,82,255,0.19)]'
                          : 'border-white/10 text-white hover:border-[#0052FF]/50'
                        }`}
                    >
                      {amount} ETH
                    </button>
                  ))}
                </div>
              </div>

              {/* Agent Info */}
              {agent && (
                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                  <h4 className="font-semibold mb-3 text-white">Agent Performance</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Win Rate</p>
                      <p className="font-semibold text-emerald-400">
                        {agent.winRate || '78%'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Type</p>
                      <p className="font-semibold text-white">{agent.type}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Reputation</p>
                      <p className="font-semibold text-[#0052FF]">
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
                      className={`py-3 px-4 rounded-2xl border-2 transition-all ${duration === option.days && !customDuration
                        ? 'border-[#0052FF] bg-[#0052FF]/10 shadow-[0_0_12px_rgba(0,82,255,0.19)]'
                        : 'border-white/10 bg-white/5 hover:border-[#0052FF]/50'
                        }`}
                    >
                      <p className="font-semibold text-white">{option.label}</p>
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
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-[#0052FF] focus:outline-none focus:ring-1 focus:ring-[#0052FF]/30 transition-all placeholder:text-gray-500"
                />
              </div>

              {/* Duration Info */}
              <div className="bg-[#0052FF]/10 border border-[#0052FF]/30 rounded-2xl p-4">
                <p className="text-sm text-[#4D8AFF]">
                  ℹ️ Delegation expires in{' '}
                  <strong className="text-white">{duration} day{duration !== 1 ? 's' : ''}</strong>
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
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                <h4 className="font-semibold mb-4 text-white">Delegation Summary</h4>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Agent</span>
                    <span className="font-medium text-white">{agent?.name || 'Selected Agent'}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Budget</span>
                    <span className="font-semibold text-lg text-white">{budget} ETH</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Duration</span>
                    <span className="font-medium text-white">
                      {duration} day{duration !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Expires</span>
                    <span className="font-medium text-white">
                      {new Date(Date.now() + duration * 86400000).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-white/10">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Gas Fee</span>
                      <span className="text-emerald-400 font-semibold">
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
                    className="w-full bg-[#0052FF] hover:bg-[#1a66ff] text-white font-semibold py-3 rounded-2xl transition-all shadow-[0_0_12px_rgba(0,82,255,0.3)] hover:shadow-[0_0_20px_rgba(0,82,255,0.5)]"
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
              <div className="text-xs text-gray-500 bg-white/5 rounded-2xl p-3 border border-white/5">
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
        <div className="sticky bottom-0 bg-[#0A0E16]/95 backdrop-blur-sm border-t border-white/10 px-6 py-4 flex gap-3">
          {step > 1 && step < 3 && (
            <button
              onClick={handleBack}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 rounded-2xl transition-all"
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
              className="flex-1 bg-[#0052FF] hover:bg-[#1a66ff] disabled:bg-white/10 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-2xl transition-all shadow-[0_0_12px_rgba(0,82,255,0.19)] hover:shadow-[0_0_16px_rgba(0,82,255,0.4)] disabled:shadow-none"
            >
              Continue
            </button>
          )}

          {step === 1 && (
            <button
              onClick={onClose}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 rounded-2xl transition-all"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}