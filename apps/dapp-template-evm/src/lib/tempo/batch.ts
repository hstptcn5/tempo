/**
 * Tempo Batch Transaction Utilities
 * 
 * Supports two modes:
 * - Sequential: Send transactions one by one
 * - Atomic: Bundle all transfers in a single BatchTransfer contract call (all-or-nothing)
 * 
 * Uses custom BatchTransfer contract that handles approvals correctly:
 * 1. User approves BatchTransfer contract for total amount
 * 2. BatchTransfer uses transferFrom to send tokens to each recipient
 */

import { encodeFunctionData, type Address, type Hex, parseUnits } from 'viem';
import { tip20Abi, batchTransferAbi, BATCH_TRANSFER_ADDRESSES, BATCH_TRANSFER_AVAILABLE } from '@hst/abis';
import { encodeMemoBytes32, validateMemo } from '@hst/hooks-web3';

// BatchTransfer contract - deployed on Tempo Testnet
export const BATCH_TRANSFER_ADDRESS = BATCH_TRANSFER_ADDRESSES.TEMPO_TESTNET;
export const BATCH_TRANSFER_ENABLED = BATCH_TRANSFER_AVAILABLE.TEMPO_TESTNET;

// Legacy Multicall3 address (not used for atomic batch anymore)
export const MULTICALL3_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

// Multicall3 aggregate3 ABI
export const multicall3Abi = [
    {
        type: 'function',
        name: 'aggregate3',
        inputs: [
            {
                name: 'calls',
                type: 'tuple[]',
                components: [
                    { name: 'target', type: 'address' },
                    { name: 'allowFailure', type: 'bool' },
                    { name: 'callData', type: 'bytes' },
                ],
            },
        ],
        outputs: [
            {
                name: 'returnData',
                type: 'tuple[]',
                components: [
                    { name: 'success', type: 'bool' },
                    { name: 'returnData', type: 'bytes' },
                ],
            },
        ],
        stateMutability: 'payable',
    },
] as const;

/**
 * Batch recipient input
 */
export interface BatchRecipientInput {
    address: string;
    amount: string;
    memo?: string;
}

/**
 * Validated batch recipient
 */
export interface ValidatedBatchRecipient {
    address: Address;
    amount: bigint;
    memo?: Hex;
    hasMemo: boolean;
    error?: string;
    isValid: boolean;
}

/**
 * Call data for Multicall3
 */
export interface MulticallCall {
    target: Address;
    allowFailure: boolean;
    callData: Hex;
}

/**
 * Batch validation result
 */
export interface BatchValidationResult {
    isValid: boolean;
    recipients: ValidatedBatchRecipient[];
    totalAmount: bigint;
    calls: MulticallCall[];
    errors: string[];
}

/**
 * Validation options
 */
export interface BatchValidationOptions {
    tokenAddress: Address;
    tokenDecimals: number;
    userBalance?: bigint;
    /** If true, all calls must succeed (no allowFailure) */
    strictMode?: boolean;
}

/**
 * Validate a single recipient
 */
export function validateRecipient(
    input: BatchRecipientInput,
    decimals: number
): ValidatedBatchRecipient {
    const errors: string[] = [];

    // Validate address
    let address: Address | undefined;
    if (!input.address) {
        errors.push('Address is required');
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(input.address)) {
        errors.push('Invalid address format');
    } else {
        address = input.address as Address;
    }

    // Validate amount
    let amount: bigint = 0n;
    if (!input.amount) {
        errors.push('Amount is required');
    } else {
        try {
            amount = parseUnits(input.amount, decimals);
            if (amount <= 0n) {
                errors.push('Amount must be greater than 0');
            }
        } catch {
            errors.push('Invalid amount format');
        }
    }

    // Validate memo (if present)
    let memo: Hex | undefined;
    let hasMemo = false;
    if (input.memo && input.memo.trim().length > 0) {
        const memoValidation = validateMemo(input.memo);
        if (memoValidation.exceedsLimit) {
            errors.push(`Memo exceeds 32 bytes (${memoValidation.byteLen} bytes)`);
        } else {
            const encoded = encodeMemoBytes32(input.memo);
            memo = encoded.bytes32;
            hasMemo = true;
        }
    }

    return {
        address: address || '0x0000000000000000000000000000000000000000' as Address,
        amount,
        memo,
        hasMemo,
        error: errors.length > 0 ? errors.join('; ') : undefined,
        isValid: errors.length === 0 && !!address && amount > 0n,
    };
}

/**
 * Build transfer call data
 */
export function buildTransferCallData(
    to: Address,
    amount: bigint,
    memo?: Hex
): Hex {
    if (memo) {
        return encodeFunctionData({
            abi: tip20Abi,
            functionName: 'transferWithMemo',
            args: [to, amount, memo],
        });
    } else {
        return encodeFunctionData({
            abi: tip20Abi,
            functionName: 'transfer',
            args: [to, amount],
        });
    }
}

/**
 * Validate and build batch calls from recipient inputs
 */
export function validateAndBuildBatch(
    inputs: BatchRecipientInput[],
    options: BatchValidationOptions
): BatchValidationResult {
    const { tokenAddress, tokenDecimals, userBalance, strictMode = true } = options;

    const recipients: ValidatedBatchRecipient[] = [];
    const calls: MulticallCall[] = [];
    const errors: string[] = [];
    let totalAmount = 0n;

    // Validate each recipient
    for (let i = 0; i < inputs.length; i++) {
        const input = inputs[i];
        const validated = validateRecipient(input, tokenDecimals);
        recipients.push(validated);

        if (validated.isValid) {
            totalAmount += validated.amount;

            // Build call data
            const callData = buildTransferCallData(
                validated.address,
                validated.amount,
                validated.memo
            );

            calls.push({
                target: tokenAddress,
                allowFailure: !strictMode,
                callData,
            });
        } else if (validated.error) {
            errors.push(`Row ${i + 1}: ${validated.error}`);
        }
    }

    // Check total against balance
    if (userBalance !== undefined && totalAmount > userBalance) {
        errors.push(`Total amount (${totalAmount}) exceeds balance (${userBalance})`);
    }

    // Check for empty batch
    if (calls.length === 0) {
        errors.push('No valid recipients');
    }

    return {
        isValid: errors.length === 0 && calls.length > 0,
        recipients,
        totalAmount,
        calls,
        errors,
    };
}

/**
 * Parse CSV content into batch recipients
 * Format: address,amount,memo (memo is optional)
 */
export function parseCSV(content: string): BatchRecipientInput[] {
    const lines = content.trim().split('\n');
    const results: BatchRecipientInput[] = [];

    for (const line of lines) {
        // Skip empty lines and headers
        const trimmed = line.trim();
        if (!trimmed || trimmed.toLowerCase().startsWith('address')) continue;

        // Handle both comma and tab delimiters
        const parts = trimmed.includes('\t')
            ? trimmed.split('\t').map(p => p.trim())
            : trimmed.split(',').map(p => p.trim());

        if (parts.length >= 2) {
            results.push({
                address: parts[0] || '',
                amount: parts[1] || '',
                memo: parts[2] || undefined,
            });
        }
    }

    return results;
}

/**
 * Encode Multicall3 aggregate3 call
 */
export function encodeMulticallData(calls: MulticallCall[]): Hex {
    return encodeFunctionData({
        abi: multicall3Abi,
        functionName: 'aggregate3',
        args: [calls],
    });
}

/**
 * Batch mode type
 */
export type BatchMode = 'sequential' | 'atomic';

/**
 * Get batch mode description
 */
export function getBatchModeDescription(mode: BatchMode): string {
    switch (mode) {
        case 'sequential':
            return 'Transactions are sent one by one. If one fails, others may still succeed.';
        case 'atomic':
            return 'All transfers bundled in one transaction. If any fails, all are reverted (all-or-nothing).';
    }
}

/**
 * Build arrays for BatchTransfer contract call
 */
export function buildBatchTransferArrays(
    validatedRecipients: ValidatedBatchRecipient[]
): {
    recipients: Address[];
    amounts: bigint[];
    memos: Hex[];
    hasMemos: boolean;
} {
    const recipients: Address[] = [];
    const amounts: bigint[] = [];
    const memos: Hex[] = [];
    let hasMemos = false;

    for (const r of validatedRecipients) {
        if (r.isValid) {
            recipients.push(r.address);
            amounts.push(r.amount);
            memos.push(r.memo || '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex);
            if (r.hasMemo) hasMemos = true;
        }
    }

    return { recipients, amounts, memos, hasMemos };
}

/**
 * Encode BatchTransfer call data
 */
export function encodeBatchTransferData(
    tokenAddress: Address,
    recipients: Address[],
    amounts: bigint[],
    memos?: Hex[]
): Hex {
    if (memos && memos.some(m => m !== '0x0000000000000000000000000000000000000000000000000000000000000000')) {
        // Use batchTransferWithMemo
        return encodeFunctionData({
            abi: batchTransferAbi,
            functionName: 'batchTransferWithMemo',
            args: [tokenAddress, recipients, amounts, memos],
        });
    } else {
        // Use basic batchTransfer
        return encodeFunctionData({
            abi: batchTransferAbi,
            functionName: 'batchTransfer',
            args: [tokenAddress, recipients, amounts],
        });
    }
}

// Re-export ABI for use in page
export { batchTransferAbi } from '@hst/abis';

