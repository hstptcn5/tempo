'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { parseUnits, formatUnits, type Address } from 'viem';
import { TOKENS, CHAIN_IDS, type TokenInfo, calculateMinAmountOut } from '@hst/abis';
import { ConnectButton, TxToastContainer, useTxToast } from '@hst/ui-web3';
import { useTokenBalance, useTempoSwapQuote, useTempoSwap, type SwapStep } from '@hst/hooks-web3';
import { chains, getExplorerUrl } from '@hst/web3-config';

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
            <label className="block text-sm text-white/50 mb-2">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between hover:bg-white/10 transition-colors"
            >
                {selectedToken ? (
                    <span className="font-medium">{selectedToken.symbol}</span>
                ) : (
                    <span className="text-white/50">Select token</span>
                )}
                <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-colors flex items-center justify-between ${
                                selectedToken?.address === token.address ? 'bg-white/5' : ''
                            }`}
                        >
                            <span className="font-medium">{token.symbol}</span>
                            <span className="text-white/50 text-sm">{token.name}</span>
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
                        <div className={`w-2 h-2 rounded-full ${
                            isActive ? 'bg-cyan-400 animate-pulse' : 
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
    const { isConnected, address: userAddress } = useAccount();
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
        reset: resetSwap,
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
        onApprovalConfirmed: (hash) => {
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
        onSwapConfirmed: (hash) => {
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
        <main className="min-h-screen bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e]">
            {/* Header */}
            <header className="border-b border-white/10 backdrop-blur-xl bg-black/20">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                            Tempo DEX
                        </Link>
                        <nav className="hidden md:flex gap-4 ml-8">
                            <Link href="/tempo-pay" className="text-white/70 hover:text-white transition-colors text-sm">
                                Pay
                            </Link>
                            <Link href="/tempo-swap" className="text-cyan-400 text-sm font-medium">
                                Swap
                            </Link>
                            <Link href="/tempo-batch" className="text-white/70 hover:text-white transition-colors text-sm">
                                Batch
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
                        Swap Stablecoins
                    </h1>
                    <p className="text-white/50">
                        Swap TIP-20 stablecoins with minimal fees
                    </p>
                </div>

                {/* Network Warning */}
                {isConnected && !isOnTempo && (
                    <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                        <p className="text-amber-400 text-sm mb-3">
                            Please switch to Tempo Testnet to swap
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

                {/* Swap Card */}
                <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
                    {/* Token In */}
                    <div className="mb-2">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white/50">You pay</span>
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
                                    className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-2xl focus:outline-none focus:border-cyan-500/50"
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
                            <span className="text-sm text-white/50">You receive</span>
                            {isConnected && tokenOut && (
                                <span className="text-sm text-white/50">
                                    Balance: {parseFloat(formattedTokenOutBalance).toFixed(2)}
                                </span>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <div className="w-full px-4 py-4 bg-white/5 border border-white/10 rounded-xl text-2xl text-white/70">
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
                        <div className="mb-6 p-4 bg-white/5 rounded-xl space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-white/50">Rate</span>
                                <span>1 {tokenIn?.symbol} = {quote.rate.toFixed(4)} {tokenOut?.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Price Impact</span>
                                <span className={quote.priceImpact > 1 ? 'text-amber-400' : 'text-green-400'}>
                                    {quote.priceImpact.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Min. Received</span>
                                <span>{parseFloat(formattedMinOut).toFixed(4)} {tokenOut?.symbol}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-white/50">Network Fee</span>
                                <span className="text-green-400">Paid in {tokenIn?.symbol}</span>
                            </div>
                        </div>
                    )}

                    {/* Slippage Settings */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-white/50">Slippage Tolerance</span>
                        </div>
                        <div className="flex gap-2">
                            {SLIPPAGE_PRESETS.map(({ label, value }) => (
                                <button
                                    key={value}
                                    onClick={() => {
                                        setSlippageBps(value);
                                        setCustomSlippage('');
                                    }}
                                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                                        slippageBps === value && !customSlippage
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-white/5 hover:bg-white/10'
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
                                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-cyan-500/50"
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
                            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-medium hover:from-cyan-400 hover:to-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSwapping ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
                <div className="mt-6 p-4 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
                    <h3 className="font-medium mb-2 text-sm">About Tempo Stablecoin Swaps</h3>
                    <ul className="text-white/50 text-sm space-y-1">
                        <li>• All Tempo stablecoins maintain 1:1 USD peg</li>
                        <li>• Swaps have minimal fees (~0.03%)</li>
                        <li>• No native gas needed - fees paid in stablecoins</li>
                        <li>• TIP-403 compliance may restrict some transfers</li>
                    </ul>
                </div>
            </div>

            {/* Toast Container */}
            <TxToastContainer toasts={toasts} onDismiss={hide} />
        </main>
    );
}

