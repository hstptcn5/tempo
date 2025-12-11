import { pad, toHex, type Hex } from 'viem';

/**
 * Result of encoding a string to bytes32 memo
 */
export interface EncodedMemo {
    /** The encoded bytes32 hex string */
    bytes32: Hex;
    /** Number of bytes used (before padding) */
    byteLen: number;
    /** Whether the input was truncated */
    truncated: boolean;
    /** Original input (for reference) */
    input: string;
}

/**
 * Validation result for memo input
 */
export interface MemoValidation {
    /** Whether the input is valid */
    isValid: boolean;
    /** Error message if invalid */
    error?: string;
    /** Number of bytes the string will use */
    byteLen: number;
    /** Whether input exceeds 32 bytes */
    exceedsLimit: boolean;
}

/**
 * Options for memo encoding
 */
export interface EncodeMemoOptions {
    /** If true, reject non-ASCII characters (default: false) */
    asciiOnly?: boolean;
    /** If true, throw error when >32 bytes instead of returning error (default: false) */
    throwOnOverflow?: boolean;
}

/**
 * Get the byte length of a UTF-8 string
 */
export function getByteLength(str: string): number {
    return new TextEncoder().encode(str).length;
}

/**
 * Check if a string contains only ASCII characters (0-127)
 */
export function isAsciiOnly(str: string): boolean {
    return /^[\x00-\x7F]*$/.test(str);
}

/**
 * Validate a memo string before encoding
 */
export function validateMemo(
    input: string,
    options: EncodeMemoOptions = {}
): MemoValidation {
    const { asciiOnly = false } = options;
    const byteLen = getByteLength(input);

    // Check ASCII-only constraint
    if (asciiOnly && !isAsciiOnly(input)) {
        return {
            isValid: false,
            error: 'Memo must contain only ASCII characters',
            byteLen,
            exceedsLimit: byteLen > 32,
        };
    }

    // Check byte length
    if (byteLen > 32) {
        return {
            isValid: false,
            error: `Memo exceeds 32 bytes (${byteLen} bytes)`,
            byteLen,
            exceedsLimit: true,
        };
    }

    return {
        isValid: true,
        byteLen,
        exceedsLimit: false,
    };
}

/**
 * Encode a string into a bytes32 memo for TIP-20 transferWithMemo
 * 
 * @param input - The string to encode (max 32 bytes)
 * @param options - Encoding options
 * @returns Encoded memo with metadata, or throws if invalid and throwOnOverflow is true
 * 
 * @example
 * ```ts
 * const result = encodeMemoBytes32('INV-12345');
 * // { bytes32: '0x494e562d31323334350000...', byteLen: 9, truncated: false, input: 'INV-12345' }
 * ```
 */
export function encodeMemoBytes32(
    input: string,
    options: EncodeMemoOptions = {}
): EncodedMemo {
    const { asciiOnly = false, throwOnOverflow = false } = options;

    // Handle empty input
    if (!input) {
        return {
            bytes32: '0x0000000000000000000000000000000000000000000000000000000000000000',
            byteLen: 0,
            truncated: false,
            input: '',
        };
    }

    // Validate
    const validation = validateMemo(input, { asciiOnly });

    if (!validation.isValid) {
        if (throwOnOverflow) {
            throw new Error(validation.error);
        }
        // For overflow without throw, we'll still encode but mark as truncated
    }

    // Get bytes
    const encoder = new TextEncoder();
    let bytes = encoder.encode(input);
    let truncated = false;

    // Truncate if needed
    if (bytes.length > 32) {
        bytes = bytes.slice(0, 32);
        truncated = true;
    }

    // Convert to hex and pad to 32 bytes
    const hex = toHex(bytes);
    const bytes32 = pad(hex, { size: 32, dir: 'right' });

    return {
        bytes32,
        byteLen: Math.min(validation.byteLen, 32),
        truncated,
        input,
    };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use encodeMemoBytes32 instead
 */
export function encodeStringToMemo(input: string): Hex {
    return encodeMemoBytes32(input).bytes32;
}

/**
 * Decode a bytes32 memo back to string (for display purposes)
 * Note: This is a best-effort decode and may not perfectly reconstruct unicode
 */
export function decodeMemoBytes32(bytes32: Hex): string {
    // Remove 0x prefix and trailing zeros
    const hex = bytes32.slice(2).replace(/0+$/, '');
    if (!hex) return '';

    // Convert hex pairs to bytes
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.slice(i, i + 2), 16));
    }

    // Decode UTF-8
    return new TextDecoder().decode(new Uint8Array(bytes));
}

