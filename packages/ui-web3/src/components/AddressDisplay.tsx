'use client';

import { useCallback, useState } from 'react';
import { useChainId } from 'wagmi';
import { getExplorerUrl } from '@hst/web3-config';
import { formatAddress } from '@hst/hooks-web3';
import type { Address } from 'viem';

export interface AddressDisplayProps {
    /** Ethereum address */
    address: Address;
    /** Whether to truncate the address */
    truncate?: boolean;
    /** Number of chars to show at start (if truncate) */
    startChars?: number;
    /** Number of chars to show at end (if truncate) */
    endChars?: number;
    /** Show copy button */
    copyable?: boolean;
    /** Link to block explorer */
    linkToExplorer?: boolean;
    /** Override chain ID for explorer link */
    chainId?: number;
    /** Custom class name */
    className?: string;
}

/**
 * Address display component with truncation, copy, and explorer link
 */
export function AddressDisplay({
    address,
    truncate = true,
    startChars = 6,
    endChars = 4,
    copyable = true,
    linkToExplorer = true,
    chainId: chainIdProp,
    className = '',
}: AddressDisplayProps) {
    const connectedChainId = useChainId();
    const chainId = chainIdProp ?? connectedChainId;
    const [copied, setCopied] = useState(false);

    const displayAddress = truncate
        ? formatAddress(address, startChars, endChars)
        : address;

    const explorerUrl = linkToExplorer
        ? getExplorerUrl(chainId, 'address', address)
        : undefined;

    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(address);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = address;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [address]);

    return (
        <span className={`hst-address ${className}`}>
            {linkToExplorer && explorerUrl ? (
                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hst-address__link"
                >
                    {displayAddress}
                </a>
            ) : (
                <span className="hst-address__text">{displayAddress}</span>
            )}

            {copyable && (
                <button
                    type="button"
                    onClick={handleCopy}
                    className={`hst-address__copy ${copied ? 'hst-address__copy--copied' : ''}`}
                    title={copied ? 'Copied!' : 'Copy address'}
                >
                    {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
            )}
        </span>
    );
}

// Copy icon
function CopyIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

// Check icon
function CheckIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
