'use client';

import { type ReactNode, useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { wagmiConfig } from '@/lib/wagmi';

import '@rainbow-me/rainbowkit/styles.css';

// Custom RainbowKit theme
const customTheme = darkTheme({
    accentColor: '#3b82f6',
    accentColorForeground: 'white',
    borderRadius: 'medium',
    fontStack: 'system',
    overlayBlur: 'small',
});

interface Web3ProviderProps {
    children: ReactNode;
}

export function Web3Provider({ children }: Web3ProviderProps) {
    const [mounted, setMounted] = useState(false);
    const [queryClient] = useState(() => new QueryClient());

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider theme={customTheme} modalSize="compact">
                    {mounted ? children : null}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
