'use client';
import { Connector } from "wagmi";
import { SignInWithBaseButton } from "@base-org/account-ui/react";
import { useState } from "react";

export function SignInWithBase({ connector }: { connector: Connector }) {
    const [verification, setVerification] = useState("");

    async function handleBaseConnect() {
        const provider = await connector.getProvider();
        if (!provider) return console.error("No provider found");

        try {
            const clientNonce =
                Math.random().toString(36).slice(2) +
                Math.random().toString(36).slice(2);

            const accounts = await (provider as any).request({
                method: "wallet_connect",
                params: [
                    {
                        version: "1",
                        capabilities: {
                            signInWithEthereum: {
                                nonce: clientNonce,
                                chainId: "0x2105", // Base Mainnet
                            },
                        },
                    },
                ],
            });

            const address = accounts[0].address;
            const verify = await fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address }),
            });
            const data = await verify.json();
            localStorage.setItem("session_token", data.token);
            setVerification(`✅ Verified as ${address}`);
        } catch (err: any) {
            console.error("Error signing in:", err);
            setVerification(`❌ ${err.message}`);
        }
    }

    return (
        <div>
            <SignInWithBaseButton
                onClick={handleBaseConnect}
                variant="solid"
                colorScheme="system"
            />
            {verification && <p className="text-xs mt-2 text-gray-400">{verification}</p>}
        </div>
    );
}
