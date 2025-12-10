import { createWagmiConfig, defaultChains, testnetChains, chains } from '@hst/web3-config';

// WalletConnect requires a project ID. For development, use the public demo ID.
// For production, get your own at https://cloud.walletconnect.com/
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';
const enableTestnets = process.env.NEXT_PUBLIC_ENABLE_TESTNETS === 'true';

if (!process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
    console.warn(
        '⚠️ WalletConnect Project ID not found. Get one at https://cloud.walletconnect.com/'
    );
}

// Include Tempo Testnet by default for stablecoin payment demos
// Tempo is always enabled as it demonstrates stablecoin-first architecture
const chainsWithTempo = [...defaultChains, chains.tempoTestnet];

export const wagmiConfig = createWagmiConfig({
    appName: 'dApp Template',
    projectId,
    chains: chainsWithTempo,
    enableTestnets,
    ssr: true,
});

// Export chains for use in components
export { defaultChains, testnetChains, chains };
