/**
 * Tempo TIP-403 Compliance Policy Error Handling
 * 
 * TIP-403 is Tempo's compliance standard that allows token issuers to configure
 * transfer policies. Transfers can be blocked based on:
 * 
 * - Sender/recipient allowlists or blocklists
 * - Transaction amount limits (min/max per tx)
 * - Time-based restrictions (e.g., holding periods)
 * - Geographic restrictions (KYC/AML compliance)
 * - Custom policy contract logic
 * 
 * When a TIP-403 policy blocks a transfer, the transaction reverts with a specific
 * error. This module helps classify and display user-friendly messages for these
 * compliance-related failures.
 * 
 * @see https://docs.tempo.xyz/guide/issuance (TIP-403 Compliance)
 * 
 * IMPORTANT: Apps MUST handle compliance reverts gracefully.
 * - Do NOT assume all transfers will succeed
 * - Display clear error messages to users
 * - Consider adding pre-flight checks (dry-run simulation)
 * - Log compliance failures for support purposes
 */

/**
 * TIP-403 compliance error codes
 */
export enum TIP403ErrorCode {
    /** Generic policy violation */
    POLICY_VIOLATION = 'TIP403_POLICY_VIOLATION',
    /** Sender not allowed to transfer */
    SENDER_NOT_ALLOWED = 'TIP403_SENDER_NOT_ALLOWED',
    /** Recipient not allowed to receive */
    RECIPIENT_NOT_ALLOWED = 'TIP403_RECIPIENT_NOT_ALLOWED',
    /** Transfer amount exceeds limit */
    AMOUNT_LIMIT_EXCEEDED = 'TIP403_AMOUNT_LIMIT_EXCEEDED',
    /** Transfer amount below minimum */
    AMOUNT_BELOW_MINIMUM = 'TIP403_AMOUNT_BELOW_MINIMUM',
    /** Sender is frozen/blocked */
    SENDER_FROZEN = 'TIP403_SENDER_FROZEN',
    /** Recipient is frozen/blocked */
    RECIPIENT_FROZEN = 'TIP403_RECIPIENT_FROZEN',
    /** Transfer not allowed at this time */
    TIME_RESTRICTION = 'TIP403_TIME_RESTRICTION',
    /** Holding period not elapsed */
    HOLDING_PERIOD = 'TIP403_HOLDING_PERIOD',
    /** KYC/AML check failed */
    KYC_REQUIRED = 'TIP403_KYC_REQUIRED',
    /** Unknown compliance error */
    UNKNOWN = 'TIP403_UNKNOWN',
}

/**
 * Compliance error patterns to match against revert messages
 * These patterns are based on common TIP-403 implementation error strings
 */
const TIP403_ERROR_PATTERNS: Array<{
    patterns: string[];
    code: TIP403ErrorCode;
    message: string;
}> = [
    // Sender not allowed
    {
        patterns: [
            'sender not allowed',
            'sender blocked',
            'sender not whitelisted',
            'from address not allowed',
            'sender not in allowlist',
            'sender is blacklisted',
        ],
        code: TIP403ErrorCode.SENDER_NOT_ALLOWED,
        message: 'Your wallet is not authorized to send this token. Contact the token issuer.',
    },
    // Recipient not allowed
    {
        patterns: [
            'recipient not allowed',
            'recipient blocked',
            'recipient not whitelisted',
            'to address not allowed',
            'recipient not in allowlist',
            'recipient is blacklisted',
            'receiver not allowed',
        ],
        code: TIP403ErrorCode.RECIPIENT_NOT_ALLOWED,
        message: 'The recipient is not authorized to receive this token. They may need to complete verification.',
    },
    // Sender frozen
    {
        patterns: [
            'sender frozen',
            'account frozen',
            'sender account locked',
            'from address frozen',
        ],
        code: TIP403ErrorCode.SENDER_FROZEN,
        message: 'Your account has been frozen. Contact the token issuer for assistance.',
    },
    // Recipient frozen
    {
        patterns: [
            'recipient frozen',
            'receiver frozen',
            'to address frozen',
        ],
        code: TIP403ErrorCode.RECIPIENT_FROZEN,
        message: 'The recipient account is frozen and cannot receive transfers.',
    },
    // Amount limits
    {
        patterns: [
            'amount exceeds limit',
            'transfer amount too high',
            'exceeds maximum',
            'max transfer',
            'amount too large',
        ],
        code: TIP403ErrorCode.AMOUNT_LIMIT_EXCEEDED,
        message: 'Transfer amount exceeds the maximum allowed. Try a smaller amount.',
    },
    {
        patterns: [
            'amount below minimum',
            'transfer amount too low',
            'below minimum',
            'min transfer',
            'amount too small',
        ],
        code: TIP403ErrorCode.AMOUNT_BELOW_MINIMUM,
        message: 'Transfer amount is below the minimum required.',
    },
    // Time restrictions
    {
        patterns: [
            'holding period',
            'lock period',
            'vesting period',
            'tokens locked',
            'transfer locked',
        ],
        code: TIP403ErrorCode.HOLDING_PERIOD,
        message: 'Your tokens are still in the holding period. Please wait before transferring.',
    },
    {
        patterns: [
            'time restriction',
            'transfer window',
            'outside allowed hours',
            'trading paused',
        ],
        code: TIP403ErrorCode.TIME_RESTRICTION,
        message: 'Transfers are temporarily restricted. Please try again later.',
    },
    // KYC/AML
    {
        patterns: [
            'kyc required',
            'kyc not completed',
            'verification required',
            'identity not verified',
            'aml check',
        ],
        code: TIP403ErrorCode.KYC_REQUIRED,
        message: 'Identity verification (KYC) is required to transfer this token.',
    },
    // Generic policy violation
    {
        patterns: [
            'policy',
            'compliance',
            'transfer not allowed',
            'transfer denied',
            'TIP-403',
            'TIP403',
        ],
        code: TIP403ErrorCode.POLICY_VIOLATION,
        message: 'This transfer is not allowed by the token\'s compliance policy.',
    },
];

/**
 * Result of compliance error classification
 */
export interface ComplianceError {
    /** Whether this is a compliance-related error */
    isComplianceError: boolean;
    /** TIP-403 error code */
    code: TIP403ErrorCode;
    /** User-friendly error message */
    message: string;
    /** Original error message for debugging */
    originalMessage: string;
}

/**
 * Classify a revert message into a TIP-403 compliance error
 * 
 * @param errorMessage - The error message or revert reason
 * @returns Classified compliance error
 */
export function classifyComplianceError(errorMessage: string): ComplianceError {
    const lowerMessage = errorMessage.toLowerCase();
    
    for (const { patterns, code, message } of TIP403_ERROR_PATTERNS) {
        for (const pattern of patterns) {
            if (lowerMessage.includes(pattern.toLowerCase())) {
                return {
                    isComplianceError: true,
                    code,
                    message,
                    originalMessage: errorMessage,
                };
            }
        }
    }
    
    return {
        isComplianceError: false,
        code: TIP403ErrorCode.UNKNOWN,
        message: errorMessage,
        originalMessage: errorMessage,
    };
}

/**
 * Check if an error is a TIP-403 compliance error
 */
export function isComplianceError(errorMessage: string): boolean {
    return classifyComplianceError(errorMessage).isComplianceError;
}

/**
 * Get a user-friendly message for a compliance error
 */
export function getComplianceErrorMessage(errorMessage: string): string {
    return classifyComplianceError(errorMessage).message;
}

/**
 * Compliance check status for UI display
 */
export type ComplianceStatus = 'unknown' | 'checking' | 'allowed' | 'blocked' | 'error';

/**
 * Result of a compliance pre-check
 */
export interface ComplianceCheckResult {
    status: ComplianceStatus;
    message: string;
    details?: string;
}

/**
 * Default compliance check messages by status
 */
export const COMPLIANCE_STATUS_MESSAGES: Record<ComplianceStatus, string> = {
    unknown: 'Compliance status unknown',
    checking: 'Checking compliance...',
    allowed: 'Transfer likely allowed',
    blocked: 'Transfer may be blocked by policy',
    error: 'Could not check compliance',
};

