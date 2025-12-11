'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useChainId } from 'wagmi';
import { ConnectButton } from '@hst/ui-web3';
import { getChainById } from '@hst/web3-config';

// Navigation items
const NAV_ITEMS = [
    { label: 'Home', href: '/' },
    { label: 'Pay', href: '/tempo-pay' },
    { label: 'Swap', href: '/tempo-swap' },
    { label: 'Batch', href: '/tempo-batch' },
    { label: 'Issuance', href: '/tempo-issuance' },
    { label: 'Sponsor', href: '/tempo-sponsor' },
];

interface MinecraftNavbarProps {
    activePage?: string; // Current page name for highlighting
}

export function MinecraftNavbar({ activePage }: MinecraftNavbarProps) {
    const [darkMode, setDarkMode] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const chainId = useChainId();
    const chain = getChainById(chainId);

    // Toggle dark mode on html element
    useEffect(() => {
        // Check initial dark mode from localStorage or system preference
        const stored = localStorage.getItem('darkMode');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const initialDark = stored ? stored === 'true' : prefersDark;
        setDarkMode(initialDark);
        if (initialDark) {
            document.documentElement.classList.add('dark');
        }
    }, []);

    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem('darkMode', String(newMode));
        if (newMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <nav className="w-full border-b-4 border-gray-900 dark:border-primary sticky top-0 z-50 bg-background-light dark:bg-background-dark">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 md:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-primary border-4 border-black flex items-center justify-center">
                            <span className="material-icons text-black font-bold text-base md:text-xl">bolt</span>
                        </div>
                        <span className="font-display text-xl md:text-2xl tracking-tighter text-gray-900 dark:text-white">
                            Tempo<span className="text-primary">Pay</span>
                        </span>
                    </Link>

                    {/* Nav Links - Desktop */}
                    <div className="hidden md:flex items-center space-x-6">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`font-mono text-sm font-bold uppercase transition-all ${activePage === item.label
                                        ? 'text-primary underline decoration-4 underline-offset-4 decoration-primary'
                                        : 'text-gray-900 dark:text-white hover:text-primary'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Right Side Controls */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Network Badge */}
                        <div className="flex items-center gap-2 px-3 py-2 border-2 border-black dark:border-white bg-gray-200 dark:bg-gray-800 shadow-block-sm">
                            <div className="w-2 h-2 bg-primary animate-pulse"></div>
                            <span className="font-data text-lg uppercase">
                                {chain?.name || 'Network'}
                            </span>
                        </div>

                        {/* Dark Mode Toggle */}
                        <button
                            onClick={toggleDarkMode}
                            className="p-2 bg-gray-200 dark:bg-gray-800 border-2 border-black dark:border-white shadow-block-sm active:translate-y-1 active:shadow-none transition-all"
                        >
                            <span className="material-icons text-gray-900 dark:text-white text-lg">
                                {darkMode ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>

                        {/* Wallet Button */}
                        <ConnectButton />
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="md:hidden p-2 bg-gray-200 dark:bg-gray-800 border-2 border-black"
                    >
                        <span className="material-icons text-gray-900 dark:text-white">
                            {mobileMenuOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t-2 border-black dark:border-gray-600 py-4">
                        <div className="flex flex-col gap-2">
                            {NAV_ITEMS.map((item) => (
                                <Link
                                    key={item.label}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`font-mono text-sm font-bold uppercase py-2 px-4 ${activePage === item.label
                                            ? 'bg-primary text-black'
                                            : 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {item.label}
                                </Link>
                            ))}
                        </div>
                        <div className="flex items-center gap-2 mt-4 px-4">
                            <button
                                onClick={toggleDarkMode}
                                className="p-2 bg-gray-200 dark:bg-gray-800 border-2 border-black"
                            >
                                <span className="material-icons text-sm">
                                    {darkMode ? 'light_mode' : 'dark_mode'}
                                </span>
                            </button>
                            <ConnectButton />
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}
