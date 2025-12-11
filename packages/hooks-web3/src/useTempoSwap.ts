/**
 * Hook for executing swaps on Tempo DEX
 * 
 * This hook handles the full swap flow:
 * 1. Check token allowance
 * 2. Approve if needed
 * 3. Execute swap
 * 
 * Provides callbacks for each step to enable progress UI.
 */

import { useState, useCallback } from 'react';
import { useAccount, usePublicClient, useWriteContract } from 'wagmi';
import { type Address, type Hex, maxUint256 } from 'viem';
import {
    tempoDexRouterAbi,
    erc20Abi,
    TEMPO_DEX_ROUTER_TESTNET,
    getSwapDeadline,
} from '@hst/abis';
import { decodeError, type DecodedError } from './utils/errorDecoder';

export type SwapStep = 'idle' | 'checking' | 'approving' | 'approved' | 'swapping' | 'success' | 'error';

export interface SwapResult {
    /** Transaction hash of the swap */
    txHash: Hex;
    /** Actual amount received */
    amountOut?: bigint;
}

export interface UseTempoSwapOptions {
    /** DEX router address */
    router?: Address;
    /** Chain ID */
    chainId?: number;
    /** Callback when approval tx is submitted */
    onApprovalSubmitted?: (hash: Hex) => void;
    /** Callback when approval tx is confirmed */
    onApprovalConfirmed?: (hash: Hex) => void;
    /** Callback when swap tx is submitted */
    onSwapSubmitted?: (hash: Hex) => void;
    /** Callback when swap tx is confirmed */
    onSwapConfirmed?: (hash: Hex, amountOut?: bigint) => void;
    /** Callback on any error */
    onError?: (error: DecodedError) => void;
}

export interface UseTempoSwapResult {
    /** Current step in the swap flow */
    step: SwapStep;
    /** Whether an operation is in progress */
    isLoading: boolean;
    /** Error from the last operation */
    error: DecodedError | null;
    /** Approval transaction hash */
    approvalHash: Hex | null;
    /** Swap transaction hash */
    swapHash: Hex | null;
    /** Execute the swap (handles approval if needed) */
    executeSwap: (params: SwapParams) => Promise<SwapResult | null>;
    /** Check if approval is needed */
    checkAllowance: (tokenIn: Address, amount: bigint) => Promise<boolean>;
    /** Reset state */
    reset: () => void;
}

export interface SwapParams {
    /** Input token address */
    tokenIn: Address;
    /** Output token address */
    tokenOut: Address;
    /** Amount of input tokens */
    amountIn: bigint;
    /** Minimum output amount (with slippage) */
    minAmountOut: bigint;
    /** Recipient address (defaults to connected wallet) */
    recipient?: Address;
    /** Deadline in seconds from now (default: 20 minutes) */
    deadlineMinutes?: number;
}

/**
 * Hook for executing swaps on Tempo DEX
 * 
 * @example
 * ```tsx
 * const { executeSwap, step, isLoading, error } = useTempoSwap({
 *   onSwapConfirmed: (hash) => {
 *     toast.success('Swap complete!');
 *   },
 *   onError: (err) => {
 *     toast.error(err.message);
 *   },
 * });
 * 
 * const handleSwap = async () => {
 *   await executeSwap({
 *     tokenIn: pathUSD.address,
 *     tokenOut: alphaUSD.address,
 *     amountIn: parseUnits('100', 6),
 *     minAmountOut: parseUnits('99.5', 6), // 0.5% slippage
 *   });
 * };
 * ```
 */
export function useTempoSwap(options: UseTempoSwapOptions = {}): UseTempoSwapResult {
    const {
        router = TEMPO_DEX_ROUTER_TESTNET,
        chainId = 42429,
        onApprovalSubmitted,
        onApprovalConfirmed,
        onSwapSubmitted,
        onSwapConfirmed,
        onError,
    } = options;

    const { address: userAddress } = useAccount();
    const publicClient = usePublicClient({ chainId });
    const { writeContractAsync } = useWriteContract();

    const [step, setStep] = useState<SwapStep>('idle');
    const [error, setError] = useState<DecodedError | null>(null);
    const [approvalHash, setApprovalHash] = useState<Hex | null>(null);
    const [swapHash, setSwapHash] = useState<Hex | null>(null);

    const isLoading = ['checking', 'approving', 'swapping'].includes(step);

    const reset = useCallback(() => {
        setStep('idle');
        setError(null);
        setApprovalHash(null);
        setSwapHash(null);
    }, []);

    /**
     * Check if token approval is needed
     */
    const checkAllowance = useCallback(async (
        tokenIn: Address,
        amount: bigint
    ): Promise<boolean> => {
        if (!publicClient || !userAddress) return false;

        try {
            const allowance = await publicClient.readContract({
                address: tokenIn,
                abi: erc20Abi,
                functionName: 'allowance',
                args: [userAddress, router],
            }) as bigint;

            return allowance >= amount;
        } catch {
            return false;
        }
    }, [publicClient, userAddress, router]);

    /**
     * Approve token spending
     */
    const approveToken = useCallback(async (tokenIn: Address): Promise<Hex | null> => {
        if (!userAddress) return null;

        setStep('approving');

        try {
            const hash = await writeContractAsync({
                address: tokenIn,
                abi: erc20Abi,
                functionName: 'approve',
                args: [router, maxUint256],
                chainId,
            });

            setApprovalHash(hash);
            onApprovalSubmitted?.(hash);

            // Wait for confirmation
            if (publicClient) {
                const receipt = await publicClient.waitForTransactionReceipt({ hash });
                if (receipt.status === 'success') {
                    onApprovalConfirmed?.(hash);
                    setStep('approved');
                    return hash;
                } else {
                    throw new Error('Approval transaction failed');
                }
            }

            return hash;
        } catch (err) {
            const decoded = decodeError(err);
            setError(decoded);
            setStep('error');
            onError?.(decoded);
            return null;
        }
    }, [userAddress, router, chainId, writeContractAsync, publicClient, onApprovalSubmitted, onApprovalConfirmed, onError]);

    /**
     * Execute the swap
     */
    const executeSwap = useCallback(async (params: SwapParams): Promise<SwapResult | null> => {
        const {
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            recipient,
            deadlineMinutes = 20,
        } = params;

        if (!userAddress || !publicClient) {
            const decoded = decodeError(new Error('Wallet not connected'));
            setError(decoded);
            setStep('error');
            onError?.(decoded);
            return null;
        }

        const swapRecipient = recipient || userAddress;
        const deadline = getSwapDeadline(deadlineMinutes);

        setError(null);
        setStep('checking');

        try {
            // Check allowance
            const hasAllowance = await checkAllowance(tokenIn, amountIn);

            if (!hasAllowance) {
                // Need approval first
                const approveResult = await approveToken(tokenIn);
                if (!approveResult) {
                    return null; // Error already set
                }
            }

            // Execute swap
            setStep('swapping');

            const hash = await writeContractAsync({
                address: router,
                abi: tempoDexRouterAbi,
                functionName: 'swapExactIn',
                args: [tokenIn, tokenOut, amountIn, minAmountOut, swapRecipient, deadline],
                chainId,
            });

            setSwapHash(hash);
            onSwapSubmitted?.(hash);

            // Wait for confirmation
            const receipt = await publicClient.waitForTransactionReceipt({ hash });

            if (receipt.status === 'success') {
                // Try to extract amountOut from logs
                // For now, return without amountOut
                setStep('success');
                onSwapConfirmed?.(hash);
                return { txHash: hash };
            } else {
                throw new Error('Swap transaction failed');
            }

        } catch (err) {
            const decoded = decodeError(err);
            setError(decoded);
            setStep('error');
            onError?.(decoded);
            return null;
        }
    }, [
        userAddress,
        publicClient,
        router,
        chainId,
        checkAllowance,
        approveToken,
        writeContractAsync,
        onSwapSubmitted,
        onSwapConfirmed,
        onError,
    ]);

    return {
        step,
        isLoading,
        error,
        approvalHash,
        swapHash,
        executeSwap,
        checkAllowance,
        reset,
    };
}

