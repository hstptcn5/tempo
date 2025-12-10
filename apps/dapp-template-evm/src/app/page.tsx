'use client';

import Link from 'next/link';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { ConnectButton, ChainSelector } from '@hst/ui-web3';
import { formatAddress, formatBalance } from '@hst/hooks-web3';
import { getChainById } from '@hst/web3-config';

export default function HomePage() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();
    const chain = getChainById(chainId);
    const { data: balanceData } = useBalance({
        address,
        query: { enabled: !!address }
    });
    const balanceFormatted = balanceData
        ? formatBalance(balanceData.value, balanceData.decimals)
        : '0';

    return (
        <div className="min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 glass">
                <div className="container mx-auto flex items-center justify-between px-4 py-4">
                    <div className="flex items-center gap-8">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            dApp Template
                        </h1>
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
                <div className="max-w-4xl mx-auto">
                    {/* Hero Section */}
                    <section className="text-center py-12">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">
                            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                                Web3 dApp Template
                            </span>
                        </h2>
                        <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
                            A production-ready starter for building decentralized applications with
                            Next.js, wagmi, and RainbowKit.
                        </p>
                    </section>

                    {/* Wallet Status Card */}
                    {isConnected && address ? (
                        <div className="card mb-8">
                            <h3 className="text-lg font-semibold mb-4">Wallet Connected</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-white/50 text-sm mb-1">Address</p>
                                    <p className="font-mono">{formatAddress(address)}</p>
                                </div>
                                <div>
                                    <p className="text-white/50 text-sm mb-1">Network</p>
                                    <p>{chain?.name ?? 'Unknown'}</p>
                                </div>
                                <div>
                                    <p className="text-white/50 text-sm mb-1">Balance</p>
                                    <p>{balanceFormatted} {chain?.nativeCurrency?.symbol ?? 'ETH'}</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="card mb-8 text-center py-8">
                            <p className="text-white/50 mb-4">Connect your wallet to get started</p>
                            <ConnectButton />
                        </div>
                    )}

                    {/* Quick Links */}
                    <div className="grid md:grid-cols-3 gap-4">
                        <Link href="/read" className="card hover:border-blue-500/50 transition-colors group">
                            <h3 className="font-semibold group-hover:text-blue-400 transition-colors mb-2">
                                📖 Read Contract
                            </h3>
                            <p className="text-white/50 text-sm">
                                Query contract state, token balances, and on-chain data
                            </p>
                        </Link>

                        <Link href="/write" className="card hover:border-purple-500/50 transition-colors group">
                            <h3 className="font-semibold group-hover:text-purple-400 transition-colors mb-2">
                                ✏️ Write Transaction
                            </h3>
                            <p className="text-white/50 text-sm">
                                Send transactions with approval flow and status toasts
                            </p>
                        </Link>

                        <Link href="/events" className="card hover:border-pink-500/50 transition-colors group">
                            <h3 className="font-semibold group-hover:text-pink-400 transition-colors mb-2">
                                📡 Watch Events
                            </h3>
                            <p className="text-white/50 text-sm">
                                Listen to real-time contract events and updates
                            </p>
                        </Link>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-white/10 mt-16">
                <div className="container mx-auto px-4 py-6 text-center text-white/40 text-sm">
                    Built with HST Web3 Stack
                </div>
            </footer>
        </div>
    );
}
