'use client';

import React, { useState } from 'react';
import { Cpu } from 'lucide-react';
import { useAgents } from '@/lib/hooks';
import { WalletButton } from './WalletButton';
import { AyinLogo } from './AyinLogo';
import { ThemeToggle } from './ThemeToggle';
import type { Agent } from '@/lib/types';
import MarketFeed from './MarketFeed';
import { AgentCard } from './AgentCard';
import { ActivityFeed } from './ActivityFeed';
import { ActiveDelegation } from './ActiveDelegation';
import DelegationModal from './DelegationModal';

export default function HomePage() {
  const { agents, loading: agentsLoading } = useAgents();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Focus only on the primary trading agents
  const displayAgents = agents.slice(0, 3);

  const handleDelegate = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30">
      {/* Glow Effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-primary/20 blur-[120px] pointer-events-none -z-10 opacity-50" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AyinLogo size={40} />
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-white tracking-tighter uppercase">AYIN Protocol</h1>
              <p className="text-[10px] text-label font-bold uppercase tracking-widest opacity-80">Base Native Alignment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-12">

        {/* Active Delegation Section */}
        <section className="space-y-4">
          <ActiveDelegation />
        </section>

        {/* Intelligence / Markets Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-semibold text-label uppercase tracking-[0.2em] opacity-80">Signal Intelligence</h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-[8px] font-bold text-primary uppercase tracking-widest">
              Polymarket Gamma
            </div>
          </div>
          <MarketFeed />
        </section>

        {/* Agents Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-semibold text-label uppercase tracking-[0.2em] opacity-80">Validated Agents</h2>
            <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{agentsLoading ? 'Synchronizing...' : `${displayAgents.length} Agents Online`}</span>
          </div>

          {agentsLoading ? (
            <div className="grid grid-cols-1 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-surface/50 border border-white/5 rounded-[2rem] p-8 shadow-nova animate-pulse">
                  <div className="flex gap-4 mb-6">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-white/5 rounded w-32" />
                      <div className="h-3 bg-white/5 rounded w-24" />
                    </div>
                  </div>
                  <div className="h-32 bg-white/5 rounded-3xl" />
                </div>
              ))}
            </div>
          ) : displayAgents.length === 0 ? (
            <div className="bg-surface/20 border border-dashed border-white/10 rounded-[2.5rem] p-16 text-center shadow-nova">
              <Cpu className="w-12 h-12 text-secondary/10 mx-auto mb-6" />
              <h3 className="text-secondary font-black uppercase tracking-widest mb-2">No Verified Agents</h3>
              <p className="text-secondary text-xs max-w-xs mx-auto mb-8 font-medium">
                The registry is currently synchronized with Base Sepolia. New agents will appear as they clear security validation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {displayAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onDelegate={handleDelegate} />
              ))}
            </div>
          )}
        </section>

        {/* Activity Feed */}
        <section className="space-y-4 pb-12">
          <div className="px-2">
            <h2 className="text-[10px] font-semibold text-label uppercase tracking-[0.2em] opacity-80">Global Event Log</h2>
          </div>
          <ActivityFeed />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-16 bg-black">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <div className="flex flex-col items-center gap-6">
            <AyinLogo size={48} />
            <div className="space-y-2">
              <p className="text-sm font-black text-white uppercase tracking-[0.25em]">AYIN Protocol</p>
              <p className="text-[10px] font-bold text-label uppercase tracking-widest opacity-80">
                Autonomous Yield & Intelligence Network
              </p>
            </div>
          </div>
          <div className="pt-8 border-t border-white/5">
            <p className="text-[9px] font-bold text-secondary/50 uppercase tracking-[0.2em]">
              Built for Base · Verifiable via ERC-8004 · No Custody
            </p>
          </div>
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
