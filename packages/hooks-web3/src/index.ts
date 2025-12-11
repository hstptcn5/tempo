'use client';

// Hooks
export { useTokenBalance, useNativeBalance, type UseTokenBalanceOptions, type UseTokenBalanceResult } from './useTokenBalance';
export { useTokenApproval, type UseTokenApprovalOptions, type UseTokenApprovalResult } from './useTokenApproval';
export { useContractWrite, useSimpleContractWrite, type UseContractWriteOptions, type UseContractWriteResult, type TxStatus } from './useContractWrite';
export { useWrongNetwork, useChainSwitch, type UseWrongNetworkOptions, type UseWrongNetworkResult } from './useWrongNetwork';
export {
    useTip20TransferWithMemo,
    // New memo utilities
    encodeMemoBytes32,
    encodeStringToMemo,
    type UseTip20TransferWithMemoOptions,
    type Tip20TransferWithMemoResult,
    type EncodedMemo,
    type MemoValidation,
    type EncodeMemoOptions,
} from './useTip20TransferWithMemo';
export {
    useRecentTip20Payments,
    type UseRecentTip20PaymentsOptions,
    type UseRecentTip20PaymentsResult,
    type PaymentLog,
} from './useRecentTip20Payments';

// Utils
export { formatUnitsSafe, parseUserAmount, formatAddress, formatBalance, formatUsd, formatPercent, formatGwei } from './utils/format';
export { decodeError, isUserRejection, isInsufficientFunds, isCompliancePolicyError, type DecodedError } from './utils/errorDecoder';

// TIP-403 Compliance utilities
export {
    classifyComplianceError,
    isComplianceError,
    getComplianceErrorMessage,
    TIP403ErrorCode,
    COMPLIANCE_STATUS_MESSAGES,
    type ComplianceError,
    type ComplianceStatus,
    type ComplianceCheckResult,
} from './utils/tempoCompliance';

// Compliance check hook
export { useComplianceCheck, type UseComplianceCheckOptions, type UseComplianceCheckResult } from './useComplianceCheck';

// Tempo DEX swap hooks
export {
    useTempoSwapQuote,
    type SwapQuote,
    type UseTempoSwapQuoteOptions,
    type UseTempoSwapQuoteResult,
} from './useTempoSwapQuote';

export {
    useTempoSwap,
    type SwapStep,
    type SwapParams,
    type SwapResult,
    type UseTempoSwapOptions,
    type UseTempoSwapResult,
} from './useTempoSwap';

// TIP-20 Token Creation
export {
    useTip20CreateToken,
    type CreateTokenStep,
    type CreateTokenResult,
    type UseTip20CreateTokenOptions,
    type UseTip20CreateTokenResult,
} from './useTip20CreateToken';
export { validateMemo, getByteLength, isAsciiOnly, decodeMemoBytes32 } from './utils/memo';
