'use client';
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { SignInWithBase } from "./SignInWithBase";

export default function Header() {
    const account = useAccount();
    const { connectors, connect } = useConnect();
    const { disconnect } = useDisconnect();

    const baseConnector = connectors.find(c => c.name === "Base Account");

    return (
        <header className="flex justify-between items-center px-4 py-3 bg-gray-900/60 backdrop-blur-md border-b border-white/5">
            <h1 className="font-semibold text-lg">AYIN</h1>
            {account.status === "connected" ? (
                <button
                    onClick={() => {
                        disconnect();
                        localStorage.removeItem("session_token");
                    }}
                    className="text-gray-400 text-sm hover:text-white transition-colors"
                >
                    {account.address?.slice(0, 6)}…{account.address?.slice(-4)} · Logout
                </button>
            ) : (
                baseConnector && <SignInWithBase connector={baseConnector} />
            )}
        </header>
    );
}
