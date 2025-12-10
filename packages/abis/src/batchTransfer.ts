/**
 * BatchTransfer Contract ABI
 * 
 * Contract for batch transferring TIP-20/ERC-20 tokens to multiple recipients
 * in a single atomic transaction.
 * 
 * Usage:
 * 1. User approves BatchTransfer contract for total amount
 * 2. User calls batchTransfer() or batchTransferWithMemo()
 * 3. Contract pulls tokens from user and distributes to recipients
 * 
 * @see contracts/src/BatchTransfer.sol
 */

import type { Address } from 'viem';

/**
 * BatchTransfer contract addresses
 */
export const BATCH_TRANSFER_ADDRESSES = {
    /** 
     * Tempo Testnet - Deployed 2025-12-11
     * Deployer: 0xd8FF12Afb233f53666a22373e864c3e23DcF7495
     * Tx: 0x65f18a557911618666fccc04b0e3014069eb50fd6570c9b1afbff28d956f6b09
     */
    TEMPO_TESTNET: '0x0781f9dCdf906aCE484a63601102b385d25Bf34B' as Address,
} as const;

/**
 * Check if BatchTransfer contract is available
 */
export const BATCH_TRANSFER_AVAILABLE = {
    TEMPO_TESTNET: true, // ✅ Deployed!
} as const;

/**
 * BatchTransfer contract ABI
 */
export const batchTransferAbi = [
    // === Write Functions ===
    
    /**
     * Batch transfer tokens to multiple recipients
     */
    {
        type: 'function',
        name: 'batchTransfer',
        inputs: [
            { name: 'token', type: 'address' },
            { name: 'recipients', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    
    /**
     * Batch transfer TIP-20 tokens with memos
     */
    {
        type: 'function',
        name: 'batchTransferWithMemo',
        inputs: [
            { name: 'token', type: 'address' },
            { name: 'recipients', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
            { name: 'memos', type: 'bytes32[]' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    
    /**
     * Simple batch transfer (alternative)
     */
    {
        type: 'function',
        name: 'batchTransferSimple',
        inputs: [
            { name: 'token', type: 'address' },
            { name: 'recipients', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
    
    // === View Functions ===
    
    /**
     * Calculate total amount needed for a batch
     */
    {
        type: 'function',
        name: 'calculateTotal',
        inputs: [
            { name: 'amounts', type: 'uint256[]' },
        ],
        outputs: [
            { name: 'total', type: 'uint256' },
        ],
        stateMutability: 'pure',
    },
    
    /**
     * Check if user has sufficient allowance for batch
     */
    {
        type: 'function',
        name: 'checkAllowance',
        inputs: [
            { name: 'token', type: 'address' },
            { name: 'user', type: 'address' },
            { name: 'amounts', type: 'uint256[]' },
        ],
        outputs: [
            { name: 'sufficient', type: 'bool' },
            { name: 'required', type: 'uint256' },
            { name: 'actual', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    
    // === Events ===
    
    {
        type: 'event',
        name: 'BatchTransferExecuted',
        inputs: [
            { name: 'sender', type: 'address', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'recipientCount', type: 'uint256', indexed: false },
            { name: 'totalAmount', type: 'uint256', indexed: false },
        ],
    },
    
    {
        type: 'event',
        name: 'BatchTransferWithMemoExecuted',
        inputs: [
            { name: 'sender', type: 'address', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'recipientCount', type: 'uint256', indexed: false },
            { name: 'totalAmount', type: 'uint256', indexed: false },
        ],
    },
    
    // === Errors ===
    
    {
        type: 'error',
        name: 'LengthMismatch',
        inputs: [],
    },
    
    {
        type: 'error',
        name: 'EmptyBatch',
        inputs: [],
    },
    
    {
        type: 'error',
        name: 'TransferFailed',
        inputs: [
            { name: 'index', type: 'uint256' },
            { name: 'recipient', type: 'address' },
        ],
    },
    
    {
        type: 'error',
        name: 'InsufficientAllowance',
        inputs: [
            { name: 'required', type: 'uint256' },
            { name: 'actual', type: 'uint256' },
        ],
    },
    
    {
        type: 'error',
        name: 'ZeroAddress',
        inputs: [],
    },
    
    {
        type: 'error',
        name: 'ZeroAmount',
        inputs: [],
    },
] as const;

/**
 * Helper to check if BatchTransfer is available for a chain
 */
export function isBatchTransferAvailable(chainId: number): boolean {
    if (chainId === 42429) return BATCH_TRANSFER_AVAILABLE.TEMPO_TESTNET;
    return false;
}

/**
 * Get BatchTransfer address for a chain
 */
export function getBatchTransferAddress(chainId: number): Address | undefined {
    if (chainId === 42429) return BATCH_TRANSFER_ADDRESSES.TEMPO_TESTNET;
    return undefined;
}

