/**
 * Hook for fetching swap quotes from Tempo DEX
 * 
 * This hook provides real-time quote updates for swapping between
 * TIP-20 stablecoins on Tempo. Since Tempo stablecoins maintain 1:1 peg,
 * swaps are typically near 1:1 with a small fee.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePublicClient } from 'wagmi';
import { type Address, formatUnits } from 'viem';
import {
    tempoDexRouterAbi,
    TEMPO_DEX_ROUTER_TESTNET,
    calculateMinAmountOut,
} from '@hst/abis';

export interface SwapQuote {
    /** Amount of input tokens */
    amountIn: bigint;
    /** Expected output amount */
    amountOut: bigint;
    /** Minimum output with slippage applied */
    minAmountOut: bigint;
    /** Exchange rate (amountOut / amountIn) */
    rate: number;
    /** Price impact percentage */
    priceImpact: number;
    /** Estimated fee in basis points */
    feeBps: number;
    /** Quote timestamp */
    timestamp: number;
}

export interface UseTempoSwapQuoteOptions {
    /** Input token address */
    tokenIn?: Address;
    /** Output token address */
    tokenOut?: Address;
    /** Amount in wei (input token decimals) */
    amountIn?: bigint;
    /** Input token decimals */
    tokenInDecimals?: number;
    /** Output token decimals */
    tokenOutDecimals?: number;
    /** Slippage tolerance in basis points (default: 50 = 0.5%) */
    slippageBps?: number;
    /** DEX router address (defaults to testnet) */
    router?: Address;
    /** Chain ID */
    chainId?: number;
    /** Auto-refresh interval in ms (0 = disabled) */
    refreshInterval?: number;
    /** Whether the hook is enabled */
    enabled?: boolean;
}

export interface UseTempoSwapQuoteResult {
    /** Current quote (null if not available) */
    quote: SwapQuote | null;
    /** Whether quote is being fetched */
    isLoading: boolean;
    /** Error message if quote failed */
    error: string | null;
    /** Manually refresh quote */
    refetch: () => Promise<void>;
    /** Whether the swap pair is supported */
    isPairSupported: boolean;
}

/**
 * Hook for fetching Tempo DEX swap quotes
 * 
 * @example
 * ```tsx
 * const { quote, isLoading, error } = useTempoSwapQuote({
 *   tokenIn: TOKENS.pathUSD.address,
 *   tokenOut: TOKENS.AlphaUSD.address,
 *   amountIn: parseUnits('100', 6),
 *   tokenInDecimals: 6,
 *   tokenOutDecimals: 6,
 *   slippageBps: 50, // 0.5%
 * });
 * 
 * if (quote) {
 *   console.log(`Rate: ${quote.rate}, Min out: ${formatUnits(quote.minAmountOut, 6)}`);
 * }
 * ```
 */
export function useTempoSwapQuote(options: UseTempoSwapQuoteOptions): UseTempoSwapQuoteResult {
    const {
        tokenIn,
        tokenOut,
        amountIn,
        tokenInDecimals = 6,
        tokenOutDecimals = 6,
        slippageBps = 50,
        router = TEMPO_DEX_ROUTER_TESTNET,
        chainId = 42429,
        refreshInterval = 10000, // 10 seconds
        enabled = true,
    } = options;

    const publicClient = usePublicClient({ chainId });

    const [quote, setQuote] = useState<SwapQuote | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPairSupported, setIsPairSupported] = useState(true);

    // Check if we have valid inputs
    const canFetch = useMemo(() => {
        return (
            enabled &&
            !!tokenIn &&
            !!tokenOut &&
            tokenIn !== tokenOut &&
            !!amountIn &&
            amountIn > 0n &&
            !!publicClient
        );
    }, [enabled, tokenIn, tokenOut, amountIn, publicClient]);

    const fetchQuote = useCallback(async () => {
        if (!canFetch || !tokenIn || !tokenOut || !amountIn || !publicClient) {
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // First, check if pair is supported
            let pairSupported = true;
            try {
                pairSupported = await publicClient.readContract({
                    address: router,
                    abi: tempoDexRouterAbi,
                    functionName: 'isPairSupported',
                    args: [tokenIn, tokenOut],
                }) as boolean;
            } catch {
                // If function doesn't exist, assume pair is supported
                pairSupported = true;
            }

            setIsPairSupported(pairSupported);

            if (!pairSupported) {
                setError('This swap pair is not supported');
                setQuote(null);
                setIsLoading(false);
                return;
            }

            // Get quote from DEX router
            let amountOut: bigint;

            try {
                amountOut = await publicClient.readContract({
                    address: router,
                    abi: tempoDexRouterAbi,
                    functionName: 'getAmountOut',
                    args: [tokenIn, tokenOut, amountIn],
                }) as bigint;
            } catch (quoteFetchError) {
                // If DEX contract doesn't exist or function fails,
                // fall back to 1:1 rate estimation for stablecoins
                // This allows UI testing before DEX is deployed
                console.warn('DEX quote failed, using 1:1 fallback:', quoteFetchError);

                // Adjust for decimal differences
                if (tokenInDecimals === tokenOutDecimals) {
                    amountOut = amountIn;
                } else if (tokenInDecimals > tokenOutDecimals) {
                    amountOut = amountIn / BigInt(10 ** (tokenInDecimals - tokenOutDecimals));
                } else {
                    amountOut = amountIn * BigInt(10 ** (tokenOutDecimals - tokenInDecimals));
                }

                // Apply a simulated fee (0.03%)
                amountOut = amountOut - (amountOut * 3n) / 10000n;
            }

            // Get swap fee
            let feeBps = 3; // Default 0.03%
            try {
                const fee = await publicClient.readContract({
                    address: router,
                    abi: tempoDexRouterAbi,
                    functionName: 'swapFee',
                    args: [],
                }) as bigint;
                feeBps = Number(fee);
            } catch {
                // Use default fee
            }

            // Calculate rate
            const amountInFloat = parseFloat(formatUnits(amountIn, tokenInDecimals));
            const amountOutFloat = parseFloat(formatUnits(amountOut, tokenOutDecimals));
            const rate = amountInFloat > 0 ? amountOutFloat / amountInFloat : 0;

            // Calculate price impact (for stablecoins, should be near 0)
            // Impact = (1 - rate) * 100
            const priceImpact = Math.abs((1 - rate) * 100);

            // Calculate minimum output with slippage
            const minAmountOut = calculateMinAmountOut(amountOut, slippageBps);

            setQuote({
                amountIn,
                amountOut,
                minAmountOut,
                rate,
                priceImpact,
                feeBps,
                timestamp: Date.now(),
            });

        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to fetch quote';
            setError(message);
            setQuote(null);
        } finally {
            setIsLoading(false);
        }
    }, [
        canFetch,
        tokenIn,
        tokenOut,
        amountIn,
        tokenInDecimals,
        tokenOutDecimals,
        slippageBps,
        router,
        publicClient,
    ]);

    // Fetch quote when inputs change
    useEffect(() => {
        if (canFetch) {
            fetchQuote();
        } else {
            setQuote(null);
            setError(null);
        }
    }, [canFetch, fetchQuote]);

    // Auto-refresh
    useEffect(() => {
        if (!canFetch || refreshInterval <= 0) return;

        const interval = setInterval(() => {
            fetchQuote();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [canFetch, refreshInterval, fetchQuote]);

    return {
        quote,
        isLoading,
        error,
        refetch: fetchQuote,
        isPairSupported,
    };
}

