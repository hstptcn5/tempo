# New dApp Project Checklist

## Initial Setup
- [ ] Clone/copy `dapp-template-evm` to new app folder
- [ ] Update `package.json` with new app name
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add WalletConnect Project ID to `.env.local`
- [ ] Run `pnpm install` from monorepo root

## Chain Configuration
- [ ] Edit `src/lib/wagmi.ts` for target chains
- [ ] Update `NEXT_PUBLIC_ENABLE_TESTNETS` if needed
- [ ] Verify RPC endpoints work for your chains

## Contract Integration
- [ ] Add contract ABIs to `packages/abis/src/`
- [ ] Add contract addresses to `packages/abis/src/addresses.ts`
- [ ] Export new ABIs from `packages/abis/src/index.ts`
- [ ] Run `pnpm build --filter @hst/abis`

## UI Customization
- [ ] Update `src/app/layout.tsx` metadata (title, description)
- [ ] Customize theme colors in `tailwind.config.js`
- [ ] Update logo/branding in header
- [ ] Customize RainbowKit theme in `Web3Provider.tsx`

## Pages & Features
- [ ] Remove/modify sample pages as needed
- [ ] Create new pages for your dApp features
- [ ] Use `TokenInput`, `TxToast`, etc. from `@hst/ui-web3`
- [ ] Use hooks from `@hst/hooks-web3`

## Testing
- [ ] Connect wallet and verify chain switching
- [ ] Test read operations
- [ ] Test write operations with approval flow
- [ ] Verify transaction toasts work
- [ ] Test on mobile/responsive

## Pre-Launch
- [ ] Add favicon and social images
- [ ] Configure SEO meta tags
- [ ] Set up analytics (if any)
- [ ] Review and update README
