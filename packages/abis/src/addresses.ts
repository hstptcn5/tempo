import type { Address } from 'viem';

// Chain IDs
export const CHAIN_IDS = {
    ETHEREUM: 1,
    POLYGON: 137,
    BSC: 56,
    ARBITRUM: 42161,
    BASE: 8453,
    OPTIMISM: 10,
    AVALANCHE: 43114,
    // Testnets
    SEPOLIA: 11155111,
    POLYGON_AMOY: 80002,
    BSC_TESTNET: 97,
    TEMPO_TESTNET: 42429, // Tempo "Andantino" - stablecoin-first chain
} as const;

// Token info type
export interface TokenInfo {
    address: Address;
    decimals: number;
    symbol: string;
    name: string;
    logoUrl?: string;
}

// Common token addresses by chain
export const TOKENS: Record<number, Record<string, TokenInfo>> = {
    // Ethereum Mainnet
    [CHAIN_IDS.ETHEREUM]: {
        USDC: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
        },
        USDT: {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            decimals: 6,
            symbol: 'USDT',
            name: 'Tether USD',
        },
        WETH: {
            address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            decimals: 18,
            symbol: 'WETH',
            name: 'Wrapped Ether',
        },
        DAI: {
            address: '0x6B175474E89094C44Da98b954EescdeCB5C4F9F27',
            decimals: 18,
            symbol: 'DAI',
            name: 'Dai Stablecoin',
        },
        WBTC: {
            address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
            decimals: 8,
            symbol: 'WBTC',
            name: 'Wrapped BTC',
        },
    },
    // Polygon
    [CHAIN_IDS.POLYGON]: {
        USDC: {
            address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
        },
        'USDC.e': {
            address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
            decimals: 6,
            symbol: 'USDC.e',
            name: 'USD Coin (Bridged)',
        },
        USDT: {
            address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
            decimals: 6,
            symbol: 'USDT',
            name: 'Tether USD',
        },
        WMATIC: {
            address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
            decimals: 18,
            symbol: 'WMATIC',
            name: 'Wrapped Matic',
        },
        WETH: {
            address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
            decimals: 18,
            symbol: 'WETH',
            name: 'Wrapped Ether',
        },
    },
    // BSC
    [CHAIN_IDS.BSC]: {
        USDC: {
            address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
            decimals: 18,
            symbol: 'USDC',
            name: 'USD Coin',
        },
        USDT: {
            address: '0x55d398326f99059fF775485246999027B3197955',
            decimals: 18,
            symbol: 'USDT',
            name: 'Tether USD',
        },
        WBNB: {
            address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
            decimals: 18,
            symbol: 'WBNB',
            name: 'Wrapped BNB',
        },
        BUSD: {
            address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
            decimals: 18,
            symbol: 'BUSD',
            name: 'Binance USD',
        },
    },
    // Arbitrum
    [CHAIN_IDS.ARBITRUM]: {
        USDC: {
            address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
        },
        'USDC.e': {
            address: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
            decimals: 6,
            symbol: 'USDC.e',
            name: 'USD Coin (Bridged)',
        },
        USDT: {
            address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
            decimals: 6,
            symbol: 'USDT',
            name: 'Tether USD',
        },
        WETH: {
            address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
            decimals: 18,
            symbol: 'WETH',
            name: 'Wrapped Ether',
        },
        ARB: {
            address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
            decimals: 18,
            symbol: 'ARB',
            name: 'Arbitrum',
        },
    },
    // Base
    [CHAIN_IDS.BASE]: {
        USDC: {
            address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
        },
        WETH: {
            address: '0x4200000000000000000000000000000000000006',
            decimals: 18,
            symbol: 'WETH',
            name: 'Wrapped Ether',
        },
        DAI: {
            address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
            decimals: 18,
            symbol: 'DAI',
            name: 'Dai Stablecoin',
        },
    },
    // Tempo Testnet (Andantino) - TIP-20 stablecoins
    // Note: No native gas token on Tempo; fees are paid in TIP-20 stablecoins
    [CHAIN_IDS.TEMPO_TESTNET]: {
        pathUSD: {
            address: '0x20c0000000000000000000000000000000000000',
            decimals: 6,
            symbol: 'pathUSD',
            name: 'Path USD',
        },
        AlphaUSD: {
            address: '0x20c0000000000000000000000000000000000001',
            decimals: 6,
            symbol: 'AlphaUSD',
            name: 'Alpha USD',
        },
        BetaUSD: {
            address: '0x20c0000000000000000000000000000000000002',
            decimals: 6,
            symbol: 'BetaUSD',
            name: 'Beta USD',
        },
        ThetaUSD: {
            address: '0x20c0000000000000000000000000000000000003',
            decimals: 6,
            symbol: 'ThetaUSD',
            name: 'Theta USD',
        },
    },
};

// DEX Router addresses
export const DEX_ROUTERS: Record<number, Record<string, Address>> = {
    [CHAIN_IDS.ETHEREUM]: {
        UNISWAP_V2: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
        UNISWAP_V3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        UNISWAP_V3_ROUTER_02: '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        SUSHISWAP: '0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F',
    },
    [CHAIN_IDS.POLYGON]: {
        UNISWAP_V3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        QUICKSWAP: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
        SUSHISWAP: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
    },
    [CHAIN_IDS.BSC]: {
        PANCAKESWAP_V2: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
        PANCAKESWAP_V3: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
    },
    [CHAIN_IDS.ARBITRUM]: {
        UNISWAP_V3: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        SUSHISWAP: '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506',
        CAMELOT: '0xc873fEcbd354f5A56E00E710B90EF4201db2448d',
    },
    [CHAIN_IDS.BASE]: {
        UNISWAP_V3: '0x2626664c2603336E57B271c5C0b26F421741e481',
        AERODROME: '0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43',
    },
};

// Helper to get token by chain and symbol
export function getToken(chainId: number, symbol: string): TokenInfo | undefined {
    return TOKENS[chainId]?.[symbol];
}

// Helper to get wrapped native token
export function getWrappedNative(chainId: number): TokenInfo | undefined {
    const wrappedSymbols: Record<number, string> = {
        [CHAIN_IDS.ETHEREUM]: 'WETH',
        [CHAIN_IDS.POLYGON]: 'WMATIC',
        [CHAIN_IDS.BSC]: 'WBNB',
        [CHAIN_IDS.ARBITRUM]: 'WETH',
        [CHAIN_IDS.BASE]: 'WETH',
        [CHAIN_IDS.OPTIMISM]: 'WETH',
        [CHAIN_IDS.AVALANCHE]: 'WAVAX',
    };
    const symbol = wrappedSymbols[chainId];
    return symbol ? TOKENS[chainId]?.[symbol] : undefined;
}

// Helper to get stablecoins
export function getStablecoins(chainId: number): TokenInfo[] {
    const tokens = TOKENS[chainId];
    if (!tokens) return [];
    // Tempo TIP-20 stablecoins have USD suffix
    const stableSymbols = ['USDC', 'USDC.e', 'USDT', 'DAI', 'BUSD', 'pathUSD', 'AlphaUSD', 'BetaUSD', 'ThetaUSD'];
    return Object.values(tokens).filter((t) =>
        stableSymbols.includes(t.symbol)
    );
}

// Get DEX router
export function getDexRouter(chainId: number, dex: string): Address | undefined {
    return DEX_ROUTERS[chainId]?.[dex];
}
