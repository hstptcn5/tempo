'use client';

import { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import { encodeMemoBytes32, validateMemo, getByteLength, type EncodedMemo } from '@hst/hooks-web3';

export interface MemoInputBytes32Props {
    /** Current input value */
    value: string;
    /** Change handler */
    onChange: (value: string) => void;
    /** Called when encoded memo changes */
    onEncodedChange?: (encoded: EncodedMemo) => void;
    /** Require ASCII-only input */
    asciiOnly?: boolean;
    /** Disabled state */
    disabled?: boolean;
    /** Placeholder text */
    placeholder?: string;
    /** Label */
    label?: string;
    /** Show bytes32 preview */
    showPreview?: boolean;
    /** Show byte counter */
    showByteCounter?: boolean;
    /** Custom class name */
    className?: string;
    /** Accent color for styling (CSS variable or color) */
    accentColor?: string;
}

/**
 * Memo input component with byte counter and bytes32 preview
 * For TIP-20 transferWithMemo on Tempo
 */
export function MemoInputBytes32({
    value,
    onChange,
    onEncodedChange,
    asciiOnly = false,
    disabled = false,
    placeholder = 'INV-12345',
    label = 'Invoice ID / Memo',
    showPreview = true,
    showByteCounter = true,
    className = '',
    accentColor = '#10b981', // emerald-500
}: MemoInputBytes32Props) {
    const [encoded, setEncoded] = useState<EncodedMemo>(() => encodeMemoBytes32(''));
    const [error, setError] = useState<string | undefined>();

    // Update encoding when value changes
    useEffect(() => {
        const validation = validateMemo(value, { asciiOnly });

        if (!validation.isValid) {
            setError(validation.error);
        } else {
            setError(undefined);
        }

        const result = encodeMemoBytes32(value, { asciiOnly });
        setEncoded(result);
        onEncodedChange?.(result);
    }, [value, asciiOnly, onEncodedChange]);

    // Handle input change
    const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;

        // Check byte length before allowing input
        const byteLen = getByteLength(newValue);
        if (byteLen > 32) {
            // Don't allow input beyond 32 bytes
            return;
        }

        onChange(newValue);
    }, [onChange]);

    const byteLen = getByteLength(value);
    const isOverLimit = byteLen > 32;
    const isNearLimit = byteLen >= 28;

    return (
        <div className={`hst-memo-input ${className}`}>
            {/* Label with byte counter */}
            <div className="hst-memo-input__header">
                <label className="hst-memo-input__label">
                    {label}
                    <span className="hst-memo-input__optional"> (optional, max 32 bytes)</span>
                </label>
                {showByteCounter && (
                    <span
                        className={`hst-memo-input__counter ${isOverLimit ? 'hst-memo-input__counter--error' : isNearLimit ? 'hst-memo-input__counter--warning' : ''}`}
                        style={{ color: isOverLimit ? '#ef4444' : isNearLimit ? '#f59e0b' : undefined }}
                    >
                        {byteLen}/32 bytes
                    </span>
                )}
            </div>

            {/* Input field */}
            <input
                type="text"
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                disabled={disabled}
                className={`hst-memo-input__input ${error ? 'hst-memo-input__input--error' : ''}`}
                style={{
                    ['--accent-color' as string]: accentColor,
                }}
            />

            {/* Error message */}
            {error && (
                <p className="hst-memo-input__error">{error}</p>
            )}

            {/* Bytes32 preview */}
            {showPreview && value && !error && (
                <div className="hst-memo-input__preview">
                    <p className="hst-memo-input__preview-label">Encoded bytes32 memo:</p>
                    <p
                        className="hst-memo-input__preview-value"
                        style={{ color: accentColor }}
                    >
                        {encoded.bytes32}
                    </p>
                    {encoded.truncated && (
                        <p className="hst-memo-input__preview-warning">
                            ⚠️ Input was truncated to fit 32 bytes
                        </p>
                    )}
                </div>
            )}

            <style jsx>{`
                .hst-memo-input__header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.5rem;
                }
                .hst-memo-input__label {
                    font-size: 0.875rem;
                    color: inherit;
                    opacity: 0.7;
                }
                .hst-memo-input__optional {
                    opacity: 0.5;
                }
                .hst-memo-input__counter {
                    font-size: 0.75rem;
                    font-family: monospace;
                    opacity: 0.7;
                }
                .hst-memo-input__input {
                    width: 100%;
                    padding: 0.75rem 1rem;
                    background: rgba(0, 0, 0, 0.1);
                    border: 2px solid currentColor;
                    border-radius: 0;
                    font-family: 'VT323', monospace;
                    font-size: 1rem;
                    color: inherit;
                    outline: none;
                    transition: border-color 0.2s;
                    box-shadow: 4px 4px 0 currentColor;
                }
                .hst-memo-input__input::placeholder {
                    opacity: 0.4;
                }
                .hst-memo-input__input:focus {
                    border-color: var(--accent-color, #10b981);
                    box-shadow: 4px 4px 0 var(--accent-color, #10b981);
                }
                .hst-memo-input__input--error {
                    border-color: #ef4444;
                    box-shadow: 4px 4px 0 #ef4444;
                }
                .hst-memo-input__input:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                .hst-memo-input__error {
                    color: #ef4444;
                    font-size: 0.75rem;
                    margin-top: 0.25rem;
                }
                .hst-memo-input__preview {
                    margin-top: 0.5rem;
                    padding: 0.75rem;
                    background: rgba(0, 0, 0, 0.1);
                    border: 2px solid currentColor;
                    box-shadow: 4px 4px 0 currentColor;
                }
                .hst-memo-input__preview-label {
                    font-size: 0.75rem;
                    opacity: 0.7;
                    margin-bottom: 0.25rem;
                }
                .hst-memo-input__preview-value {
                    font-family: 'VT323', monospace;
                    font-size: 0.875rem;
                    word-break: break-all;
                }
                .hst-memo-input__preview-warning {
                    font-size: 0.75rem;
                    color: #f59e0b;
                    margin-top: 0.25rem;
                }
            `}</style>
        </div>
    );
}

