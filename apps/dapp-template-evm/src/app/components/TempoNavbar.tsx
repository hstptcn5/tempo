'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Droplets } from 'lucide-react';
import { ConnectButton, ChainSelector } from '@hst/ui-web3';
import { chains } from '@hst/web3-config';

interface NavItem {
    label: string;
    href: string;
}

const NAV_ITEMS: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Pay', href: '/tempo-pay' },
    { label: 'Swap', href: '/tempo-swap' },
    { label: 'Batch', href: '/tempo-batch' },
    { label: 'Issuance', href: '/tempo-issuance' },
    { label: 'Sponsor', href: '/tempo-sponsor' },
];

interface TempoNavbarProps {
    showChainSelector?: boolean;
    supportedChains?: any[];
}

export function TempoNavbar({ showChainSelector = true, supportedChains }: TempoNavbarProps) {
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled || mobileMenuOpen
                    ? 'bg-white/80 backdrop-blur-lg shadow-sm py-3'
                    : 'bg-white/60 backdrop-blur-md py-4'
                }`}
        >
            <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="p-2 bg-aqua-gradient rounded-xl text-white group-hover:scale-110 transition-transform duration-300">
                        <Droplets size={20} fill="currentColor" />
                    </div>
                    <span className="font-display font-bold text-lg tracking-tight text-aqua-text">
                        Tempo <span className="text-transparent bg-clip-text bg-aqua-gradient">Pay</span>
                    </span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center gap-6">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`font-sans text-sm font-medium transition-colors ${isActive
                                        ? 'text-aqua-cyan'
                                        : 'text-aqua-text/70 hover:text-aqua-cyan'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Right side actions */}
                <div className="hidden md:flex items-center gap-3">
                    {showChainSelector && (
                        <ChainSelector supportedChains={supportedChains || [chains.tempoTestnet]} />
                    )}
                    <ConnectButton showBalance={false} />
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="md:hidden text-aqua-text focus:outline-none"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {mobileMenuOpen && (
                <div className="md:hidden absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl shadow-lg border-t border-gray-100 p-4 flex flex-col gap-3">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                href={item.href}
                                className={`text-base font-medium py-2 px-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-aqua-cyan/10 text-aqua-cyan'
                                        : 'text-aqua-text hover:bg-aqua-cyan/5'
                                    }`}
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                    <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                        {showChainSelector && (
                            <ChainSelector supportedChains={supportedChains || [chains.tempoTestnet]} />
                        )}
                        <ConnectButton showBalance={false} />
                    </div>
                </div>
            )}
        </nav>
    );
}

export default TempoNavbar;
