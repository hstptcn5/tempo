import { useReadContract, useAccount, useBlockNumber } from 'wagmi';
import { erc20Abi } from '@hst/abis';
import type { Address } from 'viem';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { formatUnitsSafe } from './utils/format';

export interface UseTokenBalanceOptions {
    /** Token contract address */
    token: Address;
    /** Account address (defaults to connected wallet) */
    account?: Address;
    /** Watch for changes on new blocks */
    watch?: boolean;
    /** Enabled state */
    enabled?: boolean;
}

export interface UseTokenBalanceResult {
    /** Raw balance as BigInt */
    balance: bigint | undefined;
    /** Formatted balance string */
    formatted: string;
    /** Token decimals */
    decimals: number | undefined;
    /** Token symbol */
    symbol: string | undefined;
    /** Loading state */
    isLoading: boolean;
    /** Error state */
    isError: boolean;
    /** Error object */
    error: Error | null;
    /** Refetch function */
    refetch: () => void;
}

/**
 * Hook to get ERC20 token balance with auto-refresh on new blocks
 */
export function useTokenBalance(options: UseTokenBalanceOptions): UseTokenBalanceResult {
    const { token, account: accountProp, watch = false, enabled = true } = options;

    const { address: connectedAddress } = useAccount();
    const account = accountProp ?? connectedAddress;
    const queryClient = useQueryClient();

    // Get balance
    const {
        data: balance,
        isLoading: isBalanceLoading,
        isError: isBalanceError,
        error: balanceError,
        refetch: refetchBalance,
        queryKey: balanceQueryKey,
    } = useReadContract({
        address: token,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: account ? [account] : undefined,
        query: {
            enabled: enabled && !!account && !!token,
        },
    });

    // Get decimals
    const { data: decimals } = useReadContract({
        address: token,
        abi: erc20Abi,
        functionName: 'decimals',
        query: {
            enabled: enabled && !!token,
            staleTime: Infinity, // Decimals don't change
        },
    });

    // Get symbol
    const { data: symbol } = useReadContract({
        address: token,
        abi: erc20Abi,
        functionName: 'symbol',
        query: {
            enabled: enabled && !!token,
            staleTime: Infinity, // Symbol doesn't change
        },
    });

    // Watch for new blocks
    const { data: blockNumber } = useBlockNumber({
        watch: watch,
    });

    // Refetch on new block
    useEffect(() => {
        if (watch && blockNumber) {
            queryClient.invalidateQueries({ queryKey: balanceQueryKey });
        }
    }, [blockNumber, watch, queryClient, balanceQueryKey]);

    return {
        balance,
        formatted: formatUnitsSafe(balance, decimals ?? 18, 4),
        decimals,
        symbol,
        isLoading: isBalanceLoading,
        isError: isBalanceError,
        error: balanceError,
        refetch: refetchBalance,
    };
}

/**
 * Hook to get native token balance (ETH, MATIC, BNB, etc.)
 */
export function useNativeBalance(options?: {
    account?: Address;
    watch?: boolean;
}) {
    const { account: accountProp, watch = false } = options ?? {};

    const { address: connectedAddress } = useAccount();
    const account = accountProp ?? connectedAddress;
    const queryClient = useQueryClient();

    const {
        data: balance,
        isLoading,
        isError,
        error,
        refetch,
        queryKey,
    } = useReadContract({
        // Use the multicall contract to get ETH balance
        // This is a workaround since wagmi doesn't expose useBalance in v2 the same way
        address: '0xcA11bde05977b3631167028862bE2a173976CA11', // Multicall3
        abi: [
            {
                type: 'function',
                name: 'getEthBalance',
                inputs: [{ name: 'addr', type: 'address' }],
                outputs: [{ name: 'balance', type: 'uint256' }],
                stateMutability: 'view',
            },
        ] as const,
        functionName: 'getEthBalance',
        args: account ? [account] : undefined,
        query: {
            enabled: !!account,
        },
    });

    // Watch for new blocks
    const { data: blockNumber } = useBlockNumber({
        watch: watch,
    });

    useEffect(() => {
        if (watch && blockNumber) {
            queryClient.invalidateQueries({ queryKey });
        }
    }, [blockNumber, watch, queryClient, queryKey]);

    return {
        balance,
        formatted: formatUnitsSafe(balance, 18, 4),
        isLoading,
        isError,
        error,
        refetch,
    };
}
