/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
    reactStrictMode: true,
    output: 'export', // Static export for Vercel/Netlify - avoids SSR issues with Web3 libs
    distDir: process.env.VERCEL ? '../../dist' : '.next', // Output to root dist on Vercel
    images: {
        unoptimized: true, // Required for static export
    },
    transpilePackages: [
        '@hst/ui-web3',
        '@hst/hooks-web3',
        '@hst/web3-config',
        '@hst/abis',
    ],
    webpack: (config) => {
        config.resolve.fallback = { fs: false, net: false, tls: false };
        config.externals.push('pino-pretty', 'lokijs', 'encoding');

        // Fix: Force resolve wagmi and related packages from root node_modules
        // This prevents duplicate module instances when using transpilePackages
        config.resolve.alias = {
            ...config.resolve.alias,
            wagmi: path.resolve(__dirname, 'node_modules/wagmi'),
            '@tanstack/react-query': path.resolve(__dirname, 'node_modules/@tanstack/react-query'),
            viem: path.resolve(__dirname, 'node_modules/viem'),
            '@rainbow-me/rainbowkit': path.resolve(__dirname, 'node_modules/@rainbow-me/rainbowkit'),
        };

        return config;
    },
};

module.exports = nextConfig;
