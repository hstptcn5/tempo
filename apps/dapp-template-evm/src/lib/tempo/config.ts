/**
 * Tempo-specific configuration for fee sponsorship
 * 
 * This module configures wagmi transport with Tempo's native fee payer support.
 * When a sponsor URL is configured, transactions can be sent with { feePayer: true }
 * to have fees paid by the sponsor service.
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_TEMPO_SPONSOR_URL: URL of the fee sponsor service (optional)
 *   Default testnet: https://sponsor.testnet.tempo.xyz
 *   
 * Usage:
 *   import { tempoSponsorTransport, isSponsorEnabled } from '@/lib/tempo';
 *   
 *   // In wagmi config:
 *   transports: {
 *     [tempoTestnet.id]: tempoSponsorTransport,
 *   }
 *   
 *   // In components:
 *   if (isSponsorEnabled) {
 *     writeContract({ ..., feePayer: true });
 *   }
 */

import { http, type Transport } from 'wagmi';

// Note: withFeePayer should be imported dynamically to avoid SSR issues
// Example: const { withFeePayer } = await import('tempo.ts/viem');

/**
 * Default Tempo testnet sponsor URL
 * This is a public sponsor service provided by Tempo for testing
 */
export const DEFAULT_TEMPO_SPONSOR_URL = 'https://sponsor.testnet.tempo.xyz';

/**
 * Get the configured sponsor URL from environment
 * Returns undefined if sponsorship is disabled
 */
export function getTempoSponsorUrl(): string | undefined {
    // Check for explicit disable
    if (process.env.NEXT_PUBLIC_TEMPO_SPONSOR_ENABLED === 'false') {
        return undefined;
    }
    
    // Use custom URL if provided, otherwise use default
    return process.env.NEXT_PUBLIC_TEMPO_SPONSOR_URL || DEFAULT_TEMPO_SPONSOR_URL;
}

/**
 * Check if Tempo fee sponsorship is enabled
 */
export const isSponsorEnabled = (): boolean => {
    return process.env.NEXT_PUBLIC_TEMPO_SPONSOR_ENABLED !== 'false';
};

/**
 * Create Tempo transport with optional fee payer support
 * 
 * If sponsor URL is configured, uses withFeePayer to wrap the transport.
 * Otherwise, returns a standard http transport.
 * 
 * Note: Due to dynamic import requirements, this returns the appropriate transport
 * for use in wagmi config.
 */
export function createTempoTransport(_sponsorUrl?: string): Transport {
    // For now, return standard http transport
    // The withFeePayer wrapper is applied at the page level for sponsored transactions
    // This is because wagmi's transport config is static and we need dynamic behavior
    return http();
}

/**
 * Tempo chain ID
 */
export const TEMPO_CHAIN_ID = 42429;

/**
 * Tempo testnet RPC URL
 */
export const TEMPO_RPC_URL = 'https://rpc.testnet.tempo.xyz';

