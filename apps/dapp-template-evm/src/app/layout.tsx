import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Web3Provider } from '@/providers';
import './globals.css';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    variable: '--font-mono',
});

export const metadata: Metadata = {
    title: 'dApp Template | Web3 Starter',
    description: 'A modern Web3 dApp template with wagmi, RainbowKit, and Next.js',
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
            <body className="antialiased">
                <Web3Provider>{children}</Web3Provider>
            </body>
        </html>
    );
}
