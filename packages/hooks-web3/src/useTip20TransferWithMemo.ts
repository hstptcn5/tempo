'use client';

import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import { type Address, type Hex } from 'viem';
import { tip20Abi } from '@hst/abis';
import { decodeError, type DecodedError } from './utils/errorDecoder';
import { encodeMemoBytes32 } from './utils/memo';
import type { TxStatus } from './useContractWrite';

// Re-export memo utilities for convenience
export { encodeMemoBytes32, encodeStringToMemo } from './utils/memo';
export type { EncodedMemo, MemoValidation, EncodeMemoOptions } from './utils/memo';

export interface UseTip20TransferWithMemoOptions {
    /** TIP-20 token address */
    token: Address;
    /** Callback on transaction submitted */
    onSubmitted?: (hash: Address) => void;
    /** Callback on success */
    onSuccess?: (hash: Address) => void;
    /** Callback on error */
    onError?: (error: DecodedError) => void;
}

export interface Tip20TransferWithMemoResult {
    /** Current transaction status */
    status: TxStatus;
    /** Transaction hash if submitted */
    txHash: Address | undefined;
    /** Error information */
    error: DecodedError | null;
    /** Is currently writing/waiting */
    isLoading: boolean;
    /** Transfer function with raw bytes32 memo */
    send: (to: Address, amount: bigint, memo: Hex) => Promise<Address | undefined>;
    /** Transfer with string memo (auto-encoded to bytes32) */
    sendWithStringMemo: (to: Address, amount: bigint, memoString: string) => Promise<Address | undefined>;
    /** @deprecated Use send() instead */
    transfer: (to: Address, amount: bigint, memo: Hex) => Promise<Address | undefined>;
    /** @deprecated Use sendWithStringMemo() instead */
    transferWithStringMemo: (to: Address, amount: bigint, memoString: string) => Promise<Address | undefined>;
    /** Reset state */
    reset: () => void;
}

/**
 * Hook for TIP-20 transferWithMemo on Tempo
 * Supports invoice IDs, order references, and other payment metadata
 */
export function useTip20TransferWithMemo(
    options: UseTip20TransferWithMemoOptions
): Tip20TransferWithMemoResult {
    const { token, onSubmitted, onSuccess, onError } = options;

    const { isConnected } = useAccount();
    const chainId = useChainId();
    const [status, setStatus] = useState<TxStatus>('idle');
    const [error, setError] = useState<DecodedError | null>(null);

    const {
        data: txHash,
        writeContractAsync,
        reset: resetWrite,
    } = useWriteContract();

    const { isSuccess } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    // Update status on confirmation
    if (isSuccess && status === 'pending') {
        setStatus('success');
        if (txHash && onSuccess) {
            onSuccess(txHash);
        }
    }

    const send = useCallback(
        async (to: Address, amount: bigint, memo: Hex): Promise<Address | undefined> => {
            if (!isConnected) {
                const decoded = decodeError(new Error('Wallet not connected'));
                setError(decoded);
                onError?.(decoded);
                return undefined;
            }

            setStatus('signing');
            setError(null);

            try {
                const hash = await writeContractAsync({
                    address: token,
                    abi: tip20Abi,
                    functionName: 'transferWithMemo',
                    args: [to, amount, memo],
                    chainId,
                });

                setStatus('pending');
                onSubmitted?.(hash);

                return hash;
            } catch (err) {
                const decoded = decodeError(err);

                // Don't set error state for user rejection (just reset)
                if (decoded.isUserRejection) {
                    setStatus('idle');
                    return undefined;
                }

                setStatus('error');
                setError(decoded);
                onError?.(decoded);

                return undefined;
            }
        },
        [token, chainId, isConnected, writeContractAsync, onSubmitted, onError]
    );

    const sendWithStringMemo = useCallback(
        async (to: Address, amount: bigint, memoString: string): Promise<Address | undefined> => {
            const { bytes32 } = encodeMemoBytes32(memoString);
            return send(to, amount, bytes32);
        },
        [send]
    );

    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
        resetWrite();
    }, [resetWrite]);

    return {
        status,
        txHash,
        error,
        isLoading: status === 'signing' || status === 'pending',
        // New API
        send,
        sendWithStringMemo,
        // Legacy API (deprecated but preserved for backward compatibility)
        transfer: send,
        transferWithStringMemo: sendWithStringMemo,
        reset,
    };
}

