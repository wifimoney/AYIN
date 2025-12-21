'use client';

import React, { useState } from 'react';
import { Cpu, Shield, Activity, Clock, Zap, X, Check, AlertCircle, Loader2, ExternalLink, Verified } from 'lucide-react';
import { useAgents, useMarkets, useDelegations, useDelegationForm } from '@/lib/hooks';
import { useOnchainAgent, getAgentTypeLabel, getAgentTypeDescription, OnchainAgentType } from '@/lib/hooks/useOnchainAgent';
import { WalletButton } from './components/WalletButton';
import { AyinLogo } from './components/AyinLogo';
import { ThemeToggle } from './components/ThemeToggle';
import { getExplorerLink, formatAddress } from '@/lib/utils';
import { getContractAddress } from '@/lib/contracts';
import { useChainId } from 'wagmi';
import type { Agent } from '@/lib/types';

// Delegation Modal Component
function DelegationModal({
  agent,
  isOpen,
  onClose,
}: {
  agent: Agent;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { createDelegation, submitting } = useDelegations();
  const { intent, updateIntent, isValid } = useDelegationForm(agent.id);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async () => {
    if (!isValid || submitting) return;
    const result = await createDelegation(intent);
    setStatus(result ? 'success' : 'error');
  };

  if (!isOpen) return null;

  if (status === 'success') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
        <div className="w-full max-w-md mx-4 bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Check className="w-6 h-6 text-gray-900" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Delegation Active</h3>
          <p className="text-gray-500 mb-6">
            Your delegation to {agent.name} is now active.
          </p>
          <button
            onClick={() => {
              setStatus('idle');
              onClose();
            }}
            className="w-full py-3 bg-[#0000FF] text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
      <div className="w-full max-w-md mx-4 bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{agent.name}</h3>
              <p className="text-xs text-gray-500">{agent.type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Max Spend */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Max Spend
            </label>
            <div className="relative">
              <input
                type="number"
                value={intent.allocation}
                onChange={(e) => updateIntent({ allocation: Number(e.target.value) })}
                className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-lg text-lg font-mono text-gray-900 focus:border-[#0000FF] focus:ring-1 focus:ring-[#0000FF] outline-none"
                placeholder="0"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                USDC
              </span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Duration
            </label>
            <div className="relative">
              <input
                type="number"
                value={intent.duration}
                onChange={(e) => updateIntent({ duration: Number(e.target.value) })}
                min={1}
                max={365}
                className="w-full px-4 py-3 pr-16 border border-gray-200 rounded-lg text-lg font-mono text-gray-900 focus:border-[#0000FF] focus:ring-1 focus:ring-[#0000FF] outline-none"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                Days
              </span>
            </div>
          </div>

          {/* Risk Profile */}
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Risk Profile
            </label>
            <div className="flex gap-2">
              {['Conservative', 'Moderate', 'Aggressive'].map((profile) => {
                const isSelected =
                  (profile === 'Conservative' && intent.maxDrawdown <= 10) ||
                  (profile === 'Moderate' && intent.maxDrawdown > 10 && intent.maxDrawdown <= 25) ||
                  (profile === 'Aggressive' && intent.maxDrawdown > 25);
                return (
                  <button
                    key={profile}
                    onClick={() => {
                      const drawdown =
                        profile === 'Conservative' ? 8 : profile === 'Moderate' ? 15 : 30;
                      updateIntent({ maxDrawdown: drawdown });
                    }}
                    className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors border ${
                      isSelected
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {profile}
                  </button>
                );
              })}
            </div>
          </div>

          {status === 'error' && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <AlertCircle className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Failed to create delegation. Try again.</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={!isValid || submitting}
            className="w-full py-3.5 bg-[#0000FF] text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Delegation'
            )}
          </button>
          <p className="text-center text-xs text-gray-400 mt-3">
            Signed on Base · Revocable anytime
          </p>
        </div>
      </div>
    </div>
  );
}

// Agent Card Component
function AgentCard({
  agent,
  onDelegate,
}: {
  agent: Agent;
  onDelegate: (agent: Agent) => void;
}) {
  const chainId = useChainId();
  const agentRegistryAddress = getContractAddress('AgentRegistry', chainId);
  
  // Try to fetch onchain data if agent has onchainId
  const onchainId = agent.onchainId || (agent.id && !isNaN(Number(agent.id)) ? Number(agent.id) : null);
  const { onchainAgent, isLoading: loadingOnchain, baseScanLink, isOnchain } = useOnchainAgent(onchainId);
  
  // Determine agent type display
  const agentType = onchainAgent 
    ? getAgentTypeLabel(onchainAgent.agentType)
    : agent.type;
  
  const agentTypeDescription = onchainAgent
    ? getAgentTypeDescription(onchainAgent.agentType)
    : agent.strategy || 'Autonomous trading agent';

  // Check if agent is verified onchain
  const isVerified = isOnchain && (onchainAgent?.exists || agent.verifiedOnchain);
  const registryLink = isOnchain && agentRegistryAddress !== '0x0000000000000000000000000000000000000000'
    ? getExplorerLink('address', agentRegistryAddress, chainId)
    : null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 leading-tight">{agent.name}</h3>
              {isVerified && (
                <Verified className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{agentType}</p>
            {onchainAgent && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Agent ID: #{onchainAgent.agentId} · {formatAddress(onchainAgent.operator)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-600 dark:text-gray-400 flex-shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {agent.status}
        </div>
      </div>

      {/* Agent Type Description */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
          {agentTypeDescription}
        </p>
      </div>

      {/* ERC-8004 Verification Badge */}
      {isVerified && (
        <div className="mb-4 flex items-center gap-2 p-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
              This agent is verifiable onchain
            </p>
            <p className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
              ERC-8004 compliant · Registered on Base
            </p>
          </div>
          {registryLink && (
            <a
              href={registryLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex-shrink-0"
              title="View on BaseScan"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 py-4 border-t border-b border-gray-100 dark:border-gray-800">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Reputation</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{agent.reputation}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">ERC-8004</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Win Rate</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{agent.winRate}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Confidence</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">88%</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">±3%</p>
        </div>
      </div>

      {/* Metadata Hash (if available) */}
      {onchainAgent?.strategyHash && onchainAgent.strategyHash !== '0x0000000000000000000000000000000000000000000000000000000000000000' && (
        <div className="mb-4 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Strategy Hash</p>
          <p className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all">
            {formatAddress(onchainAgent.strategyHash)}...
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="pt-4">
        <button
          onClick={() => onDelegate(agent)}
          className="w-full py-3 bg-[#0000FF] dark:bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 transition-colors"
        >
          Delegate to Agent
        </button>
      </div>
    </div>
  );
}

// Featured Market Component
function FeaturedMarket() {
  const { markets, loading } = useMarkets();
  const market = markets[0];

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-gray-100 rounded w-1/4 mb-3" />
        <div className="h-6 bg-gray-100 rounded w-3/4 mb-4" />
        <div className="h-2 bg-gray-100 rounded-full w-full" />
      </div>
    );
  }

  if (!market) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
          Featured Market
        </span>
        <span className="text-xs text-gray-400">Ends {market.endDate}</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4 leading-snug">{market.title}</h3>
      
      {/* Probability Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Market Probability</span>
          <span className="font-semibold text-gray-900">{market.probability}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gray-900 rounded-full transition-all"
            style={{ width: `${market.probability}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>Volume: {market.volume}</span>
          <span>Confidence: ±{100 - market.confidence}%</span>
        </div>
      </div>
    </div>
  );
}

// Activity Feed Component
function ActivityFeed() {
  const activities = [
    { id: 1, agent: 'Sentinel Alpha', action: 'Opened position', market: 'ETH > $4000', time: '2m ago', type: 'buy' },
    { id: 2, agent: 'Risk Arbiter', action: 'Closed position', market: 'BTC Halving Impact', time: '8m ago', type: 'sell' },
    { id: 3, agent: 'Sentinel Alpha', action: 'Adjusted hedge', market: 'L2 Activity Surge', time: '15m ago', type: 'adjust' },
    { id: 4, agent: 'Risk Arbiter', action: 'Stop-loss triggered', market: 'USDC Depeg Risk', time: '32m ago', type: 'stop' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
      </div>
      <div className="divide-y divide-gray-100">
        {activities.map((activity) => (
          <div key={activity.id} className="px-5 py-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              {activity.type === 'buy' && <Zap className="w-4 h-4 text-gray-500" />}
              {activity.type === 'sell' && <Activity className="w-4 h-4 text-gray-500" />}
              {activity.type === 'adjust' && <Shield className="w-4 h-4 text-gray-500" />}
              {activity.type === 'stop' && <AlertCircle className="w-4 h-4 text-gray-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate">
                <span className="font-medium">{activity.agent}</span>
                <span className="text-gray-500"> · {activity.action}</span>
              </p>
              <p className="text-xs text-gray-400 truncate">{activity.market}</p>
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0">{activity.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Active Delegation Component
function ActiveDelegation() {
  const { delegations, cancelDelegation, submitting } = useDelegations();
  const activeDelegation = delegations.find((d) => d.status === 'active');

  if (!activeDelegation) return null;

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
            <Shield className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{activeDelegation.agentName}</h3>
            <p className="text-xs text-gray-500">Active delegation</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="w-3.5 h-3.5" />
          {activeDelegation.expiresAt ? `Expires ${activeDelegation.expiresAt}` : 'No expiry'}
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Allocated</p>
          <p className="text-sm font-semibold text-gray-900">
            ${activeDelegation.constraints.allocation.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Max Drawdown</p>
          <p className="text-sm font-semibold text-gray-900">
            {activeDelegation.constraints.maxDrawdown}%
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Duration</p>
          <p className="text-sm font-semibold text-gray-900">
            {activeDelegation.constraints.duration}d
          </p>
        </div>
      </div>

      <button
        onClick={() => cancelDelegation(activeDelegation.id)}
        disabled={submitting}
        className="w-full py-2.5 border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        {submitting ? 'Revoking...' : 'Revoke Delegation'}
      </button>
    </div>
  );
}

// Main App Component
export default function MiniApp() {
  const { agents, loading: agentsLoading } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const displayAgents = agents.slice(0, 2);

  const handleDelegate = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AyinLogo size={32} />
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">AYIN</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Agent delegation on Base</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Active Delegation (if exists) */}
        <ActiveDelegation />

        {/* Featured Market */}
        <FeaturedMarket />

        {/* Agents Section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Available Agents</h2>
          {agentsLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-2xl p-5 animate-pulse">
                  <div className="flex gap-3 mb-4">
                    <div className="w-11 h-11 bg-gray-100 rounded-xl" />
                    <div>
                      <div className="h-5 bg-gray-100 rounded w-24 mb-2" />
                      <div className="h-4 bg-gray-50 rounded w-32" />
                    </div>
                  </div>
                  <div className="h-20 bg-gray-50 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {displayAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onDelegate={handleDelegate} />
              ))}
            </div>
          )}
        </section>

        {/* Activity Feed */}
        <ActivityFeed />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-100 mt-12">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <p className="text-xs text-gray-400">
            Built on Base · ERC-8004 Compliant
          </p>
        </div>
      </footer>

      {/* Delegation Modal */}
      {selectedAgent && (
        <DelegationModal
          agent={selectedAgent}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAgent(null);
          }}
        />
      )}
    </div>
  );
}

