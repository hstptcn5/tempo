import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts'],
        globals: true,
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@hst/hooks-web3': path.resolve(__dirname, '../../packages/hooks-web3/src'),
            '@hst/abis': path.resolve(__dirname, '../../packages/abis/src'),
        },
    },
});

