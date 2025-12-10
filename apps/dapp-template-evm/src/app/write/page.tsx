'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useAccount, useChainId } from 'wagmi';
import { parseUnits, isAddress, type Address } from 'viem';
import { erc20Abi, TOKENS, type TokenInfo } from '@hst/abis';
import { TokenInput, AddressDisplay, ConnectButton, ChainSelector, TxToast, TxToastContainer, useTxToast } from '@hst/ui-web3';
import { useTokenBalance, useTokenApproval, useContractWrite, formatBalance, type TxStatus } from '@hst/hooks-web3';

export default function WritePage() {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();
    const { toasts, show, update, hide } = useTxToast();

    // Form state
    const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');

    // Get available tokens
    const chainTokens = TOKENS[chainId] ?? {};
    const tokenList = Object.values(chainTokens);

    // Set default token
    useMemo(() => {
        if (!selectedToken && tokenList.length > 0) {
            setSelectedToken(tokenList[0]);
        }
    }, [tokenList, selectedToken]);

    // Parse amount
    const parsedAmount = useMemo(() => {
        if (!amount || !selectedToken) return 0n;
        try {
            return parseUnits(amount, selectedToken.decimals);
        } catch {
            return 0n;
        }
    }, [amount, selectedToken]);

    // Token balance
    const { balance, formatted: balanceFormatted } = useTokenBalance({
        token: selectedToken?.address as Address,
        watch: true,
        enabled: !!selectedToken && isConnected,
    });

    // Approval hook (approve to self for demo - in real app, this would be a DEX/protocol)
    const spenderAddress = recipientAddress && isAddress(recipientAddress)
        ? recipientAddress as Address
        : undefined;

    const {
        isApproved,
        isApproving,
        approve,
        error: approvalError,
    } = useTokenApproval({
        token: selectedToken?.address as Address,
        spender: spenderAddress!,
        amount: parsedAmount,
        enabled: !!selectedToken && !!spenderAddress && parsedAmount > 0n,
    });

    // Transfer hook
    const {
        status: transferStatus,
        txHash: transferHash,
        error: transferError,
        isLoading: isTransferring,
        write: transfer,
        reset: resetTransfer,
    } = useContractWrite({
        address: selectedToken?.address as Address,
        abi: erc20Abi,
        functionName: 'transfer',
        onSubmitted: (hash) => {
            show('transfer', {
                status: 'pending',
                txHash: hash,
                title: 'Transfer Pending',
                message: `Sending ${amount} ${selectedToken?.symbol}...`,
            });
        },
        onSuccess: () => {
            update('transfer', {
                status: 'success',
                title: 'Transfer Complete',
                message: `Successfully sent ${amount} ${selectedToken?.symbol}`,
            });
            setAmount('');
        },
        onError: (err) => {
            show('transfer', {
                status: 'error',
                error: err.message,
            });
        },
    });

    // Handle transfer
    const handleTransfer = async () => {
        if (!spenderAddress || parsedAmount === 0n) return;

        show('transfer', {
            status: 'signing',
            title: 'Confirm Transfer',
            message: 'Please confirm in your wallet',
        });

        await transfer([spenderAddress, parsedAmount]);
    };

    // Handle approve
    const handleApprove = async () => {
        show('approve', {
            status: 'signing',
            title: 'Confirm Approval',
            message: 'Please confirm in your wallet',
        });

        await approve();

        update('approve', {
            status: 'success',
            title: 'Approval Complete',
        });

        setTimeout(() => hide('approve'), 3000);
    };

    // Validation
    const isValidRecipient = recipientAddress && isAddress(recipientAddress);
    const hasInsufficientBalance = balance !== undefined && parsedAmount > balance;
    const canTransfer = isConnected && isValidRecipient && parsedAmount > 0n && !hasInsufficientBalance && isApproved;
    const needsApproval = isConnected && isValidRecipient && parsedAmount > 0n && !hasInsufficientBalance && !isApproved;

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            dApp Template
                        </Link>
                        <nav className="hidden md:flex items-center gap-6">
                            <Link href="/" className="text-white/70 hover:text-white transition-colors">
                                Dashboard
                            </Link>
                            <Link href="/read" className="text-white/70 hover:text-white transition-colors">
                                Read
                            </Link>
                            <Link href="/write" className="text-white font-medium">
                                Write
                            </Link>
                            <Link href="/events" className="text-white/70 hover:text-white transition-colors">
                                Events
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <ChainSelector />
                        <ConnectButton showBalance />
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-lg mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Send Tokens</h1>
                    <p className="text-white/50 mb-8">Transfer ERC20 tokens with approval flow</p>

                    <div className="card">
                        {/* Token Selection */}
                        <div className="mb-4">
                            <label className="block text-sm text-white/50 mb-2">Token</label>
                            <div className="flex flex-wrap gap-2">
                                {tokenList.map((token) => (
                                    <button
                                        key={token.address}
                                        onClick={() => setSelectedToken(token)}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${selectedToken?.address === token.address
                                                ? 'bg-blue-500 text-white'
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
                                showMax
                                error={hasInsufficientBalance ? 'Insufficient balance' : undefined}
                            />
                        </div>

                        {/* Recipient Address */}
                        <div className="mb-6">
                            <label className="block text-sm text-white/50 mb-2">Recipient Address</label>
                            <input
                                type="text"
                                value={recipientAddress}
                                onChange={(e) => setRecipientAddress(e.target.value)}
                                placeholder="0x..."
                                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
                            />
                            {recipientAddress && !isValidRecipient && (
                                <p className="text-red-400 text-sm mt-1">Invalid address</p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        {!isConnected ? (
                            <ConnectButton />
                        ) : needsApproval ? (
                            <button
                                onClick={handleApprove}
                                disabled={isApproving}
                                className="btn btn-primary w-full"
                            >
                                {isApproving ? 'Approving...' : `Approve ${selectedToken?.symbol}`}
                            </button>
                        ) : (
                            <button
                                onClick={handleTransfer}
                                disabled={!canTransfer || isTransferring}
                                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isTransferring ? 'Sending...' : `Send ${selectedToken?.symbol ?? 'Token'}`}
                            </button>
                        )}

                        {/* Error Display */}
                        {(approvalError || transferError) && (
                            <p className="text-red-400 text-sm mt-4 text-center">
                                {approvalError || transferError?.message}
                            </p>
                        )}
                    </div>
                </div>
            </main>

            {/* Toast Container */}
            <TxToastContainer toasts={toasts} onClose={hide} />
        </div>
    );
}
