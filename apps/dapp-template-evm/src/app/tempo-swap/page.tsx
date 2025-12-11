'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { TOKENS, CHAIN_IDS, type TokenInfo } from '@hst/abis';
import { ConnectButton, TxToastContainer, useTxToast } from '@hst/ui-web3';
import { useTokenBalance, useTempoSwapQuote, useTempoSwap, type SwapStep } from '@hst/hooks-web3';
import { getExplorerUrl } from '@hst/web3-config';
import { MinecraftNavbar } from '../components/MinecraftNavbar';

// Tempo testnet chain ID
const TEMPO_CHAIN_ID = CHAIN_IDS.TEMPO_TESTNET;

// Slippage presets in basis points
const SLIPPAGE_PRESETS = [
    { label: '0.1%', value: 10 },
    { label: '0.5%', value: 50 },
    { label: '1%', value: 100 },
];

/**
 * Token Selector Button Component
 */
function TokenSelector({
    label,
    selectedToken,
    tokens,
    onSelect,
    excludeToken,
}: {
    label: string;
    selectedToken: TokenInfo | null;
    tokens: TokenInfo[];
    onSelect: (token: TokenInfo) => void;
    excludeToken?: TokenInfo | null;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const filteredTokens = excludeToken
        ? tokens.filter(t => t.address !== excludeToken.address)
        : tokens;

    return (
        <div className="relative">
            <label className="block text-sm text-aqua-text/60 mb-2">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors"
            >
                {selectedToken ? (
                    <span className="font-medium">{selectedToken.symbol}</span>
                ) : (
                    <span className="text-aqua-text/60">Select token</span>
                )}
                <svg className="w-5 h-5 text-aqua-text/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-[#1a1a2e] border border-white/10 rounded-lg shadow-xl overflow-hidden">
                    {filteredTokens.map((token) => (
                        <button
                            key={token.address}
                            type="button"
                            onClick={() => {
                                onSelect(token);
                                setIsOpen(false);
                            }}
                            className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between ${selectedToken?.address === token.address ? 'bg-white/5' : ''
                                }`}
                        >
                            <span className="font-medium">{token.symbol}</span>
                            <span className="text-aqua-text/60 text-sm">{token.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Swap step indicator component
 */
function SwapStepIndicator({ step }: { step: SwapStep }) {
    const steps: { key: SwapStep; label: string }[] = [
        { key: 'checking', label: 'Checking...' },
        { key: 'approving', label: 'Approving...' },
        { key: 'approved', label: 'Approved' },
        { key: 'swapping', label: 'Swapping...' },
        { key: 'success', label: 'Complete!' },
    ];

    if (step === 'idle' || step === 'error') return null;

    return (
        <div className="flex items-center gap-2 text-sm">
            {steps.map((s, i) => {
                const isActive = s.key === step;
                const isPast = steps.findIndex(st => st.key === step) > i;

                return (
                    <div key={s.key} className="flex items-center">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' :
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

export default function TempoSwapPage() {
    const { isConnected } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
    const { toasts, show, update, hide } = useTxToast();

    // Check if on Tempo network
    const isOnTempo = chainId === TEMPO_CHAIN_ID;

    // Get Tempo testnet tokens
    const tempoTokens = TOKENS[TEMPO_CHAIN_ID] ?? {};
    const tokenList = Object.values(tempoTokens);

    // Form state
    const [tokenIn, setTokenIn] = useState<TokenInfo | null>(null);
    const [tokenOut, setTokenOut] = useState<TokenInfo | null>(null);
    const [amountIn, setAmountIn] = useState('');
    const [slippageBps, setSlippageBps] = useState(50); // 0.5% default
    const [customSlippage, setCustomSlippage] = useState('');

    // Initialize default tokens
    useEffect(() => {
        if (tokenList.length >= 2) {
            if (!tokenIn) setTokenIn(tokenList[0]);
            if (!tokenOut) setTokenOut(tokenList[1]);
        }
    }, [tokenList, tokenIn, tokenOut]);

    // Parse input amount
    const parsedAmountIn = useMemo(() => {
        if (!amountIn || !tokenIn) return 0n;
        try {
            return parseUnits(amountIn, tokenIn.decimals);
        } catch {
            return 0n;
        }
    }, [amountIn, tokenIn]);

    // Token balances
    const { balance: tokenInBalance } = useTokenBalance({
        token: tokenIn?.address as Address,
        watch: true,
        enabled: !!tokenIn && isConnected && isOnTempo,
    });

    const { balance: tokenOutBalance } = useTokenBalance({
        token: tokenOut?.address as Address,
        watch: true,
        enabled: !!tokenOut && isConnected && isOnTempo,
    });

    // Get swap quote
    const { quote, isLoading: isQuoteLoading, error: quoteError, isPairSupported } = useTempoSwapQuote({
        tokenIn: tokenIn?.address as Address,
        tokenOut: tokenOut?.address as Address,
        amountIn: parsedAmountIn,
        tokenInDecimals: tokenIn?.decimals,
        tokenOutDecimals: tokenOut?.decimals,
        slippageBps,
        chainId: TEMPO_CHAIN_ID,
        enabled: isOnTempo && !!tokenIn && !!tokenOut && parsedAmountIn > 0n,
    });

    // Swap execution
    const {
        step: swapStep,
        isLoading: isSwapping,
        error: swapError,
        approvalHash,
        swapHash,
        executeSwap,
    } = useTempoSwap({
        chainId: TEMPO_CHAIN_ID,
        onApprovalSubmitted: (hash) => {
            show('approval', {
                status: 'pending',
                txHash: hash,
                title: 'Approval Pending',
                message: `Approving ${tokenIn?.symbol} for swap...`,
                chainId: TEMPO_CHAIN_ID,
            });
        },
        onApprovalConfirmed: () => {
            update('approval', {
                status: 'success',
                title: 'Approved!',
                message: `${tokenIn?.symbol} approved for swap`,
            });
        },
        onSwapSubmitted: (hash) => {
            show('swap', {
                status: 'pending',
                txHash: hash,
                title: 'Swap Pending',
                message: `Swapping ${amountIn} ${tokenIn?.symbol} → ${tokenOut?.symbol}...`,
                chainId: TEMPO_CHAIN_ID,
            });
        },
        onSwapConfirmed: () => {
            update('swap', {
                status: 'success',
                title: 'Swap Complete!',
                message: `Successfully swapped ${tokenIn?.symbol} → ${tokenOut?.symbol}`,
            });
            setAmountIn('');
        },
        onError: (err) => {
            show('swap', {
                status: 'error',
                title: 'Swap Failed',
                error: err.message,
            });
        },
    });

    // Handle token swap (reverse tokenIn and tokenOut)
    const handleReverseTokens = useCallback(() => {
        const temp = tokenIn;
        setTokenIn(tokenOut);
        setTokenOut(temp);
        setAmountIn('');
    }, [tokenIn, tokenOut]);

    // Handle max amount
    const handleMaxAmount = useCallback(() => {
        if (tokenInBalance && tokenIn) {
            setAmountIn(formatUnits(tokenInBalance, tokenIn.decimals));
        }
    }, [tokenInBalance, tokenIn]);

    // Handle swap execution
    const handleSwap = async () => {
        if (!tokenIn || !tokenOut || !quote || parsedAmountIn === 0n) return;

        await executeSwap({
            tokenIn: tokenIn.address as Address,
            tokenOut: tokenOut.address as Address,
            amountIn: parsedAmountIn,
            minAmountOut: quote.minAmountOut,
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

    // Validation
    const hasInsufficientBalance = tokenInBalance !== undefined && parsedAmountIn > tokenInBalance;
    const canSwap =
        isConnected &&
        isOnTempo &&
        tokenIn &&
        tokenOut &&
        parsedAmountIn > 0n &&
        quote &&
        !hasInsufficientBalance &&
        !isSwapping &&
        isPairSupported;

    // Format display values
    const formattedTokenInBalance = tokenInBalance && tokenIn
        ? formatUnits(tokenInBalance, tokenIn.decimals)
        : '0';
    const formattedTokenOutBalance = tokenOutBalance && tokenOut
        ? formatUnits(tokenOutBalance, tokenOut.decimals)
        : '0';
    const formattedQuoteOut = quote && tokenOut
        ? formatUnits(quote.amountOut, tokenOut.decimals)
        : '0';
    const formattedMinOut = quote && tokenOut
        ? formatUnits(quote.minAmountOut, tokenOut.decimals)
        : '0';

    return (
        <main className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Minecraft-style Navbar */}
            <MinecraftNavbar activePage="Swap" />

            {/* Main Content */}
            <div className="container mx-auto px-4 py-8 max-w-lg">
                {/* Page Title */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-primary border-4 border-black flex items-center justify-center">
                            <span className="material-icons text-black">swap_horiz</span>
                        </div>
                        <h1 className="text-3xl font-display text-gray-900 dark:text-white">
                            Swap Stablecoins
                        </h1>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 font-mono">
                        Swap TIP-20 stablecoins with minimal fees
                    </p>
                </div>

                {/* Network Warning */}
                {isConnected && !isOnTempo && (
                    <div className="mb-6 p-4 border-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-block">
                        <p className="text-amber-700 dark:text-amber-300 text-sm mb-3 font-mono">
                            Please switch to Tempo Testnet to swap
                        </p>
                        <button
                            onClick={handleSwitchToTempo}
                            disabled={isSwitchingChain}
                            className="px-4 py-2 bg-amber-500 text-black border-2 border-black font-display uppercase hover:bg-amber-400 transition-colors disabled:opacity-50"
                        >
                            {isSwitchingChain ? 'Switching...' : 'Switch to Tempo'}
                        </button>
                    </div>
                )}

                {/* Swap Card */}
                <div className="card-block p-6">
                    {/* Token In */}
                    <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-aqua-text/60">You pay</span>
                            {isConnected && tokenIn && (
                                <button
                                    onClick={handleMaxAmount}
                                    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    Balance: {parseFloat(formattedTokenInBalance).toFixed(2)}
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={amountIn}
                                    onChange={(e) => setAmountIn(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-4 py-4 bg-white dark:bg-gray-800 border-2 border-black dark:border-white text-2xl font-mono focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:focus:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)] text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                />
                            </div>
                            <div className="w-40">
                                <TokenSelector
                                    label=""
                                    selectedToken={tokenIn}
                                    tokens={tokenList}
                                    onSelect={setTokenIn}
                                    excludeToken={tokenOut}
                                />
                            </div>
                        </div>
                        {hasInsufficientBalance && (
                            <p className="text-red-400 text-sm mt-1">Insufficient balance</p>
                        )}
                    </div>

                    {/* Swap Direction Button */}
                    <div className="flex justify-center -my-2 relative z-10">
                        <button
                            onClick={handleReverseTokens}
                            className="w-10 h-10 bg-[#1a1a2e] border border-white/10 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                            </svg>
                        </button>
                    </div>

                    {/* Token Out */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-aqua-text/60">You receive</span>
                            {isConnected && tokenOut && (
                                <span className="text-sm text-aqua-text/60">
                                    Balance: {parseFloat(formattedTokenOutBalance).toFixed(2)}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <div className="w-full px-4 py-4 bg-gray-50 dark:bg-gray-800 border-2 border-black dark:border-white text-2xl text-gray-900 dark:text-white font-mono">
                                    {isQuoteLoading ? (
                                        <span className="animate-pulse">Loading...</span>
                                    ) : quote ? (
                                        parseFloat(formattedQuoteOut).toFixed(4)
                                    ) : (
                                        '0.00'
                                    )}
                                </div>
                            </div>
                            <div className="w-40">
                                <TokenSelector
                                    label=""
                                    selectedToken={tokenOut}
                                    tokens={tokenList}
                                    onSelect={setTokenOut}
                                    excludeToken={tokenIn}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quote Details */}
                    {quote && (
                        <div className="mb-6 p-4 border-2 border-black dark:border-white bg-gray-50 dark:bg-gray-800 space-y-2 text-sm font-mono">
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Rate</span>
                                <span className="text-gray-900 dark:text-white">1 {tokenIn?.symbol} = {quote.rate.toFixed(4)} {tokenOut?.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Price Impact</span>
                                <span className={quote.priceImpact > 1 ? 'text-amber-600' : 'text-green-600'}>
                                    {quote.priceImpact.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Min. Received</span>
                                <span className="text-gray-900 dark:text-white">{parseFloat(formattedMinOut).toFixed(4)} {tokenOut?.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500 dark:text-gray-400">Network Fee</span>
                                <span className="text-green-600">Paid in {tokenIn?.symbol}</span>
                            </div>
                        </div>
                    )}

                    {/* Slippage Settings */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-display text-gray-600 dark:text-gray-300">Slippage Tolerance</span>
                        </div>
                        <div className="flex gap-2">
                            {SLIPPAGE_PRESETS.map(({ label, value }) => (
                                <button
                                    key={value}
                                    onClick={() => {
                                        setSlippageBps(value);
                                        setCustomSlippage('');
                                    }}
                                    className={`px-3 py-2 text-sm font-mono border-2 border-black transition-colors ${slippageBps === value && !customSlippage
                                        ? 'bg-primary text-black shadow-block translate-x-[2px] translate-y-[2px] shadow-none'
                                        : 'bg-white hover:bg-gray-50 shadow-sm'
                                        }`}
                                >
                                    {label}
                                </button>
                            ))}
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={customSlippage}
                                    onChange={(e) => {
                                        setCustomSlippage(e.target.value);
                                        const val = parseFloat(e.target.value);
                                        if (!isNaN(val) && val > 0 && val <= 50) {
                                            setSlippageBps(Math.round(val * 100));
                                        }
                                    }}
                                    placeholder="Custom"
                                    className="w-full px-3 py-2 bg-white border-2 border-black text-sm font-mono focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Swap Step Indicator */}
                    {swapStep !== 'idle' && swapStep !== 'error' && (
                        <div className="mb-4">
                            <SwapStepIndicator step={swapStep} />
                        </div>
                    )}

                    {/* Error Display */}
                    {(quoteError || swapError) && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <p className="text-red-400 text-sm">
                                {quoteError || swapError?.message}
                            </p>
                        </div>
                    )}

                    {/* Pair Not Supported Warning */}
                    {!isPairSupported && tokenIn && tokenOut && (
                        <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <p className="text-amber-400 text-sm">
                                This swap pair is not supported on the DEX
                            </p>
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
                            onClick={handleSwap}
                            disabled={!canSwap}
                            className="btn-block w-full"
                        >
                            {isSwapping ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-4 border-black border-t-transparent rounded-full animate-spin" />
                                    Processing...
                                </span>
                            ) : hasInsufficientBalance ? (
                                'Insufficient Balance'
                            ) : !quote && parsedAmountIn > 0n ? (
                                'Getting Quote...'
                            ) : parsedAmountIn === 0n ? (
                                'Enter Amount'
                            ) : (
                                'Swap'
                            )}
                        </button>
                    )}

                    {/* Transaction Links */}
                    {(approvalHash || swapHash) && (
                        <div className="mt-4 space-y-2">
                            {approvalHash && (
                                <a
                                    href={getExplorerUrl(TEMPO_CHAIN_ID, 'tx', approvalHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    View Approval Transaction ↗
                                </a>
                            )}
                            {swapHash && (
                                <a
                                    href={getExplorerUrl(TEMPO_CHAIN_ID, 'tx', swapHash)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-center text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                    View Swap Transaction ↗
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* Info Card */}
                <div className="mt-6 card-block !p-4 !shadow-none bg-blue-50 dark:bg-cyan-900/30 !border-2">
                    <h3 className="font-display mb-2 text-sm text-blue-800 dark:text-cyan-300">About Tempo Stablecoin Swaps</h3>
                    <ul className="text-gray-600 dark:text-gray-300 text-sm font-mono space-y-1">
                        <li>• All Tempo stablecoins maintain 1:1 USD peg</li>
                        <li>• Swaps have minimal fees (~0.03%)</li>
                        <li>• No native gas needed - fees paid in stablecoins</li>
                        <li>• TIP-403 compliance may restrict some transfers</li>
                    </ul>
                </div>
            </div>

            {/* Toast Container */}
            <TxToastContainer toasts={toasts} onClose={hide} />
        </main>
    );
}

