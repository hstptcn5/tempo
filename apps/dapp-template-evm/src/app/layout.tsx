'use client';

import './globals.css';
import { Web3Provider } from '@/providers/Web3Provider';

// ============================================
// MINECRAFT THEME - Pixel-style fonts
// ============================================

// Note: Fonts are loaded via Google Fonts links in the head
// Silkscreen - Display/headings (pixel font)
// VT323 - Data/numbers (retro terminal)  
// Space Mono - Body text (clean monospace)
// Material Icons - Icon font

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                {/* Google Fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Silkscreen&family=VT323&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap"
                    rel="stylesheet"
                />
                {/* Material Icons */}
                <link
                    href="https://fonts.googleapis.com/icon?family=Material+Icons"
                    rel="stylesheet"
                />
            </head>
            <body className="bg-background-light dark:bg-background-dark text-gray-900 dark:text-white transition-colors duration-200 min-h-screen flex flex-col font-mono overflow-x-hidden">
                <Web3Provider>{children}</Web3Provider>
            </body>
        </html>
    );
}
