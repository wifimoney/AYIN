import { cookieStorage, createConfig, createStorage, http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { baseAccount } from "wagmi/connectors";

export function getConfig() {
    return createConfig({
        chains: [base, baseSepolia],
        multiInjectedProviderDiscovery: false,
        connectors: [
            baseAccount({
                appName: "AYIN",
            }),
        ],
        storage: createStorage({
            storage: cookieStorage,
        }),
        ssr: true,
        transports: {
            [base.id]: http(),
            [baseSepolia.id]: http(),
        },
    });
}

declare module "wagmi" {
    interface Register {
        config: ReturnType<typeof getConfig>;
    }
}
