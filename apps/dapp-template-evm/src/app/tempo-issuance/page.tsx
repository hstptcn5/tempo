'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
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
import { getExplorerUrl } from '@hst/web3-config';
import { MinecraftNavbar } from '../components/MinecraftNavbar';

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
                        <div className={`w-3 h-3 border-2 border-black ${isActive ? 'bg-primary animate-pulse' :
                            isPast ? 'bg-green-500' : 'bg-gray-200'
                            }`} />
                        {i < steps.length - 1 && (
                            <div className={`w-8 h-0.5 ${isPast ? 'bg-green-500' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
            <span className="ml-2 font-mono text-gray-600 dark:text-gray-400">
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
        <div className="card-block bg-white dark:bg-gray-800 !p-4 space-y-2 text-sm font-mono !shadow-none">
            <h4 className="font-display text-gray-900 dark:text-white mb-3">Token Metadata (On-chain)</h4>
            <div className="grid grid-cols-2 gap-2">
                <span className="text-gray-500">Name:</span>
                <span className="text-gray-900 dark:text-gray-300">{metadata.name}</span>
                <span className="text-gray-500">Symbol:</span>
                <span className="text-gray-900 dark:text-gray-300">{metadata.symbol}</span>
                <span className="text-gray-500">Decimals:</span>
                <span className="text-gray-900 dark:text-gray-300">{metadata.decimals}</span>
                <span className="text-gray-500">Total Supply:</span>
                <span className="text-gray-900 dark:text-gray-300">{formatUnits(metadata.totalSupply, metadata.decimals)}</span>
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
        <main className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Minecraft-style Navbar */}
            <MinecraftNavbar activePage="Issuance" />

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-lg">
                {/* Page Title */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary border-4 border-black flex items-center justify-center">
                            <span className="material-icons text-black">factory</span>
                        </div>
                        <h1 className="text-3xl font-display text-gray-900 dark:text-white">
                            Create TIP-20 Token
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-mono">
                        Deploy your own stablecoin on Tempo
                    </p>
                </div>

                {/* Factory Not Available Warning */}
                {!IS_FACTORY_AVAILABLE && (
                    <div className="mb-6 p-4 border-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-block">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">🚧</span>
                            <div>
                                <h3 className="font-display text-amber-700 dark:text-amber-300 mb-1">Token Factory Coming Soon</h3>
                                <p className="text-amber-700/70 dark:text-amber-400 text-sm mb-2 font-mono">
                                    The TIP-20 Factory contract is not yet deployed on Tempo Testnet.
                                    This page demonstrates the token creation UI flow.
                                </p>
                                <p className="text-amber-600/60 text-xs font-mono">
                                    Check <a href="https://docs.tempo.xyz/guide/issuance" target="_blank" rel="noopener noreferrer" className="text-amber-700 hover:underline">Tempo docs</a> for updates on Factory deployment.
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
                    <div className="mb-6 bg-green-50 border-4 border-green-500 p-6 shadow-block">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 border-2 border-black bg-green-200 flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                            <div>
                                <h3 className="font-display text-lg text-green-800">Token Created!</h3>
                                <p className="text-green-700 text-sm font-mono">{result.name} ({result.symbol})</p>
                            </div>
                        </div>

                        {/* Token Address */}
                        <div className="bg-white border-2 border-black p-4 mb-4">
                            <label className="text-xs text-gray-500 font-display uppercase block mb-1">Token Address</label>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 text-sm font-mono text-black break-all">
                                    {result.tokenAddress}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(result.tokenAddress)}
                                    className="p-2 hover:bg-gray-100 border border-transparent hover:border-black transition-all"
                                    title="Copy address"
                                >
                                    <span className="material-icons text-sm">content_copy</span>
                                </button>
                            </div>
                        </div>

                        {/* Links */}
                        <div className="space-y-2 mb-4">
                            <a
                                href={getExplorerUrl(TEMPO_CHAIN_ID, 'address', result.tokenAddress)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block text-center py-2 px-4 bg-green-100 border-2 border-green-600 hover:bg-green-200 text-green-800 text-sm font-display uppercase transition-colors"
                            >
                                View Token on Explorer ↗
                            </a>
                            {txHash && (
                                <a
                                    href={getExplorerUrl(TEMPO_CHAIN_ID, 'tx', txHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center py-2 px-4 bg-white border-2 border-black hover:bg-gray-50 text-black text-sm font-display uppercase transition-colors"
                                >
                                    View Transaction ↗
                                </a>
                            )}
                        </div>

                        {/* Token Metadata Readback */}
                        <TokenMetadata tokenAddress={result.tokenAddress} chainId={TEMPO_CHAIN_ID} />

                        {/* Add to Wallet Instructions */}
                        <div className="mt-4 p-4 border-2 border-dashed border-gray-400 bg-gray-50">
                            <h4 className="font-display text-sm mb-2 text-gray-700">Add to Wallet</h4>
                            <p className="text-gray-600 text-xs mb-2 font-mono">
                                To see your token in MetaMask or other wallets:
                            </p>
                            <ol className="text-gray-600 text-xs space-y-1 list-decimal list-inside font-mono">
                                <li>Open your wallet and go to "Assets"</li>
                                <li>Click "Import tokens"</li>
                                <li>Paste the token address above</li>
                                <li>Symbol and decimals should auto-fill</li>
                            </ol>
                        </div>

                        {/* Create Another */}
                        <button
                            onClick={handleReset}
                            className="w-full mt-4 py-3 bg-white border-2 border-black hover:bg-gray-50 shadow-sm active:shadow-none text-sm font-display uppercase transition-all"
                        >
                            Create Another Token
                        </button>
                    </div>
                )}

                {/* Creation Form */}
                {!result && (
                    <div className="card-block p-6">
                        {/* Step Indicator */}
                        <StepIndicator step={step} />

                        {/* Token Name */}
                        <div className="mb-4">
                            <label className="block text-sm font-display mb-2 text-gray-700 dark:text-gray-300">
                                Token Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={tokenName}
                                onChange={(e) => setTokenName(e.target.value)}
                                placeholder="My Stablecoin"
                                maxLength={64}
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 font-mono text-black placeholder:text-gray-400"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-gray-400">Full name of your token</span>
                                <span className="text-xs text-gray-400">{tokenName.length}/64</span>
                            </div>
                        </div>

                        {/* Token Symbol */}
                        <div className="mb-4">
                            <label className="block text-sm font-display mb-2 text-gray-700 dark:text-gray-300">
                                Symbol <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={tokenSymbol}
                                onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                                placeholder="MUSD"
                                maxLength={10}
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono uppercase text-black placeholder:text-gray-400 disabled:opacity-50"
                            />
                            <div className="flex justify-between mt-1">
                                <span className="text-xs text-gray-400">2-10 alphanumeric characters</span>
                                <span className="text-xs text-gray-400">{tokenSymbol.length}/10</span>
                            </div>
                        </div>

                        {/* Decimals & Currency Row */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-display mb-2 text-gray-700 dark:text-gray-300">Decimals</label>
                                <select
                                    value={decimals}
                                    onChange={(e) => setDecimals(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono text-black disabled:opacity-50 appearance-none"
                                >
                                    <option value="6">6 (Stablecoin)</option>
                                    <option value="8">8</option>
                                    <option value="18">18 (Standard)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-display mb-2 text-gray-700 dark:text-gray-300">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono text-black disabled:opacity-50 appearance-none"
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
                            <label className="block text-sm font-display mb-2 text-gray-700 dark:text-gray-300">
                                Initial Supply <span className="text-gray-400">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={initialSupply}
                                onChange={(e) => setInitialSupply(e.target.value.replace(/[^0-9.]/g, ''))}
                                placeholder="0"
                                disabled={isLoading}
                                className="w-full px-4 py-3 bg-white border-2 border-black focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] font-mono text-black placeholder:text-gray-400 disabled:opacity-50"
                            />
                            <span className="text-xs text-gray-400">
                                Leave empty or 0 to mint later as admin
                            </span>
                        </div>

                        {/* Admin Address (Read-only) */}
                        <div className="mb-6">
                            <label className="block text-sm font-display mb-2 text-gray-700 dark:text-gray-300">Admin Address</label>
                            <div className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-300 font-mono text-sm text-gray-500 break-all select-all">
                                {userAddress || 'Connect wallet'}
                            </div>
                            <span className="text-xs text-gray-400">
                                This address will have minting/burning rights
                            </span>
                        </div>

                        {/* Quote Token Info */}
                        <div className="mb-6 p-3 bg-blue-50 border-2 border-blue-200">
                            <div className="flex items-center gap-2 text-sm">
                                <span className="font-display text-blue-800">Quote Token:</span>
                                <span className="font-mono text-xs text-blue-600">pathUSD</span>
                            </div>
                            <span className="text-xs text-blue-400">
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
                                className="w-full py-4 bg-amber-500 text-black border-2 border-black font-display uppercase hover:bg-amber-400 transition-colors disabled:opacity-50"
                            >
                                {isSwitchingChain ? 'Switching...' : 'Switch to Tempo'}
                            </button>
                        ) : (
                            <button
                                onClick={handleCreateToken}
                                disabled={!canCreate}
                                className="btn-block w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {!IS_FACTORY_AVAILABLE ? (
                                    'Factory Not Available'
                                ) : isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
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
                <div className="mt-6 card-block bg-blue-50 dark:bg-blue-900/20 !border-2 !p-4 !shadow-none">
                    <h3 className="font-display mb-2 text-sm text-blue-800 dark:text-blue-300">About TIP-20 Tokens</h3>
                    <ul className="text-gray-600 dark:text-gray-400 text-sm font-mono space-y-1">
                        <li>• TIP-20 is Tempo's stablecoin token standard</li>
                        <li>• Includes transferWithMemo for payment references</li>
                        <li>• TIP-403 compliance layers built-in</li>
                        <li>• 18 decimals by default, or 6 for USDC compatibility</li>
                    </ul>
                </div>

            </div>

            {/* Toast Container */}
            <TxToastContainer toasts={toasts} onClose={hide} />
        </main>
    );
}

