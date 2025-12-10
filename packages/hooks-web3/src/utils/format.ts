import { formatUnits, parseUnits, type Address } from 'viem';

/**
 * Safely format BigInt to string with decimals
 * Handles edge cases and avoids scientific notation
 */
export function formatUnitsSafe(
    value: bigint | undefined | null,
    decimals: number = 18,
    displayDecimals?: number
): string {
    if (value === undefined || value === null) return '0';

    try {
        const formatted = formatUnits(value, decimals);

        if (displayDecimals !== undefined) {
            const num = parseFloat(formatted);
            if (num === 0) return '0';

            // For very small numbers, show more decimals
            if (num < 0.001 && num > 0) {
                return num.toFixed(Math.min(displayDecimals + 4, 18));
            }

            return num.toFixed(displayDecimals);
        }

        return formatted;
    } catch {
        return '0';
    }
}

/**
 * Parse user input to BigInt with proper decimal handling
 */
export function parseUserAmount(
    input: string,
    decimals: number = 18
): bigint {
    if (!input || input === '' || input === '.') return 0n;

    try {
        // Clean input
        let cleaned = input.replace(/,/g, '').trim();

        // Handle trailing decimal
        if (cleaned.endsWith('.')) {
            cleaned = cleaned.slice(0, -1);
        }

        // Validate input
        if (!/^\d*\.?\d*$/.test(cleaned)) {
            return 0n;
        }

        return parseUnits(cleaned, decimals);
    } catch {
        return 0n;
    }
}

/**
 * Format address with truncation
 */
export function formatAddress(
    address: Address | string | undefined,
    startChars: number = 6,
    endChars: number = 4
): string {
    if (!address) return '';
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format balance with appropriate precision
 * Shows more decimals for small amounts
 */
export function formatBalance(
    value: bigint | undefined | null,
    decimals: number = 18,
    options?: {
        compact?: boolean;
        maxDecimals?: number;
    }
): string {
    if (value === undefined || value === null || value === 0n) return '0';

    const { compact = false, maxDecimals = 4 } = options ?? {};
    const num = parseFloat(formatUnits(value, decimals));

    if (compact) {
        if (num >= 1_000_000_000) {
            return `${(num / 1_000_000_000).toFixed(2)}B`;
        }
        if (num >= 1_000_000) {
            return `${(num / 1_000_000).toFixed(2)}M`;
        }
        if (num >= 1_000) {
            return `${(num / 1_000).toFixed(2)}K`;
        }
    }

    // For very small numbers
    if (num < 0.0001 && num > 0) {
        return `<0.0001`;
    }

    // Dynamic precision based on value
    if (num < 1) {
        return num.toFixed(Math.min(maxDecimals + 2, 8));
    }
    if (num < 100) {
        return num.toFixed(maxDecimals);
    }
    if (num < 10000) {
        return num.toFixed(2);
    }

    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Format USD value
 */
export function formatUsd(value: number | undefined | null): string {
    if (value === undefined || value === null) return '$0.00';

    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}

/**
 * Format percentage
 */
export function formatPercent(
    value: number | undefined | null,
    decimals: number = 2
): string {
    if (value === undefined || value === null) return '0%';
    return `${value.toFixed(decimals)}%`;
}

/**
 * Format gas price (in Gwei)
 */
export function formatGwei(value: bigint | undefined): string {
    if (!value) return '0';
    return formatUnits(value, 9);
}
