'use client';

import { useCallback, useState, type ChangeEvent } from 'react';
import { formatUnits } from 'viem';
import { formatBalance, parseUserAmount } from '@hst/hooks-web3';
import type { TokenInfo } from '@hst/abis';

export interface TokenInputProps {
    /** Current input value (string) */
    value: string;
    /** Change handler */
    onChange: (value: string) => void;
    /** Selected token info */
    token: TokenInfo | null;
    /** Handler for token selection click */
    onTokenSelect?: () => void;
    /** User's balance of this token */
    balance?: bigint;
    /** Show max button */
    showMax?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Error message */
    error?: string;
    /** Placeholder text */
    placeholder?: string;
    /** Label */
    label?: string;
    /** Custom class name */
    className?: string;
}

/**
 * Token input component with amount input, token selector, balance display, and max button
 */
export function TokenInput({
    value,
    onChange,
    token,
    onTokenSelect,
    balance,
    showMax = true,
    disabled = false,
    error,
    placeholder = '0.0',
    label,
    className = '',
}: TokenInputProps) {
    const [, setIsFocused] = useState(false);

    const decimals = token?.decimals ?? 18;
    const formattedBalance = balance !== undefined ? formatBalance(balance, decimals) : undefined;

    // Handle input change with validation
    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Allow empty or valid number formats
        if (inputValue === '' || inputValue === '.') {
            onChange(inputValue);
            return;
        }

        // Validate format: digits and single decimal point
        const regex = /^\d*\.?\d*$/;
        if (!regex.test(inputValue)) return;

        // Limit decimal places
        const parts = inputValue.split('.');
        if (parts.length === 2 && parts[1].length > decimals) {
            return;
        }

        onChange(inputValue);
    }, [onChange, decimals]);

    // Handle max click
    const handleMax = useCallback(() => {
        if (balance === undefined || balance === 0n) return;
        const maxValue = formatUnits(balance, decimals);
        onChange(maxValue);
    }, [balance, decimals, onChange]);

    // Check if amount exceeds balance
    const parsedAmount = parseUserAmount(value, decimals);
    const exceedsBalance = balance !== undefined && parsedAmount > balance;

    const hasError = !!error || exceedsBalance;

    return (
        <div className={`hst-token-input ${hasError ? 'hst-token-input--error' : ''} ${className}`}>
            {label && <label className="hst-token-input__label">{label}</label>}

            <div className="hst-token-input__row">
                <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    autoCorrect="off"
                    pattern="^[0-9]*[.,]?[0-9]*$"
                    placeholder={placeholder}
                    value={value}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    disabled={disabled}
                    className="hst-token-input__input"
                />

                <button
                    type="button"
                    onClick={onTokenSelect}
                    disabled={!onTokenSelect}
                    className="hst-token-input__token-btn"
                >
                    {token ? (
                        <>
                            {token.logoUrl && (
                                <img
                                    src={token.logoUrl}
                                    alt={token.symbol}
                                    className="hst-token-input__token-logo"
                                />
                            )}
                            <span>{token.symbol}</span>
                        </>
                    ) : (
                        <span>Select token</span>
                    )}
                    <ChevronDownIcon />
                </button>
            </div>

            <div className="hst-token-input__footer">
                <span>
                    {formattedBalance !== undefined && token && (
                        <>
                            Balance: {formattedBalance} {token.symbol}
                        </>
                    )}
                </span>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {showMax && balance !== undefined && balance > 0n && (
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    const halfBalance = balance / 2n;
                                    onChange(formatUnits(halfBalance, decimals));
                                }}
                                className="hst-token-input__max-btn"
                            >
                                50%
                            </button>
                            <button
                                type="button"
                                onClick={handleMax}
                                className="hst-token-input__max-btn"
                            >
                                MAX
                            </button>
                        </>
                    )}
                </div>
            </div>

            {(error || exceedsBalance) && (
                <span className="hst-token-input__error">
                    {error || 'Insufficient balance'}
                </span>
            )}
        </div>
    );
}

// Simple chevron icon
function ChevronDownIcon() {
    return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}
