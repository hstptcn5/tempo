/**
 * Tempo Stablecoin DEX ABI
 * 
 * This ABI is for a standard stablecoin swap router, similar to Curve-style
 * stable swap pools. Tempo's stablecoin-first architecture enables efficient
 * 1:1 (or near 1:1) swaps between TIP-20 stablecoins.
 * 
 * The interface supports:
 * - Direct swaps between any two supported stablecoins
 * - Quote calculation before swap execution
 * - Slippage protection via minAmountOut
 * 
 * Note: This is a generic interface. The actual deployed contract on Tempo
 * may have additional or different functions. Update the ABI and address
 * based on the official Tempo DEX deployment.
 */

import type { Address } from 'viem';

/**
 * Tempo DEX Router contract address on testnet
 * 
 * IMPORTANT: This is a placeholder address. Replace with the actual
 * deployed DEX router address when available.
 */
export const TEMPO_DEX_ROUTER_TESTNET: Address = '0x20c1000000000000000000000000000000000000';

/**
 * Swap pool configuration
 */
export interface SwapPoolInfo {
    /** Pool contract address */
    address: Address;
    /** Supported tokens in this pool */
    tokens: Address[];
    /** Pool fee in basis points (e.g., 3 = 0.03%) */
    feeBps: number;
    /** Whether pool is active */
    active: boolean;
}

/**
 * Standard DEX Router ABI for stablecoin swaps
 * 
 * This is a Uniswap V2/Curve-style interface commonly used for stable swaps
 */
export const tempoDexRouterAbi = [
    // === Read Functions ===
    
    /**
     * Get quote for swapping exact input amount
     * @param tokenIn - Input token address
     * @param tokenOut - Output token address
     * @param amountIn - Amount of input tokens
     * @returns amountOut - Expected output amount
     */
    {
        type: 'function',
        name: 'getAmountOut',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
        ],
        outputs: [
            { name: 'amountOut', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    
    /**
     * Get quote for swapping to exact output amount
     * @param tokenIn - Input token address
     * @param tokenOut - Output token address
     * @param amountOut - Desired output amount
     * @returns amountIn - Required input amount
     */
    {
        type: 'function',
        name: 'getAmountIn',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountOut', type: 'uint256' },
        ],
        outputs: [
            { name: 'amountIn', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    
    /**
     * Get the swap fee in basis points
     * @returns Fee in bps (e.g., 3 = 0.03%)
     */
    {
        type: 'function',
        name: 'swapFee',
        inputs: [],
        outputs: [
            { name: '', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    
    /**
     * Check if a swap pair is supported
     */
    {
        type: 'function',
        name: 'isPairSupported',
        inputs: [
            { name: 'tokenA', type: 'address' },
            { name: 'tokenB', type: 'address' },
        ],
        outputs: [
            { name: '', type: 'bool' },
        ],
        stateMutability: 'view',
    },
    
    // === Write Functions ===
    
    /**
     * Swap exact amount of input tokens for output tokens
     * @param tokenIn - Input token address
     * @param tokenOut - Output token address
     * @param amountIn - Exact amount of input tokens
     * @param minAmountOut - Minimum acceptable output (slippage protection)
     * @param recipient - Address to receive output tokens
     * @param deadline - Unix timestamp deadline
     * @returns amountOut - Actual output amount received
     */
    {
        type: 'function',
        name: 'swapExactIn',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'minAmountOut', type: 'uint256' },
            { name: 'recipient', type: 'address' },
            { name: 'deadline', type: 'uint256' },
        ],
        outputs: [
            { name: 'amountOut', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
    },
    
    /**
     * Swap input tokens for exact amount of output tokens
     * @param tokenIn - Input token address
     * @param tokenOut - Output token address
     * @param maxAmountIn - Maximum input tokens to spend
     * @param amountOut - Exact output amount desired
     * @param recipient - Address to receive output tokens
     * @param deadline - Unix timestamp deadline
     * @returns amountIn - Actual input amount spent
     */
    {
        type: 'function',
        name: 'swapExactOut',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'maxAmountIn', type: 'uint256' },
            { name: 'amountOut', type: 'uint256' },
            { name: 'recipient', type: 'address' },
            { name: 'deadline', type: 'uint256' },
        ],
        outputs: [
            { name: 'amountIn', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
    },
    
    // === Events ===
    
    /**
     * Emitted when a swap is executed
     */
    {
        type: 'event',
        name: 'Swap',
        inputs: [
            { name: 'sender', type: 'address', indexed: true },
            { name: 'recipient', type: 'address', indexed: true },
            { name: 'tokenIn', type: 'address', indexed: false },
            { name: 'tokenOut', type: 'address', indexed: false },
            { name: 'amountIn', type: 'uint256', indexed: false },
            { name: 'amountOut', type: 'uint256', indexed: false },
        ],
    },
] as const;

/**
 * Simple StableSwap pool ABI (for direct pool interactions)
 * Used when the DEX router is not available
 */
export const stableSwapPoolAbi = [
    // Get exchange rate between tokens
    {
        type: 'function',
        name: 'getExchangeRate',
        inputs: [
            { name: 'tokenA', type: 'address' },
            { name: 'tokenB', type: 'address' },
        ],
        outputs: [
            { name: 'rate', type: 'uint256' }, // 18 decimals (1e18 = 1:1)
        ],
        stateMutability: 'view',
    },
    
    // Swap tokens in pool
    {
        type: 'function',
        name: 'exchange',
        inputs: [
            { name: 'tokenIn', type: 'address' },
            { name: 'tokenOut', type: 'address' },
            { name: 'amountIn', type: 'uint256' },
            { name: 'minAmountOut', type: 'uint256' },
        ],
        outputs: [
            { name: 'amountOut', type: 'uint256' },
        ],
        stateMutability: 'nonpayable',
    },
] as const;

/**
 * Known swap pools on Tempo Testnet
 * 
 * Note: These are placeholder addresses. Update with actual deployed pools.
 */
export const TEMPO_SWAP_POOLS: SwapPoolInfo[] = [
    {
        address: '0x20c1000000000000000000000000000000000001',
        tokens: [
            '0x20c0000000000000000000000000000000000000', // pathUSD
            '0x20c0000000000000000000000000000000000001', // AlphaUSD
            '0x20c0000000000000000000000000000000000002', // BetaUSD
            '0x20c0000000000000000000000000000000000003', // ThetaUSD
        ],
        feeBps: 3, // 0.03%
        active: true,
    },
];

/**
 * Calculate minimum output with slippage
 * @param amountOut - Expected output amount
 * @param slippageBps - Slippage tolerance in basis points (e.g., 50 = 0.5%)
 */
export function calculateMinAmountOut(amountOut: bigint, slippageBps: number): bigint {
    return amountOut - (amountOut * BigInt(slippageBps)) / 10000n;
}

/**
 * Calculate maximum input with slippage
 * @param amountIn - Expected input amount
 * @param slippageBps - Slippage tolerance in basis points
 */
export function calculateMaxAmountIn(amountIn: bigint, slippageBps: number): bigint {
    return amountIn + (amountIn * BigInt(slippageBps)) / 10000n;
}

/**
 * Get swap deadline (current time + minutes)
 * @param minutes - Number of minutes until deadline
 */
export function getSwapDeadline(minutes: number = 20): bigint {
    return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
}

