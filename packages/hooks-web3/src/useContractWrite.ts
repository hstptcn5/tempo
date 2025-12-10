import { useState, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import type { Abi, Address, ContractFunctionArgs, ContractFunctionName } from 'viem';
import { decodeError, type DecodedError } from './utils/errorDecoder';

export type TxStatus = 'idle' | 'signing' | 'pending' | 'success' | 'error';

export interface UseContractWriteOptions<
    TAbi extends Abi,
    TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
> {
    /** Contract address */
    address: Address;
    /** Contract ABI */
    abi: TAbi;
    /** Function name */
    functionName: TFunctionName;
    /** Callback on success */
    onSuccess?: (hash: Address) => void;
    /** Callback on error */
    onError?: (error: DecodedError) => void;
    /** Callback when tx is submitted (hash received) */
    onSubmitted?: (hash: Address) => void;
}

export interface UseContractWriteResult<
    TAbi extends Abi,
    TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
> {
    /** Current transaction status */
    status: TxStatus;
    /** Transaction hash if submitted */
    txHash: Address | undefined;
    /** Error information */
    error: DecodedError | null;
    /** Is currently writing/waiting */
    isLoading: boolean;
    /** Write function */
    write: (args: ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>, value?: bigint) => Promise<Address | undefined>;
    /** Reset state */
    reset: () => void;
}

/**
 * Enhanced contract write hook with unified error handling and status tracking
 */
export function useContractWrite<
    TAbi extends Abi,
    TFunctionName extends ContractFunctionName<TAbi, 'nonpayable' | 'payable'>,
>(
    options: UseContractWriteOptions<TAbi, TFunctionName>
): UseContractWriteResult<TAbi, TFunctionName> {
    const { address, abi, functionName, onSuccess, onError, onSubmitted } = options;

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

    const write = useCallback(
        async (
            args: ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', TFunctionName>,
            value?: bigint
        ): Promise<Address | undefined> => {
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
                    address,
                    abi,
                    functionName,
                    args,
                    value,
                    chainId,
                } as Parameters<typeof writeContractAsync>[0]);

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
        [address, abi, functionName, chainId, isConnected, writeContractAsync, onSubmitted, onError]
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
        write,
        reset,
    };
}

/**
 * Simplified write hook for single contract calls
 */
export function useSimpleContractWrite() {
    const [status, setStatus] = useState<TxStatus>('idle');
    const [error, setError] = useState<DecodedError | null>(null);
    const [txHash, setTxHash] = useState<Address | undefined>();

    const { writeContractAsync } = useWriteContract();

    const { isSuccess, isLoading: isConfirming } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    if (isSuccess && status === 'pending') {
        setStatus('success');
    }

    const write = useCallback(
        async <TAbi extends Abi>(params: {
            address: Address;
            abi: TAbi;
            functionName: ContractFunctionName<TAbi, 'nonpayable' | 'payable'>;
            args?: ContractFunctionArgs<TAbi, 'nonpayable' | 'payable', ContractFunctionName<TAbi, 'nonpayable' | 'payable'>>;
            value?: bigint;
        }): Promise<Address | undefined> => {
            setStatus('signing');
            setError(null);

            try {
                const hash = await writeContractAsync(params as Parameters<typeof writeContractAsync>[0]);
                setTxHash(hash);
                setStatus('pending');
                return hash;
            } catch (err) {
                const decoded = decodeError(err);

                if (decoded.isUserRejection) {
                    setStatus('idle');
                    return undefined;
                }

                setStatus('error');
                setError(decoded);
                return undefined;
            }
        },
        [writeContractAsync]
    );

    const reset = useCallback(() => {
        setStatus('idle');
        setError(null);
        setTxHash(undefined);
    }, []);

    return {
        status,
        txHash,
        error,
        isLoading: status === 'signing' || status === 'pending',
        isConfirming,
        isSuccess,
        write,
        reset,
    };
}
