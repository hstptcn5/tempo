import {
    UserRejectedRequestError,
    ContractFunctionRevertedError,
    TransactionExecutionError,
    InsufficientFundsError,
    type BaseError,
} from 'viem';
import { classifyComplianceError, type ComplianceError } from './tempoCompliance';

export interface DecodedError {
    code: string;
    message: string;
    isUserRejection: boolean;
    isInsufficientFunds: boolean;
    isContractError: boolean;
    /** TIP-403 compliance error details (if applicable) */
    compliance?: ComplianceError;
    /** Whether this is a TIP-403 compliance policy violation */
    isComplianceError: boolean;
    originalError: unknown;
}

// Common RPC error codes
const RPC_ERROR_CODES: Record<number, string> = {
    4001: 'User rejected the request',
    4100: 'Unauthorized - please connect your wallet',
    4200: 'Unsupported method',
    4900: 'Disconnected from chain',
    4901: 'Chain not connected',
    [-32700]: 'Parse error',
    [-32600]: 'Invalid request',
    [-32601]: 'Method not found',
    [-32602]: 'Invalid params',
    [-32603]: 'Internal error',
    [-32000]: 'Invalid input',
    [-32001]: 'Resource not found',
    [-32002]: 'Resource unavailable',
    [-32003]: 'Transaction rejected',
    [-32004]: 'Method not supported',
    [-32005]: 'Request limit exceeded',
};

// Common revert reasons (non-compliance related)
const REVERT_REASONS: Record<string, string> = {
    'ERC20: insufficient allowance': 'Insufficient token allowance. Please approve first.',
    'ERC20: transfer amount exceeds balance': 'Insufficient token balance',
    'ERC20: transfer amount exceeds allowance': 'Insufficient token allowance',
    'execution reverted': 'Transaction failed',
    'insufficient funds': 'Insufficient funds for gas',
    'nonce too low': 'Transaction nonce conflict. Please try again.',
    'replacement fee too low': 'Gas price too low for replacement',
    'already known': 'Transaction already submitted',
    'Ownable: caller is not the owner': 'Only the contract owner can perform this action',
    'Pausable: paused': 'Contract is paused',
    'ReentrancyGuard: reentrant call': 'Reentrancy detected',
};

/**
 * Check if an error message indicates a TIP-403 compliance issue
 * and return enhanced error info if so
 */
function checkComplianceError(message: string): { isCompliance: boolean; compliance?: ComplianceError } {
    const compliance = classifyComplianceError(message);
    return {
        isCompliance: compliance.isComplianceError,
        compliance: compliance.isComplianceError ? compliance : undefined,
    };
}

/**
 * Decode and format blockchain errors into user-friendly messages
 * 
 * This function handles:
 * - User rejections (wallet cancel)
 * - Insufficient funds/gas
 * - Contract reverts
 * - TIP-403 compliance policy violations (Tempo-specific)
 * 
 * For TIP-403 errors, the `compliance` field contains detailed classification
 * and user-friendly messages about the policy violation.
 */
export function decodeError(error: unknown): DecodedError {
    const result: DecodedError = {
        code: 'UNKNOWN_ERROR',
        message: 'An unknown error occurred',
        isUserRejection: false,
        isInsufficientFunds: false,
        isContractError: false,
        isComplianceError: false,
        originalError: error,
    };

    if (!error) return result;

    // User rejection
    if (error instanceof UserRejectedRequestError) {
        return {
            ...result,
            code: 'USER_REJECTED',
            message: 'Transaction was rejected',
            isUserRejection: true,
        };
    }

    // Insufficient funds
    if (error instanceof InsufficientFundsError) {
        return {
            ...result,
            code: 'INSUFFICIENT_FUNDS',
            message: 'Insufficient funds for gas',
            isInsufficientFunds: true,
        };
    }

    // Contract revert
    if (error instanceof ContractFunctionRevertedError) {
        const reason = error.reason || error.message;

        // Check for TIP-403 compliance errors first
        const { isCompliance, compliance } = checkComplianceError(reason);
        if (isCompliance && compliance) {
            return {
                ...result,
                code: compliance.code,
                message: compliance.message,
                isContractError: true,
                isComplianceError: true,
                compliance,
            };
        }

        const friendlyMessage = findRevertReason(reason);

        return {
            ...result,
            code: 'CONTRACT_REVERT',
            message: friendlyMessage,
            isContractError: true,
        };
    }

    // Transaction execution error
    if (error instanceof TransactionExecutionError) {
        const shortMessage = (error as BaseError).shortMessage || error.message;

        // Check for known patterns
        if (shortMessage.toLowerCase().includes('user rejected')) {
            return {
                ...result,
                code: 'USER_REJECTED',
                message: 'Transaction was rejected',
                isUserRejection: true,
            };
        }

        if (shortMessage.toLowerCase().includes('insufficient funds')) {
            return {
                ...result,
                code: 'INSUFFICIENT_FUNDS',
                message: 'Insufficient funds for gas',
                isInsufficientFunds: true,
            };
        }

        return {
            ...result,
            code: 'TX_EXECUTION_ERROR',
            message: shortMessage,
        };
    }

    // Generic error with code
    if (typeof error === 'object' && error !== null) {
        const err = error as Record<string, unknown>;

        // RPC error codes
        if (typeof err.code === 'number' && RPC_ERROR_CODES[err.code]) {
            return {
                ...result,
                code: `RPC_${err.code}`,
                message: RPC_ERROR_CODES[err.code],
                isUserRejection: err.code === 4001,
            };
        }

        // Error with message
        if (typeof err.message === 'string') {
            // Check for TIP-403 compliance errors
            const { isCompliance, compliance } = checkComplianceError(err.message);
            if (isCompliance && compliance) {
                return {
                    ...result,
                    code: compliance.code,
                    message: compliance.message,
                    isContractError: true,
                    isComplianceError: true,
                    compliance,
                };
            }

            const friendlyMessage = findRevertReason(err.message);
            return {
                ...result,
                code: 'ERROR',
                message: friendlyMessage,
            };
        }

        // Shortmessage from viem
        if (typeof err.shortMessage === 'string') {
            return {
                ...result,
                code: 'ERROR',
                message: err.shortMessage,
            };
        }
    }

    // String error
    if (typeof error === 'string') {
        return {
            ...result,
            code: 'ERROR',
            message: findRevertReason(error),
        };
    }

    return result;
}

/**
 * Find a friendly message for known revert reasons
 */
function findRevertReason(message: string): string {
    const lowerMessage = message.toLowerCase();

    for (const [pattern, friendly] of Object.entries(REVERT_REASONS)) {
        if (lowerMessage.includes(pattern.toLowerCase())) {
            return friendly;
        }
    }

    // Clean up the message if it's a raw revert
    if (message.includes('reverted with reason string')) {
        const match = message.match(/reverted with reason string '([^']+)'/);
        if (match) return match[1];
    }

    // Truncate long messages
    if (message.length > 100) {
        return message.slice(0, 100) + '...';
    }

    return message;
}

/**
 * Check if error is a user rejection
 */
export function isUserRejection(error: unknown): boolean {
    return decodeError(error).isUserRejection;
}

/**
 * Check if error is insufficient funds
 */
export function isInsufficientFunds(error: unknown): boolean {
    return decodeError(error).isInsufficientFunds;
}

/**
 * Check if error is a TIP-403 compliance policy violation
 */
export function isCompliancePolicyError(error: unknown): boolean {
    return decodeError(error).isComplianceError;
}
