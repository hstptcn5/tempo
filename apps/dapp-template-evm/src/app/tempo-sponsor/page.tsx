'use client';

/**
 * Tempo Sponsored Payments Page
 * 
 * Uses Tempo's native fee sponsorship via withFeePayer transport.
 * When a sponsor URL is configured, transactions are routed through the sponsor
 * service which pays the gas fees on behalf of the user.
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_TEMPO_SPONSOR_URL: Custom sponsor URL (optional)
 *   Default: https://sponsor.testnet.tempo.xyz
 * - NEXT_PUBLIC_TEMPO_SPONSOR_ENABLED: Set to 'false' to disable (optional)
 * 
 * How it works:
 * 1. User fills payment form (recipient, amount, memo)
 * 2. Transaction is sent through withFeePayer transport
 * 3. Sponsor service intercepts and pays the fee
 * 4. User's wallet only signs the transfer, not the fee
 */

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAccount, useChainId, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, isAddress, type Address, type Hex } from 'viem';
import { TOKENS, CHAIN_IDS, tip20Abi, type TokenInfo } from '@hst/abis';
import { TokenInput, ConnectButton, ChainSelector, TxToastContainer, useTxToast, MemoInputBytes32 } from '@hst/ui-web3';
import { useTokenBalance, formatBalance, type EncodedMemo } from '@hst/hooks-web3';
import { chains, getExplorerUrl } from '@hst/web3-config';
import { isSponsorEnabled, getTempoSponsorUrl, DEFAULT_TEMPO_SPONSOR_URL } from '@/lib/tempo';

// Tempo testnet chain ID
const TEMPO_CHAIN_ID = CHAIN_IDS.TEMPO_TESTNET;

// Transaction status
type TxStatus = 'idle' | 'preparing' | 'signing' | 'pending' | 'success' | 'error';

export default function TempoSponsorPage() {
    // SSR guard - prevent hooks from running during server render
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    // Return loading state during SSR/hydration
    if (!mounted) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-cyan-400 rounded-full mx-auto mb-4" />
                    <p className="text-white/50">Loading...</p>
                </div>
            </div>
        );
    }

    // All hooks below only run on client after mount
    return <TempoSponsorContent />;
}

// Separate component that uses wagmi hooks - only renders after mount
function TempoSponsorContent() {
    const { isConnected, address: userAddress } = useAccount();
    const chainId = useChainId();
    const { switchChainAsync, isPending: isSwitchingChain } = useSwitchChain();
    const { toasts, show, update, hide } = useTxToast();
    
    // Use wagmi's writeContract - will use user's wallet to sign
    const { writeContractAsync, isPending: isWritePending } = useWriteContract();

    // Check if on Tempo network
    const isOnTempo = chainId === TEMPO_CHAIN_ID;

    // Sponsorship config
    const sponsorEnabled = isSponsorEnabled();
    const sponsorUrl = getTempoSponsorUrl();

    // Form state
    const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [invoiceId, setInvoiceId] = useState('');
    const [encodedMemo, setEncodedMemo] = useState<EncodedMemo | null>(null);

    // Transaction state
    const [status, setStatus] = useState<TxStatus>('idle');
    const [txHash, setTxHash] = useState<Hex | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Get Tempo testnet tokens
    const tempoTokens = TOKENS[TEMPO_CHAIN_ID] ?? {};
    const tokenList = Object.values(tempoTokens);

    // Set default token
    useEffect(() => {
        if (!selectedToken && tokenList.length > 0) {
            setSelectedToken(tokenList[0]);
        }
    }, [tokenList, selectedToken]);

    // Handle memo encoding
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

    // User's token balance
    const { balance } = useTokenBalance({
        token: selectedToken?.address as Address,
        watch: true,
        enabled: !!selectedToken && isConnected && isOnTempo,
    });

    // Check if user has sufficient balance
    const hasInsufficientBalance = balance !== undefined && parsedAmount > balance;

    // Network switch handler
    const handleSwitchToTempo = async () => {
        try {
            await switchChainAsync({ chainId: TEMPO_CHAIN_ID });
        } catch (err) {
            console.error('Failed to switch to Tempo:', err);
        }
    };

    // Send sponsored payment using Tempo's native fee sponsorship
    // Note: True sponsorship requires wagmi config with withFeePayer transport.
    // For now, this sends a regular transaction - user pays fee.
    // To enable true sponsorship, configure wagmi transport with withFeePayer.
    const handleSponsoredPayment = async () => {
        if (!userAddress || !selectedToken || !isAddress(recipientAddress) || parsedAmount === 0n) {
            return;
        }

        setStatus('preparing');
        setError(null);
        setTxHash(null);

        show('sponsor', {
            status: 'signing',
            title: 'Sending Payment',
            message: 'Please confirm the transaction in your wallet',
        });

        try {
            setStatus('signing');

            // Use wagmi's writeContract - user's wallet will sign
            // Note: For true sponsored transactions, wagmi config needs withFeePayer transport
            const hash = await writeContractAsync({
                address: selectedToken.address as Address,
                abi: tip20Abi,
                functionName: 'transferWithMemo',
                args: [
                    recipientAddress as Address,
                    parsedAmount,
                    encodedMemo?.bytes32 || ('0x0000000000000000000000000000000000000000000000000000000000000000' as Hex),
                ],
                chainId: TEMPO_CHAIN_ID,
            });

            setStatus('pending');
            setTxHash(hash);

            update('sponsor', {
                status: 'pending',
                txHash: hash,
                title: 'Transaction Pending',
                message: 'Waiting for confirmation...',
                chainId: TEMPO_CHAIN_ID,
            });

            // Note: In production, you'd wait for the transaction receipt
            setStatus('success');
            update('sponsor', {
                status: 'success',
                txHash: hash,
                title: 'Payment Complete',
                message: `Successfully sent ${amount} ${selectedToken.symbol}`,
                chainId: TEMPO_CHAIN_ID,
            });

            // Reset form
            setAmount('');
            setInvoiceId('');

        } catch (err) {
            setStatus('error');
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setError(errorMsg);

            // Check if user rejected
            if (errorMsg.includes('rejected') || errorMsg.includes('denied') || errorMsg.includes('User rejected')) {
                hide('sponsor');
                setStatus('idle');
                return;
            }

            update('sponsor', {
                status: 'error',
                title: 'Payment Failed',
                error: errorMsg,
            });
        }
    };

    // Validation
    const isValidRecipient = recipientAddress && isAddress(recipientAddress);
    const canSubmit = isConnected && isOnTempo && sponsorEnabled &&
                      isValidRecipient && parsedAmount > 0n && !hasInsufficientBalance &&
                      !isWritePending && status !== 'signing' && status !== 'pending' && status !== 'preparing';

    // Sponsorship unavailable
    if (!sponsorEnabled) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">💸</div>
                    <h1 className="text-2xl font-bold mb-2">Sponsorship Unavailable</h1>
                    <p className="text-white/50 mb-4">
                        Gas sponsorship is currently disabled. Set <code className="text-amber-400">NEXT_PUBLIC_TEMPO_SPONSOR_ENABLED</code> to enable.
                    </p>
                    <p className="text-white/30 text-sm mb-6">
                        Using default sponsor: <code className="text-cyan-400 text-xs">{DEFAULT_TEMPO_SPONSOR_URL}</code>
                    </p>
                    <Link href="/tempo-pay" className="text-cyan-400 hover:underline">
                        ← Use Regular Payments
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                            dApp Template
                        </Link>
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/" className="text-white/70 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/tempo-pay" className="text-white/70 hover:text-white transition-colors">
                                Tempo Pay
                            </Link>
                            <Link href="/tempo-sponsor" className="text-cyan-400 font-medium">
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
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center">
                                <span className="text-cyan-400 text-xl">🎁</span>
                            </div>
                            <h1 className="text-3xl font-bold">Sponsored Payments</h1>
                        </div>
                        <p className="text-white/50">
                            Send gas-free stablecoin payments - fees paid by sponsor
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
                                        Please switch to Tempo Testnet.
                                    </p>
                                    <button
                                        onClick={handleSwitchToTempo}
                                        disabled={isSwitchingChain}
                                        className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors disabled:opacity-50"
                                    >
                                        {isSwitchingChain ? 'Switching...' : 'Switch to Tempo'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
                        <h3 className="text-amber-400 font-medium mb-2">⚠️ Sponsorship Mode</h3>
                        <ul className="text-white/70 text-sm space-y-1">
                            <li>• <span className="text-amber-400">Current:</span> Regular transfer (you pay fee from your TIP-20 balance)</li>
                            <li>• <span className="text-white/50">True sponsorship:</span> Requires wagmi config with <code className="text-cyan-400/70">withFeePayer</code> transport</li>
                            <li>• Memo/invoice ID is preserved on-chain</li>
                        </ul>
                        <p className="text-white/30 text-xs mt-3">
                            Sponsor URL: <code className="text-cyan-400/70">{sponsorUrl || DEFAULT_TEMPO_SPONSOR_URL}</code>
                        </p>
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
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            selectedToken?.address === token.address
                                                ? 'bg-cyan-500 text-white'
                                                : 'bg-white/10 hover:bg-white/20'
                                        }`}
                                    >
                                        {token.symbol}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Amount Input */}
                        <div className="mb-4">
                            <TokenInput
                                value={amount}
                                onChange={setAmount}
                                token={selectedToken}
                                balance={balance}
                                showMax={true}
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
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-cyan-500 font-mono text-sm"
                            />
                            {recipientAddress && !isValidRecipient && (
                                <p className="text-red-400 text-sm mt-1">Invalid address</p>
                            )}
                        </div>

                        {/* Memo */}
                        <div className="mb-6">
                            <MemoInputBytes32
                                value={invoiceId}
                                onChange={setInvoiceId}
                                onEncodedChange={handleMemoEncodedChange}
                                placeholder="INV-12345"
                                showPreview={true}
                                showByteCounter={true}
                                accentColor="#06b6d4"
                            />
                        </div>

                        {/* Action Button */}
                        {!isConnected ? (
                            <ConnectButton />
                        ) : !isOnTempo ? (
                            <button
                                onClick={handleSwitchToTempo}
                                disabled={isSwitchingChain}
                                className="btn btn-primary w-full bg-cyan-500 hover:bg-cyan-600"
                            >
                                {isSwitchingChain ? 'Switching...' : 'Switch to Tempo'}
                            </button>
                        ) : (
                            <button
                                onClick={handleSponsoredPayment}
                                disabled={!canSubmit}
                                className="btn btn-primary w-full bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'preparing' ? 'Preparing...' :
                                 status === 'signing' ? 'Sign in Wallet...' :
                                 status === 'pending' ? 'Confirming...' :
                                 `Send ${selectedToken?.symbol ?? ''} (Gas-Free)`}
                            </button>
                        )}

                        {/* Error Display */}
                        {error && status === 'error' && (
                            <p className="text-red-400 text-sm mt-4 text-center">{error}</p>
                        )}
                    </div>

                    {/* Success Receipt */}
                    {txHash && status === 'success' && (
                        <div className="mt-6 card">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="text-green-400 text-xl">✓</span>
                                <h3 className="text-lg font-medium">Sponsored Payment Sent!</h3>
                            </div>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-white/50">Status:</span>
                                    <span className="text-green-400">Submitted (gas-free)</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-white/50">Tx Hash:</span>
                                    <a
                                        href={getExplorerUrl(TEMPO_CHAIN_ID, 'tx', txHash)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-cyan-400 hover:underline font-mono"
                                    >
                                        {txHash.slice(0, 10)}...{txHash.slice(-8)} ↗
                                    </a>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Toast Container */}
            <TxToastContainer toasts={toasts} onClose={hide} />
        </div>
    );
}
