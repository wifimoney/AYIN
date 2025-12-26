'use client';

import { useAccount } from 'wagmi';
import Header from '@/app/components/Header';
import HomePage from '@/app/components/HomePage';

export default function BaseAccountDemo() {
    const account = useAccount();

    return (
        <div className="min-h-screen bg-black">
            <Header />

            {/* Demo Section */}
            {account.status === 'connected' && (
                <div className="max-w-3xl mx-auto px-6 py-6">
                    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl p-6 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                <span className="text-blue-400 text-xl">✓</span>
                            </div>
                            <div>
                                <h3 className="font-black text-white uppercase tracking-tight">Base Account Connected</h3>
                                <p className="text-xs text-gray-400 font-mono">{account.address}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-black/40 rounded-xl p-3">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Chain</p>
                                <p className="text-sm font-bold text-white">{account.chain?.name || 'Unknown'}</p>
                            </div>
                            <div className="bg-black/40 rounded-xl p-3">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Connector</p>
                                <p className="text-sm font-bold text-white">{account.connector?.name || 'N/A'}</p>
                            </div>
                            <div className="bg-black/40 rounded-xl p-3">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Status</p>
                                <div className="flex items-center justify-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <p className="text-sm font-bold text-emerald-500">Active</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main App */}
            <HomePage />
        </div>
    );
}
