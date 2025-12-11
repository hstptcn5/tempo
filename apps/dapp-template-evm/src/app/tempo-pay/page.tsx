'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { parseUnits, isAddress, type Address } from 'viem';
import { TOKENS, CHAIN_IDS, type TokenInfo } from '@hst/abis';
import { TokenInput, ConnectButton, TxToastContainer, useTxToast, MemoInputBytes32, TempoPayReceipt, type PaymentDetails } from '@hst/ui-web3';
import { useTokenBalance, useTip20TransferWithMemo, useRecentTip20Payments, useComplianceCheck, type EncodedMemo } from '@hst/hooks-web3';
import { MinecraftNavbar } from '../components/MinecraftNavbar';

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
        onSuccess: () => {
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
        <div className="min-h-screen bg-background-light dark:bg-background-dark">
            {/* Minecraft-style Navbar */}
            <MinecraftNavbar activePage="Pay" />

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-lg mx-auto">
                    {/* Header Section */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 bg-primary border-4 border-black flex items-center justify-center">
                                <span className="material-icons text-black">payments</span>
                            </div>
                            <h1 className="text-3xl font-display text-gray-900 dark:text-white">Tempo Pay</h1>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 font-mono">
                            Send stablecoin payments with invoice memos on Tempo Testnet
                        </p>
                    </div>

                    {/* Network Notice */}
                    {isConnected && !isOnTempo && (
                        <div className="mb-6 p-4 border-4 border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-block">
                            <div className="flex items-start gap-3">
                                <div className="text-amber-500 text-xl">⚠️</div>
                                <div className="flex-1">
                                    <h3 className="text-amber-700 font-medium mb-1">Wrong Network</h3>
                                    <p className="text-amber-700/70 text-sm mb-3">
                                        Please switch to Tempo Testnet to use this feature.
                                    </p>
                                    <button
                                        onClick={handleSwitchToTempo}
                                        disabled={isSwitchingChain}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-full transition-colors disabled:opacity-50"
                                    >
                                        {isSwitchingChain ? 'Switching...' : 'Switch to Tempo Testnet'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="mb-6 card-block bg-blue-50 dark:bg-blue-900/20 !border-2 !p-4 !shadow-none">
                        <h3 className="text-blue-700 dark:text-blue-300 font-display mb-2 text-lg">ℹ️ About Tempo</h3>
                        <ul className="text-gray-600 dark:text-gray-400 text-sm font-mono space-y-1">
                            <li>• <strong>No native gas token</strong> - fees paid in TIP-20 stablecoins</li>
                            <li>• <strong>32-byte memo</strong> - attach invoice IDs for reconciliation</li>
                            <li>• <strong>Testnet faucet:</strong> <code className="bg-black/10 dark:bg-white/10 px-1">cast rpc tempo_fundAddress YOUR_ADDRESS</code></li>
                        </ul>
                    </div>

                    {/* Payment Form */}
                    <div className="card-block">
                        {/* Token Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-display mb-2 text-gray-700 dark:text-gray-300">TIP-20 Stablecoin</label>
                            <div className="flex flex-wrap gap-2">
                                {tokenList.map((token) => (
                                    <button
                                        key={token.address}
                                        onClick={() => setSelectedToken(token)}
                                        className={`px-4 py-2 text-sm font-display uppercase border-2 border-black transition-all ${selectedToken?.address === token.address
                                            ? 'bg-primary text-black shadow-block'
                                            : 'bg-white hover:bg-gray-50 text-gray-600'
                                            }`}
                                    >
                                        {token.symbol}
                                    </button>
                                ))}
                            </div>
                            {!isOnTempo && tokenList.length === 0 && (
                                <p className="text-aqua-text/50 text-sm mt-2">
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
                        <div className="mb-6">
                            <label className="block text-sm font-display mb-2 text-gray-700 dark:text-gray-300">Recipient Address</label>
                            <input
                                type="text"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:outline-none focus:border-aqua-cyan focus:ring-2 focus:ring-aqua-cyan/20 font-mono text-sm text-aqua-text"
                            />
                            {recipientAddress && !isValidRecipient && (
                                <p className="text-red-500 text-sm mt-1">Invalid address</p>
                            )}
                        </div>

                        {/* TIP-403 Compliance Status */}
                        {isValidRecipient && parsedAmount > 0n && (
                            <div className={`mb-4 p-3 rounded-xl border ${complianceStatus === 'allowed'
                                ? 'bg-green-50 border-green-200'
                                : complianceStatus === 'blocked'
                                    ? 'bg-red-50 border-red-200'
                                    : complianceStatus === 'checking'
                                        ? 'bg-blue-50 border-blue-200'
                                        : 'bg-gray-50 border-gray-200'
                                }`}>
                                <div className="flex items-center gap-2 text-sm">
                                    {complianceStatus === 'checking' && (
                                        <>
                                            <div className="animate-spin w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full" />
                                            <span className="text-blue-600">Checking compliance...</span>
                                        </>
                                    )}
                                    {complianceStatus === 'allowed' && (
                                        <>
                                            <span className="text-green-600">✓</span>
                                            <span className="text-green-600">Transfer likely allowed</span>
                                        </>
                                    )}
                                    {complianceStatus === 'blocked' && (
                                        <>
                                            <span className="text-red-600">✗</span>
                                            <span className="text-red-600">{complianceMessage}</span>
                                        </>
                                    )}
                                    {complianceStatus === 'error' && (
                                        <>
                                            <span className="text-amber-600">⚠</span>
                                            <span className="text-amber-600">{complianceMessage}</span>
                                        </>
                                    )}
                                    {complianceStatus === 'unknown' && (
                                        <span className="text-gray-500">
                                            Compliance check pending...
                                        </span>
                                    )}
                                </div>
                                {complianceStatus === 'blocked' && (
                                    <p className="text-gray-500 text-xs mt-1">
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
                                accentColor="#00C6FF"
                            />
                        </div>

                        {/* Action Button */}
                        {!isConnected ? (
                            <ConnectButton />
                        ) : !isOnTempo ? (
                            <button
                                onClick={handleSwitchToTempo}
                                disabled={isSwitchingChain}
                                className="w-full py-3 bg-aqua-gradient text-white font-medium rounded-full shadow-water-glow hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                {isSwitchingChain ? 'Switching Network...' : 'Switch to Tempo Testnet'}
                            </button>
                        ) : (
                            <button
                                onClick={handleTransfer}
                                disabled={!canTransfer || isTransferring}
                                className="w-full py-3 bg-aqua-gradient text-white font-medium rounded-full shadow-water-glow hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
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
                                <span className="text-aqua-text/60 text-sm">
                                    {showRecentPayments ? '▲ Hide' : '▼ Show'}
                                </span>
                            </button>

                            {showRecentPayments && (
                                <div className="space-y-3">
                                    {isLoadingPayments && recentPayments.length === 0 && (
                                        <div className="text-center py-8 text-aqua-text/60">
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
                                        <div className="text-center py-8 text-aqua-text/60">
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
                                            className="w-full py-2 text-sm text-aqua-text/60 hover:text-white/70 disabled:opacity-50"
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

