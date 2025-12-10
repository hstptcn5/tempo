'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { parseUnits, isAddress, type Address } from 'viem';
import { TOKENS, CHAIN_IDS, type TokenInfo } from '@hst/abis';
import { TokenInput, ConnectButton, ChainSelector, TxToastContainer, useTxToast, MemoInputBytes32, TempoPayReceipt, type PaymentDetails } from '@hst/ui-web3';
import { useTokenBalance, useTip20TransferWithMemo, useRecentTip20Payments, useComplianceCheck, type EncodedMemo, type ComplianceStatus } from '@hst/hooks-web3';
import { chains } from '@hst/web3-config';

// Tempo testnet chain ID
const TEMPO_CHAIN_ID = CHAIN_IDS.TEMPO_TESTNET;

export default function TempoPayPage() {
    const { isConnected, address: userAddress } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
    const { toasts, show, update, hide } = useTxToast();

    // Check if on Tempo network
    const isOnTempo = chainId === TEMPO_CHAIN_ID;

    // Form state
    const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [invoiceId, setInvoiceId] = useState('');
    const [encodedMemo, setEncodedMemo] = useState<EncodedMemo | null>(null);
    
    // Store last successful payment for receipt display
    const [lastPayment, setLastPayment] = useState<PaymentDetails | null>(null);

    // Get Tempo testnet tokens
    const tempoTokens = TOKENS[TEMPO_CHAIN_ID] ?? {};
    const tokenList = Object.values(tempoTokens);

    // Set default token when list changes
    useEffect(() => {
        if (!selectedToken && tokenList.length > 0) {
            setSelectedToken(tokenList[0]);
        }
    }, [tokenList, selectedToken]);

    // Handle memo encoding changes
    const handleMemoEncodedChange = useCallback((encoded: EncodedMemo) => {
        setEncodedMemo(encoded);
    }, []);

    // Parse amount
    const parsedAmount = useMemo(() => {
        if (!amount || !selectedToken) return 0n;
        try {
            return parseUnits(amount, selectedToken.decimals);
        } catch {
            return 0n;
        }
    }, [amount, selectedToken]);

    // Token balance (only fetch on Tempo network)
    // Note: We never check native balance on Tempo - there is no native gas token
    const { balance } = useTokenBalance({
        token: selectedToken?.address as Address,
        watch: true,
        enabled: !!selectedToken && isConnected && isOnTempo,
    });

    // TIP-403 Compliance check (dry-run simulation)
    // This checks if the transfer would be blocked by compliance policies
    const {
        status: complianceStatus,
        message: complianceMessage,
        isChecking: isCheckingCompliance,
    } = useComplianceCheck({
        token: selectedToken?.address as Address,
        recipient: isAddress(recipientAddress) ? recipientAddress as Address : undefined,
        amount: parsedAmount,
        chainId: TEMPO_CHAIN_ID,
        autoCheck: true,
        debounceMs: 800,
    });

    // TIP-20 transfer with memo hook
    const {
        status: transferStatus,
        txHash: transferHash,
        error: transferError,
        isLoading: isTransferring,
        send,
    } = useTip20TransferWithMemo({
        token: selectedToken?.address as Address,
        onSubmitted: (hash) => {
            // Save payment details BEFORE form reset (capture current values)
            if (userAddress && selectedToken) {
                setLastPayment({
                    txHash: hash,
                    from: userAddress,
                    to: recipientAddress as Address,
                    amount: parsedAmount,
                    tokenSymbol: selectedToken.symbol,
                    tokenDecimals: selectedToken.decimals,
                    memo: encodedMemo?.bytes32,
                    status: 'pending',
                    chainId: TEMPO_CHAIN_ID,
                });
            }
            show('transfer', {
                status: 'pending',
                txHash: hash,
                title: 'Payment Pending',
                message: `Sending ${amount} ${selectedToken?.symbol} with memo...`,
                chainId: TEMPO_CHAIN_ID,
            });
        },
        onSuccess: (hash) => {
            // Update status to success
            setLastPayment(prev => prev ? { ...prev, status: 'success' } : null);
            update('transfer', {
                status: 'success',
                title: 'Payment Complete',
                message: `Successfully sent ${amount} ${selectedToken?.symbol}`,
            });
            // Reset form on success
            setAmount('');
            setInvoiceId('');
        },
        onError: (err) => {
            // Update status to failed
            setLastPayment(prev => prev ? { ...prev, status: 'failed' } : null);
            
            // Check if this is a compliance error for better messaging
            // The decodeError in useTip20TransferWithMemo already classifies compliance errors
            const isComplianceIssue = err.message.toLowerCase().includes('not allowed') ||
                                      err.message.toLowerCase().includes('blocked') ||
                                      err.message.toLowerCase().includes('policy');
            
            show('transfer', {
                status: 'error',
                title: isComplianceIssue ? 'Compliance Policy Block' : 'Transfer Failed',
                error: err.message,
            });
        },
    });

    // Handle transfer using the encoded memo from MemoInputBytes32
    const handleTransfer = async () => {
        if (!recipientAddress || !isAddress(recipientAddress) || parsedAmount === 0n) return;
        if (!encodedMemo) return;

        show('transfer', {
            status: 'signing',
            title: 'Confirm Payment',
            message: 'Please confirm in your wallet',
        });

        await send(
            recipientAddress as Address,
            parsedAmount,
            encodedMemo.bytes32
        );
    };

    // Handle network switch to Tempo
    const handleSwitchToTempo = async () => {
        try {
            await switchChainAsync({ chainId: TEMPO_CHAIN_ID });
        } catch (error) {
            console.error('Failed to switch to Tempo:', error);
        }
    };

    // Validation
    const isValidRecipient = recipientAddress && isAddress(recipientAddress);
    const hasInsufficientBalance = balance !== undefined && parsedAmount > balance;
    const canTransfer = isConnected && isOnTempo && isValidRecipient && parsedAmount > 0n && !hasInsufficientBalance && encodedMemo !== null;

    // Get all token addresses for querying recent payments
    const tokenAddresses = useMemo(() => 
        tokenList.map(t => t.address as Address),
        [tokenList]
    );

    // Recent payments hook (optional, only on Tempo)
    const [showRecentPayments, setShowRecentPayments] = useState(false);
    const {
        payments: recentPayments,
        isLoading: isLoadingPayments,
        error: paymentsError,
        refetch: refetchPayments,
        hasMore,
        loadMore,
    } = useRecentTip20Payments({
        tokenAddresses,
        limit: 5,
        direction: 'sent',
        blockRange: 50000,
        enabled: isConnected && isOnTempo && showRecentPayments,
    });


    // Helper to get token info by address
    const getTokenByAddress = useCallback((address: Address): TokenInfo | undefined => {
        return tokenList.find(t => t.address.toLowerCase() === address.toLowerCase());
    }, [tokenList]);

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                            dApp Template
                        </Link>
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/" className="text-white/70 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/read" className="text-white/70 hover:text-white transition-colors">
                                Read
                            </Link>
                            <Link href="/write" className="text-white/70 hover:text-white transition-colors">
                                Write
                            </Link>
                            <Link href="/events" className="text-white/70 hover:text-white transition-colors">
                                Events
                            </Link>
                            <Link href="/tempo-pay" className="text-emerald-400 font-medium">
                                Tempo Pay
                            </Link>
                            {process.env.NEXT_PUBLIC_TEMPO_BATCH === '1' && (
                                <Link href="/tempo-batch" className="text-white/70 hover:text-white transition-colors">
                                    Batch Pay
                                </Link>
                            )}
                            <Link href="/tempo-sponsor" className="text-white/70 hover:text-white transition-colors">
                                Sponsored
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <ChainSelector supportedChains={[chains.tempoTestnet]} />
                        <ConnectButton showBalance={false} />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-lg mx-auto">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                <span className="text-emerald-400 text-xl">$</span>
                            </div>
                            <h1 className="text-3xl font-bold">Tempo Pay</h1>
                        </div>
                        <p className="text-white/50">
                            Send stablecoin payments with invoice memos on Tempo Testnet
                        </p>
                    </div>

                    {/* Network Notice */}
                    {isConnected && !isOnTempo && (
                        <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <div className="flex items-start gap-3">
                                <div className="text-amber-400 text-xl">⚠️</div>
                                <div className="flex-1">
                                    <h3 className="text-amber-400 font-medium mb-1">Wrong Network</h3>
                                    <p className="text-white/70 text-sm mb-3">
                                        Please switch to Tempo Testnet to use this feature.
                                    </p>
                                    <button
                                        onClick={handleSwitchToTempo}
                                        disabled={isSwitchingChain}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isSwitchingChain ? 'Switching...' : 'Switch to Tempo Testnet'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                        <h3 className="text-emerald-400 font-medium mb-2">ℹ️ About Tempo</h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• <strong>No native gas token</strong> - fees paid in TIP-20 stablecoins</li>
                            <li>• <strong>32-byte memo</strong> - attach invoice IDs for reconciliation</li>
                            <li>• <strong>Testnet faucet:</strong> <code className="text-emerald-400">cast rpc tempo_fundAddress YOUR_ADDRESS --rpc-url https://rpc.testnet.tempo.xyz</code></li>
                        </ul>
                    </div>

                    {/* Payment Form */}
                    <div className="card">
                        {/* Token Selection */}
                        <div className="mb-4">
                            <label className="block text-sm text-white/50 mb-2">TIP-20 Stablecoin</label>
                            <div className="flex flex-wrap gap-2">
                                {tokenList.map((token) => (
                                    <button
                                        key={token.address}
                                        onClick={() => setSelectedToken(token)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedToken?.address === token.address
                                            ? 'bg-emerald-500 text-white'
                                            : 'bg-white/10 hover:bg-white/20'
                                            }`}
                                    >
                                        {token.symbol}
                                    </button>
                                ))}
                            </div>
                            {!isOnTempo && tokenList.length === 0 && (
                                <p className="text-white/50 text-sm mt-2">
                                    Connect to Tempo Testnet to see available tokens
                                </p>
                            )}
                        </div>

                        {/* Amount Input */}
                        <div className="mb-4">
                            <TokenInput
                                value={amount}
                                onChange={setAmount}
                                token={selectedToken}
                                balance={isOnTempo ? balance : undefined}
                                showMax
                                error={hasInsufficientBalance ? 'Insufficient balance' : undefined}
                            />
                        </div>

                        {/* Recipient Address */}
                        <div className="mb-4">
                            <label className="block text-sm text-white/50 mb-2">Recipient Address</label>
                            <input
                                type="text"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 font-mono text-sm"
                            />
                            {recipientAddress && !isValidRecipient && (
                                <p className="text-red-400 text-sm mt-1">Invalid address</p>
                            )}
                        </div>

                        {/* TIP-403 Compliance Status */}
                        {isValidRecipient && parsedAmount > 0n && (
                            <div className={`mb-4 p-3 rounded-lg border ${
                                complianceStatus === 'allowed' 
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : complianceStatus === 'blocked'
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : complianceStatus === 'checking'
                                    ? 'bg-blue-500/10 border-blue-500/30'
                                    : 'bg-white/5 border-white/10'
                            }`}>
                                <div className="flex items-center gap-2 text-sm">
                                    {complianceStatus === 'checking' && (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full" />
                                            <span className="text-blue-400">Checking compliance...</span>
                                        </>
                                    )}
                                    {complianceStatus === 'allowed' && (
                                        <>
                                            <span className="text-green-400">✓</span>
                                            <span className="text-green-400">Transfer likely allowed</span>
                                        </>
                                    )}
                                    {complianceStatus === 'blocked' && (
                                        <>
                                            <span className="text-red-400">✗</span>
                                            <span className="text-red-400">{complianceMessage}</span>
                                        </>
                                    )}
                                    {complianceStatus === 'error' && (
                                        <>
                                            <span className="text-amber-400">⚠</span>
                                            <span className="text-amber-400">{complianceMessage}</span>
                                        </>
                                    )}
                                    {complianceStatus === 'unknown' && (
                                        <span className="text-white/40">
                                            Compliance check pending...
                                        </span>
                                    )}
                                </div>
                                {complianceStatus === 'blocked' && (
                                    <p className="text-white/40 text-xs mt-1">
                                        TIP-403 policy may block this transfer
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Invoice ID / Memo - Using reusable MemoInputBytes32 component */}
                        <div className="mb-6">
                            <MemoInputBytes32
                                value={invoiceId}
                                onChange={setInvoiceId}
                                onEncodedChange={handleMemoEncodedChange}
                                placeholder="INV-12345"
                                showPreview={true}
                                showByteCounter={true}
                                accentColor="#10b981"
                            />
                        </div>

                        {/* Action Button */}
                        {!isConnected ? (
                            <ConnectButton />
                        ) : !isOnTempo ? (
                            <button
                                onClick={handleSwitchToTempo}
                                disabled={isSwitchingChain}
                                className="btn btn-primary w-full bg-emerald-500 hover:bg-emerald-600"
                            >
                                {isSwitchingChain ? 'Switching Network...' : 'Switch to Tempo Testnet'}
                            </button>
                        ) : (
                            <button
                                onClick={handleTransfer}
                                disabled={!canTransfer || isTransferring}
                                className="btn btn-primary w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTransferring
                                    ? 'Sending...'
                                    : `Send ${selectedToken?.symbol ?? 'Stablecoin'}${invoiceId ? ' with Memo' : ''}`
                                }
                            </button>
                        )}

                        {/* Error Display */}
                        {transferError && (
                            <p className="text-red-400 text-sm mt-4 text-center">
                                {transferError.message}
                            </p>
                        )}
                    </div>

                    {/* Payment Receipt (replaces Transaction Details) */}
                    {lastPayment && (
                        <div className="mt-6">
                            <TempoPayReceipt
                                payment={lastPayment}
                                accentColor="#10b981"
                            />
                        </div>
                    )}

                    {/* Recent Payments Section (optional, collapsible) */}
                    {isConnected && isOnTempo && (
                        <div className="mt-8">
                            <button
                                onClick={() => {
                                    setShowRecentPayments(!showRecentPayments);
                                    if (!showRecentPayments) {
                                        refetchPayments();
                                    }
                                }}
                                className="flex items-center justify-between w-full text-left mb-4"
                            >
                                <h2 className="text-lg font-medium">
                                    📜 Recent Payments
                                </h2>
                                <span className="text-white/50 text-sm">
                                    {showRecentPayments ? '▲ Hide' : '▼ Show'}
                                </span>
                            </button>

                            {showRecentPayments && (
                                <div className="space-y-3">
                                    {isLoadingPayments && recentPayments.length === 0 && (
                                        <div className="text-center py-8 text-white/50">
                                            <div className="animate-spin inline-block w-6 h-6 border-2 border-white/20 border-t-emerald-400 rounded-full mb-2"></div>
                                            <p>Loading payments...</p>
                                        </div>
                                    )}

                                    {paymentsError && (
                                        <div className="text-center py-4 text-red-400 text-sm">
                                            Failed to load payments: {paymentsError.message}
                                        </div>
                                    )}

                                    {!isLoadingPayments && recentPayments.length === 0 && !paymentsError && (
                                        <div className="text-center py-8 text-white/50">
                                            <p>No recent payments found</p>
                                            <p className="text-sm mt-1">Payments you send will appear here</p>
                                        </div>
                                    )}

                                    {recentPayments
                                        .filter(payment => payment.amount !== undefined && payment.amount !== null)
                                        .map((payment) => {
                                            const token = getTokenByAddress(payment.tokenAddress);
                                            return (
                                                <TempoPayReceipt
                                                    key={`${payment.txHash}-${payment.logIndex}`}
                                                    payment={{
                                                        txHash: payment.txHash,
                                                        from: payment.from,
                                                        to: payment.to,
                                                        amount: payment.amount,
                                                        tokenSymbol: token?.symbol ?? 'USD',
                                                        tokenDecimals: token?.decimals ?? 6,
                                                        memo: payment.memo,
                                                        status: 'success',
                                                        timestamp: payment.timestamp,
                                                        chainId: TEMPO_CHAIN_ID,
                                                    }}
                                                    compact={true}
                                                    accentColor="#10b981"
                                                />
                                            );
                                        })}

                                    {/* Load More Button */}
                                    {hasMore && recentPayments.length > 0 && (
                                        <button
                                            onClick={loadMore}
                                            disabled={isLoadingPayments}
                                            className="w-full py-2 text-sm text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                                        >
                                            {isLoadingPayments ? 'Loading...' : 'Load More'}
                                        </button>
                                    )}

                                    {/* Refresh Button */}
                                    {recentPayments.length > 0 && (
                                        <button
                                            onClick={refetchPayments}
                                            disabled={isLoadingPayments}
                                            className="w-full py-2 text-sm text-white/50 hover:text-white/70 disabled:opacity-50"
                                        >
                                            ↻ Refresh
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Toast Container */}
            <TxToastContainer toasts={toasts} onClose={hide} />
        </div>
    );
}

