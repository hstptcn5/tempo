'use client';

import React from 'react';
import Link from 'next/link';
import { useAccount, useBalance } from 'wagmi';
import { formatBalance } from '@hst/hooks-web3';
import { MinecraftNavbar } from './components/MinecraftNavbar';

// ============================================
// MINECRAFT-STYLE TEMPOPAY HOMEPAGE
// ============================================

// Quick actions for wallet card
const QUICK_ACTIONS = [
    { icon: 'send', label: 'Send', href: '/tempo-pay' },
    { icon: 'sync', label: 'Swap', href: '/tempo-swap' },
    { icon: 'layers', label: 'Batch', href: '/tempo-batch' },
];

export default function HomePage() {
    return (
        <>
            {/* Minecraft-style Navbar with shared theme logic */}
            <MinecraftNavbar activePage="Home" />

            {/* Main Content */}
            <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
                {/* Pixel Decorations */}
                <PixelDecoration position="top-10 left-10" color="gray" />
                <PixelDecoration position="bottom-20 right-20" color="primary" />

                {/* Hero Grid */}
                <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left: Hero Text */}
                    <HeroContent />

                    {/* Right: Wallet Interface */}
                    <WalletCard />
                </div>
            </main>

            {/* Features Section */}
            <FeaturesSection />
        </>
    );
}

// ============ HERO CONTENT ============
function HeroContent() {
    return (
        <div className="space-y-8 z-10">
            {/* Status Badge */}
            <div className="badge-pixel">
                <div className="w-2 h-2 bg-primary"></div>
                Live on Tempo Testnet
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-display leading-tight text-gray-900 dark:text-white">
                Stablecoin-<br />First <br />
                <span className="text-primary bg-gray-900 dark:bg-transparent px-2 inline-block transform -skew-x-6 border-4 border-transparent dark:border-primary">
                    Blockchain.
                </span>
            </h1>

            {/* Description */}
            <p className="font-mono text-lg text-gray-600 dark:text-gray-400 max-w-lg leading-relaxed border-l-4 border-gray-300 dark:border-gray-700 pl-4">
                Experience seamless TIP-20 payments with memo tracking. Send stablecoins with invoice IDs, batch transfers, and gas-free sponsorship.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-6 pt-4">
                <Link href="/tempo-pay">
                    <button className="group relative px-8 py-4 bg-primary border-4 border-black dark:border-white shadow-block hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                        <div className="flex items-center gap-3">
                            <span className="font-display text-xl text-black uppercase">Start Sending</span>
                            <span className="material-icons text-black group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    </button>
                </Link>
                <Link href="/tempo-swap">
                    <button className="group relative px-8 py-4 bg-white dark:bg-gray-800 border-4 border-gray-300 dark:border-gray-600 shadow-block hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                        <div className="flex items-center gap-3">
                            <span className="material-icons text-gray-600 dark:text-gray-300">sync_alt</span>
                            <span className="font-display text-xl text-gray-900 dark:text-white uppercase">Swap Stablecoins</span>
                        </div>
                    </button>
                </Link>
            </div>
        </div>
    );
}

// ============ WALLET CARD ============
function WalletCard() {
    const { address, isConnected } = useAccount();
    const { data: balanceData } = useBalance({
        address,
        query: { enabled: !!address },
    });

    const balanceFormatted = balanceData
        ? formatBalance(balanceData.value, balanceData.decimals)
        : '0';

    // Display large number with ellipsis effect
    const displayBalance = isConnected
        ? parseFloat(balanceFormatted).toLocaleString()
        : '4,242,424,242';

    return (
        <div className="relative z-10">
            {/* Main Card */}
            <div className="card-block p-2">
                {/* Window Title Bar */}
                <div className="window-titlebar mb-6">
                    <span className="font-mono text-xs uppercase tracking-widest text-gray-500">
                        Wallet Interface v1.0
                    </span>
                    <div className="window-controls">
                        <div className="window-btn bg-red-500"></div>
                        <div className="window-btn bg-yellow-500"></div>
                        <div className="window-btn bg-green-500"></div>
                    </div>
                </div>

                {/* Card Content */}
                <div className="px-6 pb-8">
                    {/* Balance Display */}
                    <div className="mb-8">
                        <label className="block font-mono text-sm text-gray-500 mb-1">Your Balance</label>
                        <div className="relative overflow-hidden group">
                            <div className="text-pixel-lg text-gray-900 dark:text-white break-all">
                                {displayBalance}
                                <span className="text-gray-300 dark:text-gray-600">...</span>
                            </div>
                            <div className="font-display text-2xl text-primary mt-2">USD</div>

                            {/* Connection Status Badge */}
                            {isConnected && (
                                <div className="absolute top-0 right-0 hidden sm:flex items-center gap-2 bg-green-100 dark:bg-green-900 border-2 border-primary px-2 py-1">
                                    <span className="font-mono text-xs font-bold text-green-800 dark:text-green-300 uppercase">
                                        Connected
                                    </span>
                                    <span className="material-icons text-sm text-green-600 dark:text-green-400">check</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Quick Action Tiles */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {QUICK_ACTIONS.map((action) => (
                            <Link key={action.label} href={action.href}>
                                <button className="action-tile w-full group">
                                    <span className="material-icons text-3xl mb-2 text-gray-400 group-hover:text-primary transition-colors">
                                        {action.icon}
                                    </span>
                                    <span className="font-mono text-sm font-bold uppercase text-gray-600 dark:text-gray-300 group-hover:text-primary">
                                        {action.label}
                                    </span>
                                </button>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Floating Compliance Badge */}
            <div
                className="absolute -bottom-6 -left-6 sm:left-[-20px] bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-500 shadow-block p-3 flex items-center gap-3 max-w-xs"
                style={{ animation: 'bounce 3s infinite' }}
            >
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-400">
                    <span className="material-icons text-gray-600 dark:text-gray-300">security</span>
                </div>
                <div>
                    <div className="text-[10px] font-mono text-gray-400 uppercase">TIP-403</div>
                    <div className="font-display text-sm text-gray-900 dark:text-white">Compliance Ready</div>
                </div>
            </div>
        </div>
    );
}

// ============ PIXEL DECORATION ============
function PixelDecoration({ position, color }: { position: string; color: 'gray' | 'primary' }) {
    const colorClass = color === 'primary' ? 'bg-primary' : 'bg-gray-400 dark:bg-gray-600';

    return (
        <div className={`absolute ${position} opacity-20 pointer-events-none hidden lg:block`}>
            <div
                className={`w-16 h-8 ${colorClass}`}
                style={{
                    boxShadow: '16px 0 0 0 currentColor, 32px 0 0 0 currentColor, 8px -16px 0 0 currentColor, 24px -16px 0 0 currentColor'
                }}
            ></div>
        </div>
    );
}

// ============ FEATURES SECTION ============
function FeaturesSection() {
    return (
        <div className="w-full bg-gray-100 dark:bg-gray-900 border-t-4 border-gray-200 dark:border-gray-700 py-12">
            <div className="max-w-7xl mx-auto px-4 text-center">
                <h2 className="text-3xl font-display text-gray-900 dark:text-white mb-4">
                    Built for <span className="text-primary underline decoration-wavy decoration-2 underline-offset-4">Stablecoins</span>
                </h2>
                <p className="font-mono text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                    Tempo is the first blockchain designed specifically for stablecoin payments and compliance.
                </p>
                <div className="flex justify-center gap-4 text-gray-400">
                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-700"></div>
                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-700"></div>
                    <div className="w-2 h-2 bg-gray-300 dark:bg-gray-700"></div>
                </div>
            </div>
        </div>
    );
}
