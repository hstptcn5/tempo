'use client';

import React from 'react';
import { useChainId } from 'wagmi';
import { getExplorerUrl } from '@hst/web3-config';
import type { TxStatus } from '@hst/hooks-web3';
import type { Address } from 'viem';

export interface TxToastProps {
    /** Transaction status */
    status: TxStatus;
    /** Transaction hash */
    txHash?: Address;
    /** Title override */
    title?: string;
    /** Message override */
    message?: string;
    /** Error message */
    error?: string;
    /** Chain ID for explorer link */
    chainId?: number;
    /** Custom class name */
    className?: string;
    /** On close callback */
    onClose?: () => void;
}

/**
 * Transaction toast component showing signing, pending, success, error states
 */
export function TxToast({
    status,
    txHash,
    title,
    message,
    error,
    chainId: chainIdProp,
    className = '',
    onClose,
}: TxToastProps) {
    const connectedChainId = useChainId();
    const chainId = chainIdProp ?? connectedChainId;

    const explorerUrl = txHash
        ? getExplorerUrl(chainId, 'tx', txHash)
        : undefined;

    const config = getStatusConfig(status, title, message, error);

    return (
        <div className={`hst-tx-toast ${className}`}>
            <div className={`hst-tx-toast__icon hst-tx-toast__icon--${status}`}>
                {config.icon}
            </div>

            <div className="hst-tx-toast__content">
                <div className="hst-tx-toast__title">{config.title}</div>
                <div className="hst-tx-toast__message">{config.message}</div>

                {txHash && explorerUrl && (
                    <a
                        href={explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hst-tx-toast__link"
                    >
                        View on Explorer
                        <ExternalLinkIcon />
                    </a>
                )}
            </div>

            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="hst-tx-toast__close"
                    aria-label="Close"
                >
                    <CloseIcon />
                </button>
            )}
        </div>
    );
}

/**
 * Hook to manage transaction toast state
 */
export function useTxToast() {
    const [toasts, setToasts] = React.useState<Map<string, TxToastProps>>(new Map());

    const show = React.useCallback((id: string, props: TxToastProps) => {
        setToasts((prev) => new Map(prev).set(id, props));
    }, []);

    const update = React.useCallback((id: string, props: Partial<TxToastProps>) => {
        setToasts((prev) => {
            const existing = prev.get(id);
            if (!existing) return prev;
            return new Map(prev).set(id, { ...existing, ...props });
        });
    }, []);

    const hide = React.useCallback((id: string) => {
        setToasts((prev) => {
            const next = new Map(prev);
            next.delete(id);
            return next;
        });
    }, []);

    const hideAll = React.useCallback(() => {
        setToasts(new Map());
    }, []);

    return { toasts, show, update, hide, hideAll };
}

/**
 * Container for rendering transaction toasts
 */
export function TxToastContainer({
    toasts,
    onClose,
}: {
    toasts: Map<string, TxToastProps>;
    onClose: (id: string) => void;
}) {
    return (
        <div
            style={{
                position: 'fixed',
                bottom: '1rem',
                right: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                zIndex: 9999,
            }}
        >
            {Array.from(toasts.entries()).map(([id, props]) => (
                <TxToast key={id} {...props} onClose={() => onClose(id)} />
            ))}
        </div>
    );
}

// Get config based on status
function getStatusConfig(
    status: TxStatus,
    titleOverride?: string,
    messageOverride?: string,
    error?: string
) {
    switch (status) {
        case 'signing':
            return {
                icon: <WalletIcon />,
                title: titleOverride ?? 'Confirm in Wallet',
                message: messageOverride ?? 'Please confirm the transaction in your wallet',
            };
        case 'pending':
            return {
                icon: <SpinnerIcon />,
                title: titleOverride ?? 'Transaction Pending',
                message: messageOverride ?? 'Waiting for confirmation...',
            };
        case 'success':
            return {
                icon: <CheckCircleIcon />,
                title: titleOverride ?? 'Transaction Confirmed',
                message: messageOverride ?? 'Your transaction was successful',
            };
        case 'error':
            return {
                icon: <ErrorIcon />,
                title: titleOverride ?? 'Transaction Failed',
                message: error ?? messageOverride ?? 'Something went wrong',
            };
        default:
            return {
                icon: null,
                title: '',
                message: '',
            };
    }
}

// Icons
function WalletIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
        </svg>
    );
}

function SpinnerIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
    );
}

function CheckCircleIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

function ErrorIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    );
}

function ExternalLinkIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
    );
}

function CloseIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
}
