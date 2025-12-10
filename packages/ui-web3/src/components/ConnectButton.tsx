'use client';

import { ConnectButton as RainbowConnectButton } from '@rainbow-me/rainbowkit';

export interface ConnectButtonProps {
    /** Show balance */
    showBalance?: boolean | 'responsive';
    /** Label for connect button */
    label?: string;
    /** Account status: 'avatar' | 'address' | 'full' */
    accountStatus?: 'avatar' | 'address' | 'full';
    /** Chain status: 'icon' | 'name' | 'full' | 'none' */
    chainStatus?: 'icon' | 'name' | 'full' | 'none';
    /** Custom class name */
    className?: string;
}

/**
 * Custom connect button wrapper around RainbowKit
 * Provides consistent styling and additional options
 */
export function ConnectButton({
    showBalance = false,
    label = 'Connect Wallet',
    accountStatus: _accountStatus = 'address',
    chainStatus = 'icon',
    className = '',
}: ConnectButtonProps) {
    return (
        <RainbowConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
                authenticationStatus,
            }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected =
                    ready &&
                    account &&
                    chain &&
                    (!authenticationStatus || authenticationStatus === 'authenticated');

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                        className={className}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button
                                        onClick={openConnectModal}
                                        type="button"
                                        className="hst-connect-btn"
                                    >
                                        <WalletIcon />
                                        {label}
                                    </button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button
                                        onClick={openChainModal}
                                        type="button"
                                        className="hst-connect-btn hst-connect-btn--wrong-network"
                                        style={{ background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' }}
                                    >
                                        <WarningIcon />
                                        Wrong Network
                                    </button>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {chainStatus !== 'none' && (
                                        <button
                                            onClick={openChainModal}
                                            type="button"
                                            className="hst-connect-btn hst-connect-btn--connected"
                                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                                        >
                                            {chain.hasIcon && (
                                                <div
                                                    style={{
                                                        width: 20,
                                                        height: 20,
                                                        borderRadius: '50%',
                                                        overflow: 'hidden',
                                                        background: chain.iconBackground,
                                                    }}
                                                >
                                                    {chain.iconUrl && (
                                                        <img
                                                            alt={chain.name ?? 'Chain icon'}
                                                            src={chain.iconUrl}
                                                            style={{ width: 20, height: 20 }}
                                                        />
                                                    )}
                                                </div>
                                            )}
                                            {(chainStatus === 'name' || chainStatus === 'full') && chain.name}
                                        </button>
                                    )}

                                    <button
                                        onClick={openAccountModal}
                                        type="button"
                                        className="hst-connect-btn hst-connect-btn--connected"
                                    >
                                        {showBalance && account.displayBalance && (
                                            <span className="hst-connect-btn__balance">
                                                {account.displayBalance}
                                            </span>
                                        )}
                                        <span className="hst-connect-btn__address">
                                            {account.displayName}
                                        </span>
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </RainbowConnectButton.Custom>
    );
}

// Simple wrapper that uses default RainbowKit button
export function SimpleConnectButton() {
    return <RainbowConnectButton />;
}

// Icons
function WalletIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
        </svg>
    );
}

function WarningIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}
