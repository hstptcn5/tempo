'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useAccount, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { type Address, formatUnits } from 'viem';
import {
    CHAIN_IDS,
    TIP20_FACTORY_ADDRESSES,
    FACTORY_AVAILABLE,
    TEMPO_SYSTEM_TOKENS,
    validateCreateTokenParams,
    erc20Abi,
} from '@hst/abis';
import { ConnectButton, TxToastContainer, useTxToast } from '@hst/ui-web3';
import { useTip20CreateToken, type CreateTokenStep } from '@hst/hooks-web3';
import { chains, getExplorerUrl } from '@hst/web3-config';

// Tempo testnet chain ID
const TEMPO_CHAIN_ID = CHAIN_IDS.TEMPO_TESTNET;

// Check if Factory is available
const IS_FACTORY_AVAILABLE = FACTORY_AVAILABLE.TESTNET;

/**
 * Step indicator component
 */
function StepIndicator({ step }: { step: CreateTokenStep }) {
    const steps: { key: CreateTokenStep; label: string }[] = [
        { key: 'validating', label: 'Validating' },
        { key: 'creating', label: 'Creating' },
        { key: 'confirming', label: 'Confirming' },
        { key: 'success', label: 'Complete!' },
    ];

    if (step === 'idle' || step === 'error') return null;

    return (
        <div className="flex items-center gap-2 text-sm mb-4">
            {steps.map((s, i) => {
                const isActive = s.key === step;
                const isPast = steps.findIndex(st => st.key === step) > i;
                
                return (
                    <div key={s.key} className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-emerald-400 animate-pulse' : 
                            isPast ? 'bg-green-400' : 'bg-white/20'
                        }`} />
                        {i < steps.length - 1 && (
                            <div className={`w-8 h-0.5 ${isPast ? 'bg-green-400' : 'bg-white/20'}`} />
                        )}
                    </div>
                );
            })}
            <span className="ml-2 text-white/70">
                {steps.find(s => s.key === step)?.label}
            </span>
        </div>
    );
}

/**
 * Token metadata display after creation
 */
function TokenMetadata({ 
    tokenAddress, 
    chainId 
}: { 
    tokenAddress: Address; 
    chainId: number;
}) {
    const publicClient = usePublicClient({ chainId });
    const [metadata, setMetadata] = useState<{
        name: string;
        symbol: string;
        decimals: number;
        totalSupply: bigint;
    } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchMetadata() {
            if (!publicClient) return;
            
            try {
                const [name, symbol, decimals, totalSupply] = await Promise.all([
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'name',
                    }),
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'symbol',
                    }),
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'decimals',
                    }),
                    publicClient.readContract({
                        address: tokenAddress,
                        abi: erc20Abi,
                        functionName: 'totalSupply',
                    }),
                ]);

                setMetadata({
                    name: name as string,
                    symbol: symbol as string,
                    decimals: decimals as number,
                    totalSupply: totalSupply as bigint,
                });
            } catch (err) {
                console.error('Failed to fetch token metadata:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchMetadata();
    }, [publicClient, tokenAddress]);

    if (loading) {
        return (
            <div className="animate-pulse bg-white/5 rounded-lg p-4">
                <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-white/10 rounded w-1/2"></div>
            </div>
        );
    }

    if (!metadata) return null;

    return (
        <div className="bg-white/5 rounded-lg p-4 space-y-2 text-sm">
            <h4 className="font-medium text-white/70 mb-3">Token Metadata (On-chain)</h4>
            <div className="grid grid-cols-2 gap-2">
                <span className="text-white/50">Name:</span>
                <span>{metadata.name}</span>
                <span className="text-white/50">Symbol:</span>
                <span>{metadata.symbol}</span>
                <span className="text-white/50">Decimals:</span>
                <span>{metadata.decimals}</span>
                <span className="text-white/50">Total Supply:</span>
                <span>{formatUnits(metadata.totalSupply, metadata.decimals)}</span>
            </div>
        </div>
    );
}

export default function TempoIssuancePage() {
    const { isConnected, address: userAddress } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
    const { toasts, show, update, hide } = useTxToast();

    // Check if on Tempo network
    const isOnTempo = chainId === TEMPO_CHAIN_ID;

    // Form state
    const [tokenName, setTokenName] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [decimals, setDecimals] = useState('6');
    const [currency, setCurrency] = useState('USD');
    const [initialSupply, setInitialSupply] = useState('');

    // Real-time validation
    const validation = useMemo(() => {
        return validateCreateTokenParams({
            name: tokenName,
            symbol: tokenSymbol,
            decimals: parseInt(decimals) || 6,
            initialSupply: initialSupply ? BigInt(parseFloat(initialSupply) * 10 ** (parseInt(decimals) || 6)) : 0n,
        });
    }, [tokenName, tokenSymbol, decimals, initialSupply]);

    // Token creation hook
    const {
        step,
        isLoading,
        error,
        validationErrors,
        txHash,
        result,
        createToken,
        reset,
    } = useTip20CreateToken({
        chainId: TEMPO_CHAIN_ID,
        onSubmitted: (hash) => {
            show('create', {
                status: 'pending',
                txHash: hash,
                title: 'Creating Token',
                message: `Deploying ${tokenSymbol}...`,
                chainId: TEMPO_CHAIN_ID,
            });
        },
        onSuccess: (result) => {
            update('create', {
                status: 'success',
                title: 'Token Created!',
                message: `${result.symbol} deployed at ${result.tokenAddress.slice(0, 10)}...`,
            });
        },
        onError: (err) => {
            show('create', {
                status: 'error',
                title: 'Creation Failed',
                error: err.message,
            });
        },
    });

    // Handle form submission
    const handleCreateToken = async () => {
        if (!userAddress) return;

        const parsedDecimals = parseInt(decimals) || 6;
        const parsedSupply = initialSupply 
            ? BigInt(Math.floor(parseFloat(initialSupply) * 10 ** parsedDecimals))
            : 0n;

        await createToken({
            name: tokenName,
            symbol: tokenSymbol.toUpperCase(),
            decimals: parsedDecimals,
            currency,
            quoteToken: TEMPO_SYSTEM_TOKENS.pathUSD,
            admin: userAddress,
            initialSupply: parsedSupply,
        });
    };

    // Handle network switch
    const handleSwitchToTempo = async () => {
        try {
            await switchChainAsync({ chainId: TEMPO_CHAIN_ID });
        } catch {
            // User rejected or error
        }
    };

    // Reset form
    const handleReset = useCallback(() => {
        setTokenName('');
        setTokenSymbol('');
        setDecimals('6');
        setCurrency('USD');
        setInitialSupply('');
        reset();
    }, [reset]);

    // Copy address to clipboard
    const copyToClipboard = useCallback((text: string) => {
        navigator.clipboard.writeText(text);
        show('copy', {
            status: 'success',
            title: 'Copied!',
            message: 'Address copied to clipboard',
        });
        setTimeout(() => hide('copy'), 2000);
    }, [show, hide]);

    const canCreate = 
        IS_FACTORY_AVAILABLE &&
        isConnected && 
        isOnTempo && 
        validation.valid && 
        !isLoading;

    return (
        <main className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e]">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-xl bg-black/20">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                            Token Factory
                        </Link>
                        <nav className="hidden md:flex gap-4 ml-8">
                            <Link href="/tempo-pay" className="text-white/70 hover:text-white transition-colors text-sm">
                                Pay
                            </Link>
                            <Link href="/tempo-swap" className="text-white/70 hover:text-white transition-colors text-sm">
                                Swap
                            </Link>
                            <Link href="/tempo-issuance" className="text-emerald-400 text-sm font-medium">
                                Issue
                            </Link>
                        </nav>
                    </div>
                    <ConnectButton />
                </div>
            </header>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-lg">
                {/* Page Title */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2">
                        Create TIP-20 Token
                    </h1>
                    <p className="text-white/50">
                        Deploy your own stablecoin on Tempo
                    </p>
                </div>

                {/* Factory Not Available Warning */}
                {!IS_FACTORY_AVAILABLE && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🚧</span>
                            <div>
                                <h3 className="font-medium text-amber-400 mb-1">Token Factory Coming Soon</h3>
                                <p className="text-white/70 text-sm mb-2">
                                    The TIP-20 Factory contract is not yet deployed on Tempo Testnet.
                                    This page demonstrates the token creation UI flow.
                                </p>
                                <p className="text-white/50 text-xs">
                                    Check <a href="https://docs.tempo.xyz/guide/issuance" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">Tempo docs</a> for updates on Factory deployment.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Network Warning */}
                {isConnected && !isOnTempo && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <p className="text-amber-400 text-sm mb-3">
                            Please switch to Tempo Testnet to create tokens
                        </p>
                        <button
                            onClick={handleSwitchToTempo}
                            disabled={isSwitchingChain}
                            className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                            {isSwitchingChain ? 'Switching...' : 'Switch to Tempo'}
                        </button>
                    </div>
                )}

                {/* Success State */}
                {result && (
                    <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg">Token Created!</h3>
                                <p className="text-white/50 text-sm">{result.name} ({result.symbol})</p>
                            </div>
                        </div>

                        {/* Token Address */}
                        <div className="bg-black/20 rounded-lg p-4 mb-4">
                            <label className="text-xs text-white/50 block mb-1">Token Address</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-sm font-mono text-emerald-400 break-all">
                                    {result.tokenAddress}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(result.tokenAddress)}
                                    className="p-2 hover:bg-white/10 rounded transition-colors"
                                    title="Copy address"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Links */}
                        <div className="space-y-2 mb-4">
                            <a
                                href={getExplorerUrl(TEMPO_CHAIN_ID, 'address', result.tokenAddress)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-center py-2 px-4 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-400 text-sm transition-colors"
                            >
                                View Token on Explorer ↗
                            </a>
                            {txHash && (
                                <a
                                    href={getExplorerUrl(TEMPO_CHAIN_ID, 'tx', txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 text-sm transition-colors"
                                >
                                    View Transaction ↗
                                </a>
                            )}
                        </div>

                        {/* Token Metadata Readback */}
                        <TokenMetadata tokenAddress={result.tokenAddress} chainId={TEMPO_CHAIN_ID} />

                        {/* Add to Wallet Instructions */}
                        <div className="mt-4 p-4 bg-white/5 rounded-lg">
                            <h4 className="font-medium text-sm mb-2">Add to Wallet</h4>
                            <p className="text-white/50 text-xs mb-2">
                                To see your token in MetaMask or other wallets:
                            </p>
                            <ol className="text-white/50 text-xs space-y-1 list-decimal list-inside">
                                <li>Open your wallet and go to "Assets"</li>
                                <li>Click "Import tokens"</li>
                                <li>Paste the token address above</li>
                                <li>Symbol and decimals should auto-fill</li>
                            </ol>
                        </div>

                        {/* Create Another */}
                        <button
                            onClick={handleReset}
                            className="w-full mt-4 py-3 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors"
                        >
                            Create Another Token
                        </button>
                    </div>
                )}

                {/* Creation Form */}
                {!result && (
                    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                        {/* Step Indicator */}
                        <StepIndicator step={step} />

                        {/* Token Name */}
                        <div className="mb-4">
                            <label className="block text-sm text-white/50 mb-2">
                                Token Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={tokenName}
                                onChange={(e) => setTokenName(e.target.value)}
                                placeholder="My Stablecoin"
                                maxLength={64}
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-white/30">Full name of your token</span>
                                <span className="text-xs text-white/30">{tokenName.length}/64</span>
                            </div>
                        </div>

                        {/* Token Symbol */}
                        <div className="mb-4">
                            <label className="block text-sm text-white/50 mb-2">
                                Symbol <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={tokenSymbol}
                                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                                placeholder="MUSD"
                                maxLength={10}
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500/50 font-mono uppercase disabled:opacity-50"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-white/30">2-10 alphanumeric characters</span>
                                <span className="text-xs text-white/30">{tokenSymbol.length}/10</span>
                            </div>
                        </div>

                        {/* Decimals & Currency Row */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-white/50 mb-2">Decimals</label>
                                <select
                                    value={decimals}
                                    onChange={(e) => setDecimals(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                                >
                                    <option value="6">6 (Stablecoin)</option>
                                    <option value="8">8</option>
                                    <option value="18">18 (Standard)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-white/50 mb-2">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                                >
                                    <option value="USD">USD</option>
                                    <option value="EUR">EUR</option>
                                    <option value="GBP">GBP</option>
                                    <option value="JPY">JPY</option>
                                    <option value="CNY">CNY</option>
                                </select>
                            </div>
                        </div>

                        {/* Initial Supply (Optional) */}
                        <div className="mb-4">
                            <label className="block text-sm text-white/50 mb-2">
                                Initial Supply <span className="text-white/30">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={initialSupply}
                                onChange={(e) => setInitialSupply(e.target.value.replace(/[^0-9.]/g, ''))}
                                placeholder="0"
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500/50 disabled:opacity-50"
                            />
                            <span className="text-xs text-white/30">
                                Leave empty or 0 to mint later as admin
                            </span>
                        </div>

                        {/* Admin Address (Read-only) */}
                        <div className="mb-6">
                            <label className="block text-sm text-white/50 mb-2">Admin Address</label>
                            <div className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg font-mono text-sm text-white/70 break-all">
                                {userAddress || 'Connect wallet'}
                            </div>
                            <span className="text-xs text-white/30">
                                This address will have minting/burning rights
                            </span>
                        </div>

                        {/* Quote Token Info */}
                        <div className="mb-6 p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-white/50">Quote Token:</span>
                                <span className="font-mono text-xs">pathUSD</span>
                            </div>
                            <span className="text-xs text-white/30">
                                Your token will be pegged to pathUSD for fee calculations
                            </span>
                        </div>

                        {/* Validation Errors */}
                        {!validation.valid && (tokenName || tokenSymbol) && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <ul className="text-red-400 text-sm space-y-1">
                                    {validation.errors.map((err, i) => (
                                        <li key={i}>• {err}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Error Display */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm">{error.message}</p>
                            </div>
                        )}

                        {/* Action Button */}
                        {!isConnected ? (
                            <ConnectButton className="w-full" />
                        ) : !isOnTempo ? (
                            <button
                                onClick={handleSwitchToTempo}
                                disabled={isSwitchingChain}
                                className="w-full py-4 bg-amber-500 text-black rounded-xl font-medium hover:bg-amber-400 transition-colors disabled:opacity-50"
                            >
                                {isSwitchingChain ? 'Switching...' : 'Switch to Tempo'}
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateToken}
                                disabled={!canCreate}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:from-emerald-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {!IS_FACTORY_AVAILABLE ? (
                                    'Factory Not Available'
                                ) : isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Creating Token...
                                    </span>
                                ) : !tokenName || !tokenSymbol ? (
                                    'Enter Token Details'
                                ) : !validation.valid ? (
                                    'Fix Validation Errors'
                                ) : (
                                    'Create Token'
                                )}
                            </button>
                        )}

                        {/* Factory Info */}
                        <div className="mt-4 text-center space-y-1">
                            <div className="text-xs text-white/30">
                                Factory: {TIP20_FACTORY_ADDRESSES.TESTNET.slice(0, 10)}...
                            </div>
                            <div className={`text-xs ${IS_FACTORY_AVAILABLE ? 'text-green-400' : 'text-amber-400'}`}>
                                Status: {IS_FACTORY_AVAILABLE ? '✓ Available' : '⚠ Not Deployed'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Info Card */}
                <div className="mt-6 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                    <h3 className="font-medium mb-2 text-sm">About TIP-20 Tokens</h3>
                    <ul className="text-white/50 text-sm space-y-1">
                        <li>• TIP-20 is Tempo's stablecoin token standard</li>
                        <li>• Includes transferWithMemo for payment references</li>
                        <li>• Fees can be paid in the token itself (no native gas)</li>
                        <li>• Admin can mint, burn, and set TIP-403 compliance policies</li>
                    </ul>
                </div>
            </div>

            {/* Toast Container */}
            <TxToastContainer toasts={toasts} onDismiss={hide} />
        </main>
    );
}

