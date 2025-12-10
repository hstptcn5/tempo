/**
 * TIP-20 Token Factory ABI and Addresses
 * 
 * The TIP-20 Factory allows creating new TIP-20 compliant stablecoin tokens
 * on the Tempo blockchain. Created tokens automatically inherit:
 * 
 * - Standard ERC-20 functionality
 * - TIP-20 extensions (transferWithMemo, fee payment in stablecoins)
 * - TIP-403 compliance hooks (optional policy controls)
 * 
 * Factory Address (Testnet): 0x20fc000000000000000000000000000000000000
 * 
 * @see https://docs.tempo.xyz/guide/issuance
 */

import type { Address } from 'viem';

/**
 * TIP-20 Factory contract addresses
 * 
 * NOTE: These are placeholder addresses. The actual Factory contract
 * may not be deployed yet on testnet. Check Tempo docs for the official
 * Factory address when available.
 * 
 * @see https://docs.tempo.xyz/guide/issuance
 */
export const TIP20_FACTORY_ADDRESSES = {
    /** 
     * Tempo Testnet (Andantino) - PLACEHOLDER
     * Replace with actual address when Factory is deployed
     */
    TESTNET: '0x20fc000000000000000000000000000000000000' as Address,
    /** Tempo Mainnet - TBD */
    // MAINNET: '0x...' as Address,
} as const;

/**
 * Check if Factory is available (has deployed code)
 * Returns false if Factory contract doesn't exist at the address
 */
export const FACTORY_AVAILABLE = {
    TESTNET: false, // Set to true when Factory is deployed
} as const;

/**
 * System token addresses on Tempo
 */
export const TEMPO_SYSTEM_TOKENS = {
    /** pathUSD - Primary quote token for new issuances */
    pathUSD: '0x20c0000000000000000000000000000000000000' as Address,
    /** AlphaUSD */
    AlphaUSD: '0x20c0000000000000000000000000000000000001' as Address,
    /** BetaUSD */
    BetaUSD: '0x20c0000000000000000000000000000000000002' as Address,
    /** ThetaUSD */
    ThetaUSD: '0x20c0000000000000000000000000000000000003' as Address,
} as const;

/**
 * TIP-403 Compliance Registry (if needed for policy setup)
 * Note: This is a placeholder - update with actual address when available
 */
export const TIP403_REGISTRY_ADDRESS = '0x20fd000000000000000000000000000000000000' as Address;

/**
 * Parameters for creating a new TIP-20 token
 */
export interface CreateTokenParams {
    /** Full name of the token (e.g., "My Stablecoin") */
    name: string;
    /** Token symbol (e.g., "MUSD") - typically 3-6 characters */
    symbol: string;
    /** Number of decimals (default: 6 for stablecoins, 18 for utility tokens) */
    decimals?: number;
    /** Currency denomination (default: "USD") */
    currency?: string;
    /** Quote token address for pricing (default: pathUSD) */
    quoteToken?: Address;
    /** Admin address with minting/burning rights (default: msg.sender) */
    admin?: Address;
    /** Initial supply to mint (default: 0) */
    initialSupply?: bigint;
}

/**
 * Result of token creation
 */
export interface TokenCreationResult {
    /** Address of the newly created token contract */
    tokenAddress: Address;
    /** Transaction hash */
    txHash: string;
    /** Block number where token was created */
    blockNumber: bigint;
}

/**
 * TIP-20 Factory ABI
 * 
 * This ABI covers the standard factory functions for creating and managing
 * TIP-20 tokens on Tempo.
 */
export const tip20FactoryAbi = [
    // === Token Creation ===
    
    /**
     * Create a new TIP-20 token
     * @param name - Token name
     * @param symbol - Token symbol
     * @param decimals - Number of decimals
     * @param admin - Admin address (receives minting rights)
     * @returns tokenAddress - Address of the new token contract
     */
    {
        type: 'function',
        name: 'createToken',
        inputs: [
            { name: 'name', type: 'string' },
            { name: 'symbol', type: 'string' },
            { name: 'decimals', type: 'uint8' },
            { name: 'admin', type: 'address' },
        ],
        outputs: [
            { name: 'tokenAddress', type: 'address' },
        ],
        stateMutability: 'nonpayable',
    },
    
    /**
     * Create a TIP-20 token with additional parameters
     * @param name - Token name
     * @param symbol - Token symbol
     * @param decimals - Number of decimals
     * @param admin - Admin address
     * @param currency - Currency denomination (e.g., "USD", "EUR")
     * @param quoteToken - Quote token for pricing
     * @returns tokenAddress - Address of the new token contract
     */
    {
        type: 'function',
        name: 'createTokenWithParams',
        inputs: [
            { name: 'name', type: 'string' },
            { name: 'symbol', type: 'string' },
            { name: 'decimals', type: 'uint8' },
            { name: 'admin', type: 'address' },
            { name: 'currency', type: 'string' },
            { name: 'quoteToken', type: 'address' },
        ],
        outputs: [
            { name: 'tokenAddress', type: 'address' },
        ],
        stateMutability: 'nonpayable',
    },
    
    /**
     * Create a TIP-20 token with initial supply
     * @param name - Token name
     * @param symbol - Token symbol
     * @param decimals - Number of decimals
     * @param admin - Admin address
     * @param initialSupply - Initial supply to mint to admin
     * @returns tokenAddress - Address of the new token contract
     */
    {
        type: 'function',
        name: 'createTokenWithSupply',
        inputs: [
            { name: 'name', type: 'string' },
            { name: 'symbol', type: 'string' },
            { name: 'decimals', type: 'uint8' },
            { name: 'admin', type: 'address' },
            { name: 'initialSupply', type: 'uint256' },
        ],
        outputs: [
            { name: 'tokenAddress', type: 'address' },
        ],
        stateMutability: 'nonpayable',
    },
    
    // === View Functions ===
    
    /**
     * Get all tokens created by an address
     */
    {
        type: 'function',
        name: 'getTokensByCreator',
        inputs: [
            { name: 'creator', type: 'address' },
        ],
        outputs: [
            { name: 'tokens', type: 'address[]' },
        ],
        stateMutability: 'view',
    },
    
    /**
     * Get token count created by an address
     */
    {
        type: 'function',
        name: 'getTokenCount',
        inputs: [
            { name: 'creator', type: 'address' },
        ],
        outputs: [
            { name: 'count', type: 'uint256' },
        ],
        stateMutability: 'view',
    },
    
    /**
     * Check if an address is a token created by this factory
     */
    {
        type: 'function',
        name: 'isFactoryToken',
        inputs: [
            { name: 'token', type: 'address' },
        ],
        outputs: [
            { name: '', type: 'bool' },
        ],
        stateMutability: 'view',
    },
    
    /**
     * Get the default quote token
     */
    {
        type: 'function',
        name: 'defaultQuoteToken',
        inputs: [],
        outputs: [
            { name: '', type: 'address' },
        ],
        stateMutability: 'view',
    },
    
    // === Events ===
    
    /**
     * Emitted when a new token is created
     */
    {
        type: 'event',
        name: 'TokenCreated',
        inputs: [
            { name: 'creator', type: 'address', indexed: true },
            { name: 'token', type: 'address', indexed: true },
            { name: 'name', type: 'string', indexed: false },
            { name: 'symbol', type: 'string', indexed: false },
            { name: 'decimals', type: 'uint8', indexed: false },
        ],
    },
] as const;

/**
 * Validate token creation parameters
 */
export function validateCreateTokenParams(params: CreateTokenParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Name validation
    if (!params.name || params.name.trim().length === 0) {
        errors.push('Token name is required');
    } else if (params.name.length > 64) {
        errors.push('Token name must be 64 characters or less');
    }
    
    // Symbol validation
    if (!params.symbol || params.symbol.trim().length === 0) {
        errors.push('Token symbol is required');
    } else if (params.symbol.length < 2) {
        errors.push('Token symbol must be at least 2 characters');
    } else if (params.symbol.length > 10) {
        errors.push('Token symbol must be 10 characters or less');
    } else if (!/^[A-Za-z0-9]+$/.test(params.symbol)) {
        errors.push('Token symbol must contain only letters and numbers');
    }
    
    // Decimals validation
    if (params.decimals !== undefined) {
        if (params.decimals < 0 || params.decimals > 18) {
            errors.push('Decimals must be between 0 and 18');
        }
    }
    
    // Initial supply validation
    if (params.initialSupply !== undefined && params.initialSupply < 0n) {
        errors.push('Initial supply cannot be negative');
    }
    
    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Get default token creation parameters
 */
export function getDefaultCreateTokenParams(admin: Address): Partial<CreateTokenParams> {
    return {
        decimals: 6,
        currency: 'USD',
        quoteToken: TEMPO_SYSTEM_TOKENS.pathUSD,
        admin,
        initialSupply: 0n,
    };
}

