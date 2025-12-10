import { useState, useCallback, useMemo } from 'react';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { erc20Abi } from '@hst/abis';
import type { Address } from 'viem';
import { maxUint256 } from 'viem';
import { decodeError } from './utils/errorDecoder';

export interface UseTokenApprovalOptions {
    /** Token contract address */
    token: Address;
    /** Spender address (contract that will spend tokens) */
    spender: Address;
    /** Amount to check/approve */
    amount: bigint;
    /** Use infinite approval instead of exact amount */
    infinite?: boolean;
    /** Enabled state */
    enabled?: boolean;
}

export interface UseTokenApprovalResult {
    /** Current allowance */
    allowance: bigint | undefined;
    /** Whether current allowance >= required amount */
    isApproved: boolean;
    /** Whether approval is loading (checking or approving) */
    isLoading: boolean;
    /** Whether approval transaction is pending */
    isApproving: boolean;
    /** Whether waiting for tx confirmation */
    isConfirming: boolean;
    /** Transaction hash if submitted */
    txHash: Address | undefined;
    /** Error message */
    error: string | null;
    /** Approve function */
    approve: () => Promise<void>;
    /** Refetch allowance */
    refetch: () => void;
}

/**
 * Hook to handle ERC20 token approval flow
 * Checks allowance, provides approve function, handles tx states
 */
export function useTokenApproval(options: UseTokenApprovalOptions): UseTokenApprovalResult {
    const { token, spender, amount, infinite = false, enabled = true } = options;

    const { address: account } = useAccount();
    const [error, setError] = useState<string | null>(null);

    // Check current allowance
    const {
        data: allowance,
        isLoading: isAllowanceLoading,
        refetch: refetchAllowance,
    } = useReadContract({
        address: token,
        abi: erc20Abi,
        functionName: 'allowance',
        args: account && spender ? [account, spender] : undefined,
        query: {
            enabled: enabled && !!account && !!token && !!spender,
        },
    });

    // Approval transaction
    const {
        data: txHash,
        isPending: isApproving,
        writeContractAsync,
        reset: resetWrite,
    } = useWriteContract();

    // Wait for transaction
    const {
        isLoading: isConfirming,
        isSuccess: isConfirmed,
    } = useWaitForTransactionReceipt({
        hash: txHash,
    });

    // Refetch allowance after confirmation
    useMemo(() => {
        if (isConfirmed) {
            refetchAllowance();
            resetWrite();
        }
    }, [isConfirmed, refetchAllowance, resetWrite]);

    // Check if approved
    const isApproved = useMemo(() => {
        if (!allowance || !amount) return false;
        return allowance >= amount;
    }, [allowance, amount]);

    // Approve function
    const approve = useCallback(async () => {
        if (!account || !token || !spender) {
            setError('Wallet not connected');
            return;
        }

        setError(null);

        try {
            const approvalAmount = infinite ? maxUint256 : amount;

            await writeContractAsync({
                address: token,
                abi: erc20Abi,
                functionName: 'approve',
                args: [spender, approvalAmount],
            });
        } catch (err) {
            const decoded = decodeError(err);
            setError(decoded.message);

            // Don't show error for user rejection
            if (decoded.isUserRejection) {
                setError(null);
            }
        }
    }, [account, token, spender, amount, infinite, writeContractAsync]);

    return {
        allowance,
        isApproved,
        isLoading: isAllowanceLoading,
        isApproving,
        isConfirming,
        txHash,
        error,
        approve,
        refetch: refetchAllowance,
    };
}
