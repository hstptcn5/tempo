/**
 * Hook for checking TIP-403 compliance status before transfers
 * 
 * This hook performs a dry-run simulation of a transfer to check if it would
 * be allowed by the token's compliance policy. This helps apps show users
 * upfront whether their transfer is likely to succeed.
 * 
 * Note: The simulation is not 100% guaranteed - policy status can change
 * between the check and the actual transfer. Always handle reverts gracefully.
 */

import { useState, useCallback, useEffect } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { type Address, encodeFunctionData } from 'viem';
import { tip20Abi } from '@hst/abis';
import {
    type ComplianceStatus,
    type ComplianceCheckResult,
    classifyComplianceError,
    COMPLIANCE_STATUS_MESSAGES,
} from './utils/tempoCompliance';

export interface UseComplianceCheckOptions {
    /** Token contract address */
    token: Address;
    /** Recipient address to check */
    recipient?: Address;
    /** Amount to transfer (in wei) */
    amount?: bigint;
    /** Chain ID (defaults to connected chain) */
    chainId?: number;
    /** Whether to automatically check when inputs change */
    autoCheck?: boolean;
    /** Debounce delay in ms (default: 500) */
    debounceMs?: number;
}

export interface UseComplianceCheckResult {
    /** Current compliance check status */
    status: ComplianceStatus;
    /** User-friendly status message */
    message: string;
    /** Detailed error message if blocked */
    details?: string;
    /** Whether a check is in progress */
    isChecking: boolean;
    /** Manually trigger a compliance check */
    checkCompliance: () => Promise<ComplianceCheckResult>;
    /** Reset the check status */
    reset: () => void;
}

/**
 * Hook to check TIP-403 compliance before transfers
 * 
 * @example
 * ```tsx
 * const { status, message, checkCompliance } = useComplianceCheck({
 *   token: '0x...',
 *   recipient: recipientAddress,
 *   amount: parseUnits('100', 6),
 *   autoCheck: true,
 * });
 * 
 * // Display in UI
 * {status === 'allowed' && <span className="text-green-500">✓ Transfer allowed</span>}
 * {status === 'blocked' && <span className="text-red-500">✗ {message}</span>}
 * ```
 */
export function useComplianceCheck(options: UseComplianceCheckOptions): UseComplianceCheckResult {
    const {
        token,
        recipient,
        amount,
        chainId,
        autoCheck = false,
        debounceMs = 500,
    } = options;

    const publicClient = usePublicClient({ chainId });
    const { address: userAddress } = useAccount();

    const [status, setStatus] = useState<ComplianceStatus>('unknown');
    const [message, setMessage] = useState(COMPLIANCE_STATUS_MESSAGES.unknown);
    const [details, setDetails] = useState<string | undefined>();
    const [isChecking, setIsChecking] = useState(false);

    const reset = useCallback(() => {
        setStatus('unknown');
        setMessage(COMPLIANCE_STATUS_MESSAGES.unknown);
        setDetails(undefined);
    }, []);

    const checkCompliance = useCallback(async (): Promise<ComplianceCheckResult> => {
        // Validate inputs
        if (!publicClient) {
            return { status: 'error', message: 'No client available' };
        }
        if (!userAddress) {
            return { status: 'unknown', message: 'Connect wallet to check compliance' };
        }
        if (!recipient) {
            return { status: 'unknown', message: 'Enter recipient address' };
        }
        if (!amount || amount <= 0n) {
            return { status: 'unknown', message: 'Enter amount to check' };
        }

        setIsChecking(true);
        setStatus('checking');
        setMessage(COMPLIANCE_STATUS_MESSAGES.checking);

        try {
            // Simulate the transfer call
            // This will revert if the policy blocks it
            await publicClient.simulateContract({
                address: token,
                abi: tip20Abi,
                functionName: 'transfer',
                args: [recipient, amount],
                account: userAddress,
            });

            // If simulation succeeds, transfer is likely allowed
            const result: ComplianceCheckResult = {
                status: 'allowed',
                message: COMPLIANCE_STATUS_MESSAGES.allowed,
            };
            setStatus('allowed');
            setMessage(result.message);
            setDetails(undefined);
            setIsChecking(false);
            return result;

        } catch (err) {
            // Extract error message
            const errorMessage = err instanceof Error ? err.message : String(err);
            
            // Check if it's a compliance error
            const compliance = classifyComplianceError(errorMessage);
            
            if (compliance.isComplianceError) {
                const result: ComplianceCheckResult = {
                    status: 'blocked',
                    message: compliance.message,
                    details: compliance.originalMessage,
                };
                setStatus('blocked');
                setMessage(compliance.message);
                setDetails(compliance.originalMessage);
                setIsChecking(false);
                return result;
            }
            
            // Check for insufficient balance (not a compliance issue)
            if (errorMessage.toLowerCase().includes('insufficient') || 
                errorMessage.toLowerCase().includes('exceeds balance')) {
                const result: ComplianceCheckResult = {
                    status: 'error',
                    message: 'Insufficient balance for this transfer',
                };
                setStatus('error');
                setMessage(result.message);
                setIsChecking(false);
                return result;
            }

            // Generic error
            const result: ComplianceCheckResult = {
                status: 'error',
                message: 'Could not verify compliance',
                details: errorMessage,
            };
            setStatus('error');
            setMessage(result.message);
            setDetails(errorMessage);
            setIsChecking(false);
            return result;
        }
    }, [publicClient, userAddress, token, recipient, amount]);

    // Auto-check when inputs change (debounced)
    useEffect(() => {
        if (!autoCheck) return;
        if (!recipient || !amount || amount <= 0n) {
            reset();
            return;
        }

        const timer = setTimeout(() => {
            checkCompliance();
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [autoCheck, recipient, amount, debounceMs, checkCompliance, reset]);

    return {
        status,
        message,
        details,
        isChecking,
        checkCompliance,
        reset,
    };
}

