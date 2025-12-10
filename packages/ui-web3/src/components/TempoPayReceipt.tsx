'use client';

import { formatUnits } from 'viem';
import type { Address, Hex } from 'viem';
import { getExplorerUrl } from '@hst/web3-config';
import { decodeMemoBytes32, formatAddress } from '@hst/hooks-web3';

export interface PaymentDetails {
    /** Transaction hash */
    txHash: Address;
    /** Sender address */
    from: Address;
    /** Recipient address */
    to: Address;
    /** Amount in wei/smallest unit */
    amount: bigint;
    /** Token symbol */
    tokenSymbol: string;
    /** Token decimals */
    tokenDecimals: number;
    /** Memo as bytes32 */
    memo?: Hex;
    /** Transaction status */
    status: 'pending' | 'success' | 'failed';
    /** Block timestamp (unix) */
    timestamp?: number;
    /** Chain ID */
    chainId: number;
}

export interface TempoPayReceiptProps {
    /** Payment details */
    payment: PaymentDetails;
    /** Show full addresses */
    showFullAddresses?: boolean;
    /** Compact mode (less details) */
    compact?: boolean;
    /** Custom class name */
    className?: string;
    /** Accent color */
    accentColor?: string;
}

/**
 * Receipt component showing transaction summary + explorer link
 */
export function TempoPayReceipt({
    payment,
    showFullAddresses = false,
    compact = false,
    className = '',
    accentColor = '#10b981',
}: TempoPayReceiptProps) {
    const {
        txHash,
        from,
        to,
        amount,
        tokenSymbol,
        tokenDecimals,
        memo,
        status,
        timestamp,
        chainId,
    } = payment;

    // Defensive: ensure amount is a valid bigint
    const safeAmount = amount ?? 0n;
    const formattedAmount = formatUnits(safeAmount, tokenDecimals);
    const decodedMemo = memo ? decodeMemoBytes32(memo) : null;
    const explorerUrl = getExplorerUrl(chainId, 'tx', txHash);
    const formattedDate = timestamp
        ? new Date(timestamp * 1000).toLocaleString()
        : null;

    const statusConfig = {
        pending: { label: '⏳ Pending', color: '#f59e0b' },
        success: { label: '✓ Confirmed', color: accentColor },
        failed: { label: '✗ Failed', color: '#ef4444' },
    };

    const currentStatus = statusConfig[status];

    if (compact) {
        return (
            <div className={`tempo-receipt tempo-receipt--compact ${className}`}>
                <div className="tempo-receipt__row">
                    <span className="tempo-receipt__amount" style={{ color: accentColor }}>
                        {formattedAmount} {tokenSymbol}
                    </span>
                    <span className="tempo-receipt__status" style={{ color: currentStatus.color }}>
                        {currentStatus.label}
                    </span>
                </div>
                <div className="tempo-receipt__row">
                    <span className="tempo-receipt__to">
                        → {showFullAddresses ? to : formatAddress(to)}
                    </span>
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tempo-receipt__link"
                        style={{ color: accentColor }}
                    >
                        View ↗
                    </a>
                </div>
                {decodedMemo && (
                    <div className="tempo-receipt__memo">
                        📝 {decodedMemo}
                    </div>
                )}

                <style jsx>{`
                    .tempo-receipt--compact {
                        padding: 0.75rem;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 0.5rem;
                        font-size: 0.875rem;
                    }
                    .tempo-receipt__row {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 0.25rem;
                    }
                    .tempo-receipt__row:last-child {
                        margin-bottom: 0;
                    }
                    .tempo-receipt__amount {
                        font-weight: 600;
                    }
                    .tempo-receipt__to {
                        color: rgba(255, 255, 255, 0.5);
                        font-family: monospace;
                        font-size: 0.75rem;
                    }
                    .tempo-receipt__link {
                        font-size: 0.75rem;
                        text-decoration: none;
                    }
                    .tempo-receipt__link:hover {
                        text-decoration: underline;
                    }
                    .tempo-receipt__memo {
                        color: rgba(255, 255, 255, 0.6);
                        font-size: 0.75rem;
                        margin-top: 0.25rem;
                        padding-top: 0.25rem;
                        border-top: 1px solid rgba(255, 255, 255, 0.1);
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className={`tempo-receipt ${className}`}>
            {/* Header */}
            <div className="tempo-receipt__header">
                <h3 className="tempo-receipt__title">Payment Receipt</h3>
                <span className="tempo-receipt__status" style={{ color: currentStatus.color }}>
                    {currentStatus.label}
                </span>
            </div>

            {/* Amount */}
            <div className="tempo-receipt__amount-section">
                <span className="tempo-receipt__amount-value" style={{ color: accentColor }}>
                    {formattedAmount}
                </span>
                <span className="tempo-receipt__amount-symbol">{tokenSymbol}</span>
            </div>

            {/* Details */}
            <div className="tempo-receipt__details">
                <div className="tempo-receipt__detail">
                    <span className="tempo-receipt__label">From</span>
                    <span className="tempo-receipt__value tempo-receipt__value--mono">
                        {showFullAddresses ? from : formatAddress(from)}
                    </span>
                </div>
                <div className="tempo-receipt__detail">
                    <span className="tempo-receipt__label">To</span>
                    <span className="tempo-receipt__value tempo-receipt__value--mono">
                        {showFullAddresses ? to : formatAddress(to)}
                    </span>
                </div>
                {decodedMemo && (
                    <div className="tempo-receipt__detail">
                        <span className="tempo-receipt__label">Memo</span>
                        <span className="tempo-receipt__value">{decodedMemo}</span>
                    </div>
                )}
                {formattedDate && (
                    <div className="tempo-receipt__detail">
                        <span className="tempo-receipt__label">Time</span>
                        <span className="tempo-receipt__value">{formattedDate}</span>
                    </div>
                )}
                <div className="tempo-receipt__detail">
                    <span className="tempo-receipt__label">Tx Hash</span>
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tempo-receipt__value tempo-receipt__value--link"
                        style={{ color: accentColor }}
                    >
                        {txHash.slice(0, 10)}...{txHash.slice(-8)} ↗
                    </a>
                </div>
            </div>

            {/* Explorer Button */}
            <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tempo-receipt__explorer-btn"
                style={{ backgroundColor: accentColor }}
            >
                View on Explorer
            </a>

            <style jsx>{`
                .tempo-receipt {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 0.75rem;
                    padding: 1.25rem;
                }
                .tempo-receipt__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                .tempo-receipt__title {
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0;
                }
                .tempo-receipt__status {
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .tempo-receipt__amount-section {
                    text-align: center;
                    margin-bottom: 1rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }
                .tempo-receipt__amount-value {
                    font-size: 2rem;
                    font-weight: 700;
                }
                .tempo-receipt__amount-symbol {
                    font-size: 1.25rem;
                    color: rgba(255, 255, 255, 0.7);
                    margin-left: 0.5rem;
                }
                .tempo-receipt__details {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                .tempo-receipt__detail {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .tempo-receipt__label {
                    color: rgba(255, 255, 255, 0.5);
                    font-size: 0.875rem;
                }
                .tempo-receipt__value {
                    font-size: 0.875rem;
                    color: white;
                }
                .tempo-receipt__value--mono {
                    font-family: monospace;
                }
                .tempo-receipt__value--link {
                    text-decoration: none;
                }
                .tempo-receipt__value--link:hover {
                    text-decoration: underline;
                }
                .tempo-receipt__explorer-btn {
                    display: block;
                    width: 100%;
                    padding: 0.75rem;
                    text-align: center;
                    color: white;
                    font-weight: 600;
                    border-radius: 0.5rem;
                    text-decoration: none;
                    transition: opacity 0.2s;
                }
                .tempo-receipt__explorer-btn:hover {
                    opacity: 0.9;
                }
            `}</style>
        </div>
    );
}

