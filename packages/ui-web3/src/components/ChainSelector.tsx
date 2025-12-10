'use client';

import { useState, useRef, useEffect } from 'react';
import { useChainId, useSwitchChain, useAccount } from 'wagmi';
import { chains, type ExtendedChain } from '@hst/web3-config';
import type { Chain } from 'viem';

export interface ChainSelectorProps {
    /** List of chains to show */
    supportedChains?: readonly Chain[];
    /** Called when chain changes */
    onChainChange?: (chainId: number) => void;
    /** Show wrong network warning */
    showWrongNetworkWarning?: boolean;
    /** Custom class name */
    className?: string;
}

/**
 * Chain selector dropdown with network switching
 */
export function ChainSelector({
    supportedChains,
    onChainChange,
    showWrongNetworkWarning = true,
    className = '',
}: ChainSelectorProps) {
    const chainId = useChainId();
    const { isConnected } = useAccount();
    const { switchChainAsync, isPending } = useSwitchChain();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Default to common chains if not provided
    const chainList = supportedChains ?? [
        chains.mainnet,
        chains.polygon,
        chains.bsc,
        chains.arbitrum,
        chains.base,
    ];

    const currentChain = chainList.find((c) => c.id === chainId);
    const isWrongNetwork = isConnected && !currentChain;

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChainSelect = async (targetChainId: number) => {
        if (targetChainId === chainId) {
            setIsOpen(false);
            return;
        }

        try {
            await switchChainAsync({ chainId: targetChainId });
            onChainChange?.(targetChainId);
        } catch (error) {
            // User rejected or error occurred
            console.error('Failed to switch chain:', error);
        }
        setIsOpen(false);
    };

    return (
        <div className={`hst-chain-selector ${className}`} ref={dropdownRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={isPending || !isConnected}
                className={`hst-chain-selector__trigger ${isWrongNetwork && showWrongNetworkWarning ? 'hst-chain-selector__trigger--wrong' : ''}`}
            >
                {isPending ? (
                    <LoadingIcon />
                ) : currentChain ? (
                    <>
                        <img
                            src={(currentChain as ExtendedChain).iconUrl ?? getDefaultChainIcon(currentChain.id)}
                            alt={currentChain.name}
                            className="hst-chain-selector__icon"
                        />
                        <span className="hst-chain-selector__name">{currentChain.name}</span>
                    </>
                ) : isWrongNetwork ? (
                    <>
                        <WarningIcon />
                        <span className="hst-chain-selector__name">Wrong Network</span>
                    </>
                ) : (
                    <span className="hst-chain-selector__name">Select Network</span>
                )}
                <ChevronDownIcon />
            </button>

            {isOpen && (
                <div className="hst-chain-selector__dropdown">
                    {chainList.map((chain) => (
                        <button
                            key={chain.id}
                            type="button"
                            onClick={() => handleChainSelect(chain.id)}
                            className={`hst-chain-selector__option ${chain.id === chainId ? 'hst-chain-selector__option--active' : ''}`}
                        >
                            <img
                                src={(chain as ExtendedChain).iconUrl ?? getDefaultChainIcon(chain.id)}
                                alt={chain.name}
                                className="hst-chain-selector__icon"
                            />
                            <span>{chain.name}</span>
                            {chain.id === chainId && <CheckIcon />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

// Get default chain icon URL
function getDefaultChainIcon(chainId: number): string {
    const iconMap: Record<number, string> = {
        1: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
        137: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
        56: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/smartchain/info/logo.png',
        42161: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
        8453: 'https://raw.githubusercontent.com/base-org/brand-kit/main/logo/symbol/Base_Symbol_Blue.png',
    };
    return iconMap[chainId] ?? 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
}

// Icons
function ChevronDownIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
    );
}

function WarningIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto' }}>
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}
