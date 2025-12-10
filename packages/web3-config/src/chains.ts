import {
    mainnet,
    polygon,
    bsc,
    arbitrum,
    base,
    optimism,
    avalanche,
    sepolia,
    polygonAmoy,
    bscTestnet,
} from 'viem/chains';
import { defineChain, type Chain } from 'viem';

/**
 * Tempo Testnet ("Andantino")
 * Stablecoin-first EVM chain - no native gas token, fees paid in TIP-20 stablecoins
 */
export const tempoTestnet = defineChain({
    id: 42429,
    name: 'Tempo Testnet',
    nativeCurrency: {
        name: 'USD',
        symbol: 'USD',
        decimals: 18,
    },
    rpcUrls: {
        default: {
            http: ['https://rpc.testnet.tempo.xyz'],
            webSocket: ['wss://rpc.testnet.tempo.xyz'],
        },
    },
    blockExplorers: {
        default: {
            name: 'Tempo Explorer',
            url: 'https://explore.tempo.xyz',
        },
    },
    testnet: true,
});

// Chain type with our extensions
export interface ExtendedChain extends Chain {
    iconUrl?: string;
    rpcUrls: Chain['rpcUrls'] & {
        fallback?: readonly string[];
    };
}

// RPC URLs with fallbacks
const RPC_URLS: Record<number, readonly string[]> = {
    // Ethereum Mainnet
    [mainnet.id]: [
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://ethereum.publicnode.com',
    ],
    // Polygon
    [polygon.id]: [
        'https://polygon.llamarpc.com',
        'https://rpc.ankr.com/polygon',
        'https://polygon-bor.publicnode.com',
    ],
    // BSC
    [bsc.id]: [
        'https://bsc-dataseed1.binance.org',
        'https://rpc.ankr.com/bsc',
        'https://bsc.publicnode.com',
    ],
    // Arbitrum
    [arbitrum.id]: [
        'https://arbitrum.llamarpc.com',
        'https://rpc.ankr.com/arbitrum',
        'https://arbitrum-one.publicnode.com',
    ],
    // Base
    [base.id]: [
        'https://mainnet.base.org',
        'https://base.llamarpc.com',
        'https://base.publicnode.com',
    ],
    // Optimism
    [optimism.id]: [
        'https://optimism.llamarpc.com',
        'https://rpc.ankr.com/optimism',
        'https://optimism.publicnode.com',
    ],
    // Avalanche
    [avalanche.id]: [
        'https://avalanche.public-rpc.com',
        'https://rpc.ankr.com/avalanche',
        'https://avalanche-c-chain.publicnode.com',
    ],
    // Testnets
    [sepolia.id]: [
        'https://rpc.sepolia.org',
        'https://rpc.ankr.com/eth_sepolia',
    ],
    [polygonAmoy.id]: [
        'https://rpc-amoy.polygon.technology',
    ],
    [bscTestnet.id]: [
        'https://data-seed-prebsc-1-s1.binance.org:8545',
    ],
    // Tempo Testnet (Andantino) - stablecoin-first chain
    [tempoTestnet.id]: [
        'https://rpc.testnet.tempo.xyz',
    ],
};

// Chain icons
const CHAIN_ICONS: Record<number, string> = {
    [mainnet.id]: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    [polygon.id]: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
    [bsc.id]: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png',
    [arbitrum.id]: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    [base.id]: 'https://raw.githubusercontent.com/base-org/brand-kit/main/logo/symbol/Base_Symbol_Blue.png',
    [optimism.id]: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
    [avalanche.id]: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
    // Tempo uses a USD-themed icon
    [tempoTestnet.id]: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Ccircle cx="50" cy="50" r="45" fill="%2310b981"/%3E%3Ctext x="50" y="65" font-size="40" font-family="sans-serif" fill="white" text-anchor="middle"%3E$%3C/text%3E%3C/svg%3E',
};

// Extended chains with fallback RPCs and icons
export const chains = {
    mainnet: {
        ...mainnet,
        iconUrl: CHAIN_ICONS[mainnet.id],
        rpcUrls: {
            ...mainnet.rpcUrls,
            fallback: RPC_URLS[mainnet.id],
        },
    },
    polygon: {
        ...polygon,
        iconUrl: CHAIN_ICONS[polygon.id],
        rpcUrls: {
            ...polygon.rpcUrls,
            fallback: RPC_URLS[polygon.id],
        },
    },
    bsc: {
        ...bsc,
        iconUrl: CHAIN_ICONS[bsc.id],
        rpcUrls: {
            ...bsc.rpcUrls,
            fallback: RPC_URLS[bsc.id],
        },
    },
    arbitrum: {
        ...arbitrum,
        iconUrl: CHAIN_ICONS[arbitrum.id],
        rpcUrls: {
            ...arbitrum.rpcUrls,
            fallback: RPC_URLS[arbitrum.id],
        },
    },
    base: {
        ...base,
        iconUrl: CHAIN_ICONS[base.id],
        rpcUrls: {
            ...base.rpcUrls,
            fallback: RPC_URLS[base.id],
        },
    },
    optimism: {
        ...optimism,
        iconUrl: CHAIN_ICONS[optimism.id],
        rpcUrls: {
            ...optimism.rpcUrls,
            fallback: RPC_URLS[optimism.id],
        },
    },
    avalanche: {
        ...avalanche,
        iconUrl: CHAIN_ICONS[avalanche.id],
        rpcUrls: {
            ...avalanche.rpcUrls,
            fallback: RPC_URLS[avalanche.id],
        },
    },
    // Testnets
    sepolia: {
        ...sepolia,
        rpcUrls: {
            ...sepolia.rpcUrls,
            fallback: RPC_URLS[sepolia.id],
        },
    },
    polygonAmoy: {
        ...polygonAmoy,
        rpcUrls: {
            ...polygonAmoy.rpcUrls,
            fallback: RPC_URLS[polygonAmoy.id],
        },
    },
    bscTestnet: {
        ...bscTestnet,
        rpcUrls: {
            ...bscTestnet.rpcUrls,
            fallback: RPC_URLS[bscTestnet.id],
        },
    },
    // Tempo Testnet (Andantino) - stablecoin-first chain
    tempoTestnet: {
        ...tempoTestnet,
        iconUrl: CHAIN_ICONS[tempoTestnet.id],
        rpcUrls: {
            ...tempoTestnet.rpcUrls,
            fallback: RPC_URLS[tempoTestnet.id],
        },
    },
} as const;

// Default chains for dApp
export const defaultChains = [
    chains.mainnet,
    chains.polygon,
    chains.bsc,
    chains.arbitrum,
    chains.base,
] as const;

// Testnet chains
export const testnetChains = [
    chains.sepolia,
    chains.polygonAmoy,
    chains.bscTestnet,
    chains.tempoTestnet,
] as const;

// Get explorer URL for address/tx
export function getExplorerUrl(
    chainId: number,
    type: 'address' | 'tx' | 'token' | 'block',
    value: string
): string {
    const chain = Object.values(chains).find((c) => c.id === chainId);
    if (!chain?.blockExplorers?.default) {
        return '#';
    }
    const baseUrl = chain.blockExplorers.default.url;
    return `${baseUrl}/${type}/${value}`;
}

// Get chain by ID
export function getChainById(chainId: number): ExtendedChain | undefined {
    return Object.values(chains).find((c) => c.id === chainId) as ExtendedChain | undefined;
}

// Re-export viem chains for convenience
// Note: tempoTestnet is already exported above via defineChain()
export {
    mainnet,
    polygon,
    bsc,
    arbitrum,
    base,
    optimism,
    avalanche,
    sepolia,
    polygonAmoy,
    bscTestnet,
};
