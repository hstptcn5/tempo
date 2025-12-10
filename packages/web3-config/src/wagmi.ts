import { createConfig, http, fallback, type Config } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import type { Chain, Transport } from 'viem';
import { defaultChains, testnetChains, chains as allChains } from './chains';

export interface WagmiConfigOptions {
    appName: string;
    projectId: string; // WalletConnect project ID
    chains?: readonly Chain[];
    enableTestnets?: boolean;
    ssr?: boolean;
}

// Create transports with fallback RPCs
function createTransports(selectedChains: readonly Chain[]): Record<number, Transport> {
    const transports: Record<number, Transport> = {};

    for (const chain of selectedChains) {
        const chainConfig = Object.values(allChains).find((c) => c.id === chain.id);
        const fallbackRpcs = chainConfig?.rpcUrls?.fallback ?? [];

        if (fallbackRpcs.length > 0) {
            transports[chain.id] = fallback(fallbackRpcs.map((url) => http(url)));
        } else {
            transports[chain.id] = http();
        }
    }

    return transports;
}

// Create wagmi config with RainbowKit integration
export function createWagmiConfig(options: WagmiConfigOptions): Config {
    const {
        appName,
        projectId,
        chains = defaultChains,
        enableTestnets = false,
        ssr = true,
    } = options;

    const selectedChains = enableTestnets
        ? [...chains, ...testnetChains]
        : chains;

    // If no projectId provided, use a placeholder that allows app to run
    // WalletConnect will show an error when user tries to connect via WC
    // but other wallets (MetaMask, etc.) will still work
    const resolvedProjectId = projectId || 'PLACEHOLDER_PROJECT_ID';

    const config = getDefaultConfig({
        appName,
        projectId: resolvedProjectId,
        chains: selectedChains as unknown as readonly [Chain, ...Chain[]],
        ssr,
    });

    return config;
}

// Create custom wagmi config without RainbowKit (for advanced use)
export function createCustomWagmiConfig(options: {
    chains: readonly Chain[];
    ssr?: boolean;
}) {
    const { chains, ssr = true } = options;
    const transports = createTransports(chains);

    return createConfig({
        chains: chains as unknown as readonly [Chain, ...Chain[]],
        transports: transports as Record<number, Transport>,
        ssr,
    });
}

export { defaultChains, testnetChains };
