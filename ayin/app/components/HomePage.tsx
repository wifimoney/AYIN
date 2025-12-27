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
    <div className="min-h-screen bg-gradient-to-b from-[#05070A] via-[#0A0E16] to-[#0E1420] text-white selection:bg-[#0052FF]/30">
      {/* Ambient Glow Effect */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[600px] bg-[#0052FF]/15 blur-[150px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-[#0052FF]/10 blur-[120px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#05070A]/60 backdrop-blur-2xl border-b border-white/[0.06]">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AyinLogo size={40} />
            <div className="hidden sm:block">
              <h1 className="text-xl font-black text-white tracking-tighter uppercase">AYIN Protocol</h1>
              <p className="text-[10px] text-[#0052FF] font-bold uppercase tracking-[0.2em]">Base Native Alignment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <WalletButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-10 space-y-16">

        {/* Active Delegation Section */}
        <section className="space-y-4">
          <ActiveDelegation />
        </section>

        {/* Intelligence / Markets Section */}
        <section className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-bold text-[#0052FF]/70 uppercase tracking-[0.25em]">Signal Intelligence</h2>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0052FF]/10 border border-[#0052FF]/20 text-[10px] font-bold text-[#0052FF] uppercase tracking-widest">
              Polymarket Gamma
            </div>
          </div>
          <MarketFeed />
        </section>

        {/* Agents Grid - Floating Cards Layout */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] font-bold text-[#0052FF]/70 uppercase tracking-[0.25em]">Validated Agents</h2>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
              {agentsLoading ? 'Synchronizing...' : `${displayAgents.length} Agents Online`}
            </span>
          </div>

          {agentsLoading ? (
            <div className="grid grid-cols-1 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white/[0.02] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-8 animate-pulse">
                  <div className="flex gap-4 mb-6">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-white/5 rounded w-32" />
                      <div className="h-3 bg-white/5 rounded w-24" />
                    </div>
                  </div>
                  <div className="h-32 bg-white/5 rounded-2xl" />
                </div>
              ))}
            </div>
          ) : displayAgents.length === 0 ? (
            <div className="bg-white/[0.02] backdrop-blur-xl border border-dashed border-white/10 rounded-2xl p-16 text-center">
              <Cpu className="w-12 h-12 text-white/10 mx-auto mb-6" />
              <h3 className="text-white/60 font-black text-sm uppercase tracking-[0.2em] mb-3">No Verified Agents</h3>
              <p className="text-white/40 text-xs max-w-xs mx-auto font-medium leading-relaxed">
                The registry is currently synchronized with Base Sepolia. New agents will appear as they clear security validation.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {displayAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} onDelegate={handleDelegate} />
              ))}
            </div>
          )}
        </section>

        {/* Activity Feed */}
        <section className="space-y-5 pb-12">
          <div className="px-1">
            <h2 className="text-[10px] font-bold text-[#0052FF]/70 uppercase tracking-[0.25em]">Global Event Log</h2>
          </div>
          <ActivityFeed />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] py-20 bg-[#05070A]">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-10">
          <div className="flex flex-col items-center gap-6">
            <AyinLogo size={48} />
            <div className="space-y-2">
              <p className="text-sm font-black text-white uppercase tracking-[0.3em]">AYIN Protocol</p>
              <p className="text-[10px] font-bold text-[#0052FF] uppercase tracking-[0.2em]">
                Autonomous Yield & Intelligence Network
              </p>
            </div>
          </div>
          <div className="pt-10 border-t border-white/[0.06]">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.25em]">
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
