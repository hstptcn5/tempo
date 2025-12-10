# Adding New Contract Checklist

## ABI Integration
- [ ] Get ABI from Etherscan or compile from source
- [ ] Create new file in `packages/abis/src/` (e.g., `myContract.ts`)
- [ ] Export ABI as `const myContractAbi = [...] as const`
- [ ] Export type: `export type MyContractAbi = typeof myContractAbi`

## Addresses
- [ ] Add addresses to `packages/abis/src/addresses.ts`
- [ ] Add for each chain: `[chainId]: { MY_CONTRACT: '0x...' }`
- [ ] Create helper function if needed

## Export
- [ ] Add exports to `packages/abis/src/index.ts`
- [ ] Run `pnpm build --filter @hst/abis`

## Usage in dApp
```tsx
import { myContractAbi } from '@hst/abis';
import { useReadContract, useWriteContract } from 'wagmi';

// Read
const { data } = useReadContract({
  address: MY_CONTRACT_ADDRESS,
  abi: myContractAbi,
  functionName: 'myFunction',
});

// Write
const { writeContract } = useWriteContract();
writeContract({
  address: MY_CONTRACT_ADDRESS,
  abi: myContractAbi,
  functionName: 'myWriteFunction',
  args: [arg1, arg2],
});
```

## Optional: Create Custom Hook
- [ ] Create hook in `packages/hooks-web3/src/`
- [ ] Handle loading, error, and success states
- [ ] Export from `packages/hooks-web3/src/index.ts`
