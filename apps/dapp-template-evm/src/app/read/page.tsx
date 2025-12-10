'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { isAddress } from 'viem';
import { erc20Abi, TOKENS, getToken } from '@hst/abis';
import { TokenInput, AddressDisplay, ConnectButton, ChainSelector } from '@hst/ui-web3';
import { useTokenBalance, formatBalance } from '@hst/hooks-web3';

export default function ReadPage() {
    const { isConnected, address } = useAccount();
    const chainId = useChainId();

    // Token address input
    const [tokenAddress, setTokenAddress] = useState('');
    const validTokenAddress = isAddress(tokenAddress) ? tokenAddress : undefined;

    // Get token info
    const { data: tokenName } = useReadContract({
        address: validTokenAddress,
        abi: erc20Abi,
        functionName: 'name',
        query: { enabled: !!validTokenAddress },
    });

    const { data: tokenSymbol } = useReadContract({
        address: validTokenAddress,
        abi: erc20Abi,
        functionName: 'symbol',
        query: { enabled: !!validTokenAddress },
    });

    const { data: tokenDecimals } = useReadContract({
        address: validTokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
        query: { enabled: !!validTokenAddress },
    });

    const { data: totalSupply } = useReadContract({
        address: validTokenAddress,
        abi: erc20Abi,
        functionName: 'totalSupply',
        query: { enabled: !!validTokenAddress },
    });

    // Balance using our hook
    const { balance, formatted: balanceFormatted, isLoading: balanceLoading } = useTokenBalance({
        token: validTokenAddress!,
        watch: true,
        enabled: !!validTokenAddress && isConnected,
    });

    // Quick token select
    const chainTokens = TOKENS[chainId] ?? {};
    const quickTokens = Object.entries(chainTokens).slice(0, 4);

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
                            <Link href="/read" className="text-white font-medium">
                                Read
                            </Link>
                            <Link href="/write" className="text-white/70 hover:text-white transition-colors">
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
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-3xl font-bold mb-2">Read Contract</h1>
                    <p className="text-white/50 mb-8">Query ERC20 token information from any contract</p>

                    {/* Token Address Input */}
                    <div className="card mb-6">
                        <label className="block text-sm text-white/50 mb-2">Token Address</label>
                        <input
                            type="text"
                            value={tokenAddress}
                            onChange={(e) => setTokenAddress(e.target.value)}
                            placeholder="0x..."
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500 font-mono"
                        />

                        {/* Quick select tokens */}
                        {quickTokens.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                <span className="text-sm text-white/50">Quick select:</span>
                                {quickTokens.map(([symbol, token]) => (
                                    <button
                                        key={symbol}
                                        onClick={() => setTokenAddress(token.address)}
                                        className="px-3 py-1 text-sm bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                                    >
                                        {symbol}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Token Info */}
                    {validTokenAddress && (
                        <div className="card">
                            <h2 className="text-lg font-semibold mb-4">Token Information</h2>

                            <div className="space-y-4">
                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-white/50">Name</span>
                                    <span>{tokenName ?? '...'}</span>
                                </div>

                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-white/50">Symbol</span>
                                    <span>{tokenSymbol ?? '...'}</span>
                                </div>

                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-white/50">Decimals</span>
                                    <span>{tokenDecimals !== undefined ? tokenDecimals.toString() : '...'}</span>
                                </div>

                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-white/50">Total Supply</span>
                                    <span>
                                        {totalSupply !== undefined && tokenDecimals !== undefined
                                            ? formatBalance(totalSupply, tokenDecimals, { compact: true })
                                            : '...'}
                                    </span>
                                </div>

                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-white/50">Contract</span>
                                    <AddressDisplay address={validTokenAddress} />
                                </div>

                                {isConnected && (
                                    <div className="flex justify-between py-2">
                                        <span className="text-white/50">Your Balance</span>
                                        <span>
                                            {balanceLoading ? '...' : `${balanceFormatted} ${tokenSymbol ?? ''}`}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!isConnected && (
                        <div className="card text-center py-8 mt-6">
                            <p className="text-white/50 mb-4">Connect wallet to see your balance</p>
                            <ConnectButton />
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
